// ==UserScript==
// @name         Azure DevOps: follow OS dark/light theme
// @namespace    https://github.com/petero-dk/userscripts
// @version      1.0.0
// @description  Switches the Azure DevOps theme to Dark or Light to match the operating system, live, without opening the Theme panel.
// @homepageURL  https://github.com/petero-dk/userscripts/tree/main/azure-devops-darkmode
// @supportURL   https://github.com/petero-dk/userscripts/issues
// @downloadURL  https://raw.githubusercontent.com/petero-dk/userscripts/main/azure-devops-darkmode/azure-devops-os-theme.user.js
// @updateURL    https://raw.githubusercontent.com/petero-dk/userscripts/main/azure-devops-darkmode/azure-devops-os-theme.user.js
// @match        https://dev.azure.com/*
// @match        https://*.visualstudio.com/*
// @run-at       document-idle
// @license      MIT
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // Theme contribution ids as used by the Theme panel. Swap for e.g.
    // 'ms.vss-web.vsts-theme-hc-dark' if you prefer another pair.
    const LIGHT = 'ms.vss-web.vsts-theme';
    const DARK = 'ms.vss-web.vsts-theme-dark';

    const providersEl = document.getElementById('dataProviders');
    if (!providersEl) return; // not an Azure DevOps web page (e.g. sign-in redirect)
    const providers = JSON.parse(providersEl.textContent).data || {};
    const hostPath = (providers['ms.vss-web.page-data'] || {}).hostPath || '/'; // "/{org}/" or "/"
    let currentTheme = (providers['ms.vss-web.theme-data'] || {}).requestedThemeId;

    const headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-TFS-FedAuthRedirect': 'Suppress',
    };

    // Same call the Theme panel makes; persists the choice on the user profile.
    function saveTheme(themeId) {
        return fetch(hostPath + '_apis/Settings/Entries/globalme?api-version=7.1-preview.1', {
            method: 'PATCH',
            credentials: 'include',
            headers,
            body: JSON.stringify({ 'WebPlatform/Theme': themeId }),
        }).then(r => { if (!r.ok) throw new Error('Saving theme failed: HTTP ' + r.status); });
    }

    // Returns { id, extends, data: { 'palette-…': '…' } } for the user's saved theme.
    function fetchSavedTheme() {
        return fetch(hostPath + '_apis/Contribution/HierarchyQuery?api-version=5.0-preview.1', {
            method: 'POST',
            credentials: 'include',
            headers,
            body: JSON.stringify({ contributionIds: ['ms.vss-web.theme-data'], dataProviderContext: { properties: {} } }),
        })
            .then(r => { if (!r.ok) throw new Error('Loading theme failed: HTTP ' + r.status); return r.json(); })
            .then(j => {
                const themes = (j.dataProviderSharedData || {})._themes || {};
                const id = ((j.dataProviders || {})['ms.vss-web.theme-data'] || {}).requestedThemeId;
                if (!themes[id]) throw new Error('Theme data missing for ' + id);
                return themes[id];
            });
    }

    function themeClass(id) {
        return id.replace(/\./g, '-');
    }

    // The server-rendered <style> holding every theme variable on :root.
    function rootStyle() {
        return [...document.querySelectorAll('style')]
            .find(s => /^\s*:root\s*\{\s*--palette-/.test(s.textContent));
    }

    function readVars(style) {
        const vars = {};
        for (const m of style.textContent.matchAll(/--([\w-]+)\s*:\s*([^;}]+)/g)) vars[m[1]] = m[2].trim();
        return vars;
    }

    // The theme API only returns the palette (~80 variables). The ~40 component
    // variables (grid, nav, diff, search highlight, …) are only ever rendered
    // into the page, so remember the full set per theme from each page load.
    const CACHE_KEY = 'os-theme-sync:vars';

    function readCache() {
        try { return JSON.parse(localStorage.getItem(CACHE_KEY)) || {}; } catch (e) { return {}; }
    }

    function rememberVars(themeId, vars) {
        try {
            const cache = readCache();
            cache[themeId] = Object.assign(cache[themeId] || {}, vars);
            localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
        } catch (e) { /* storage blocked: we just fall back to reloading */ }
    }

    // Repaints the page the way the Theme panel does: rewrite the :root
    // variables and swap the theme classes on <body>. Returns false when we
    // have never seen this theme rendered, so the caller reloads instead.
    function applyTheme(theme) {
        const style = rootStyle();
        const cached = readCache()[theme.id];
        if (!style || !cached) return false;

        const vars = Object.assign(readVars(style), cached, theme.data);
        style.textContent = ':root { ' + Object.entries(vars).map(([k, v]) => `--${k}: ${v};`).join(' ') + ' }';

        const body = document.body.classList;
        [...body].filter(c => /^ms-vss-web-vsts-theme/.test(c)).forEach(c => body.remove(c));
        if (theme.extends) body.add(themeClass(theme.extends));
        body.add(themeClass(theme.id));
        return true;
    }

    const initialStyle = rootStyle();
    if (currentTheme && initialStyle) rememberVars(currentTheme, readVars(initialStyle));

    // Guards against a reload loop if the server keeps rendering another theme.
    const RELOAD_KEY = 'os-theme-sync:reloaded-for';
    let reloadedFor = null;
    try { reloadedFor = sessionStorage.getItem(RELOAD_KEY); sessionStorage.removeItem(RELOAD_KEY); } catch (e) { }

    let pending = Promise.resolve();

    function sync(prefersDark) {
        const wanted = prefersDark ? DARK : LIGHT;
        pending = pending.then(() => {
            if (wanted === currentTheme) return;
            return saveTheme(wanted)
                .then(fetchSavedTheme)
                .then(theme => {
                    currentTheme = theme.id;
                    if (applyTheme(theme) || reloadedFor === theme.id) return;
                    try { sessionStorage.setItem(RELOAD_KEY, theme.id); } catch (e) { }
                    location.reload();
                });
        }).catch(err => console.warn('[os-theme]', err));
    }

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    sync(media.matches);
    media.addEventListener('change', e => sync(e.matches));
})();
