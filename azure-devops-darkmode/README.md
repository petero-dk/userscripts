# Azure DevOps: Follow OS Dark/Light Theme

Keeps Azure DevOps in sync with your operating system's light or dark appearance, including changes made while the page is open.

## Install

1. Install a userscript manager such as [Tampermonkey](https://www.tampermonkey.net/) or [Violentmonkey](https://violentmonkey.github.io/).
2. [Install the script](https://raw.githubusercontent.com/petero-dk/userscripts/main/azure-devops-darkmode/azure-devops-os-theme.user.js) and confirm installation in your userscript manager.
3. Open or refresh Azure DevOps.

Runs on `https://dev.azure.com/*` and `https://*.visualstudio.com/*`.

## Behavior

- Selects Azure DevOps' built-in Light or Dark theme based on the OS preference.
- Saves that choice to your Azure DevOps user profile, replacing your manually selected theme.
- Switches themes without reloading once both themes' variables have been cached. An uncached theme may require a page reload.
- Stores theme variables in local storage and a reload guard in session storage.

## Updates

The script includes automatic update URLs pointing to this repository's `main` branch. Your userscript manager checks for updates according to its settings; new releases require a higher `@version` in the script metadata.

## Support

[Source](azure-devops-os-theme.user.js) | [Report an issue](https://github.com/petero-dk/userscripts/issues) | [All scripts](../README.md)