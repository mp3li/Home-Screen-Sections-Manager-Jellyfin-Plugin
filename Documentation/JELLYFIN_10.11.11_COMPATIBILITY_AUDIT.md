# Jellyfin 10.11.11 Compatibility Audit

## Scope and method

This initial audit covers only the plugin shell. It uses official Jellyfin
`v10.11.11` source as the version-specific authority and the same local
Jellyfin Plugin Base contract used by the two preceding plugins.

Primary official references:

- [BasePlugin<TConfiguration>](https://github.com/jellyfin/jellyfin/blob/v10.11.11/MediaBrowser.Common/Plugins/BasePluginOfT.cs)
- [Plugin web pages](https://github.com/jellyfin/jellyfin/blob/v10.11.11/MediaBrowser.Model/Plugins/PluginPageInfo.cs)

## Checked plugin contract

| Surface | Checked implementation | Result |
| --- | --- | --- |
| Runtime ABI | The project targets `net9.0` and references `Jellyfin.Controller` and `Jellyfin.Model` `10.11.11`, with runtime assets excluded. | Supported at source level; build check required. |
| Identity and configuration | `Plugin` derives from `BasePlugin<PluginConfiguration>` and declares one stable plugin ID. | Supported at source level. |
| Dashboard/sidebar page | `IHasWebPages`, embedded `configPage.html`, and `PluginPageInfo.EnableInMainMenu` provide the Dashboard entry. | Supported at source level; live visual check required. |
| Tab behavior | Tab switching is browser-local and has no server request, configuration mutation, library query, or media write. | Supported by the intentionally empty scope; live browser check required. |

## Explicitly not implemented

No Jellyfin home-screen API, user settings, metadata write, library query,
collection API, controller route, scheduled task, background worker, external
service, cache, or catalog manifest release is implemented or claimed.

Any future feature must receive its own target-version source audit and
real-server testing entry before being described as supported or complete.
