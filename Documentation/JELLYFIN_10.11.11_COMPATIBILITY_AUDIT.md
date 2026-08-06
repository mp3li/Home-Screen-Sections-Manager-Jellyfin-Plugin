# Jellyfin 10.11.11 Compatibility Audit

## Scope and method

This audit covers the dashboard configuration and custom home-row renderer.
Each Jellyfin surface was checked against the local read-only Jellyfin Plugin
Base and the local official Jellyfin Web v10.11.11 source checkout before
implementation. The served-web integration follows the same File Transformation
registration contract used by the local Home Screen Sections reference plugin.

Primary official references:

- [BasePlugin<TConfiguration>](https://github.com/jellyfin/jellyfin/blob/v10.11.11/MediaBrowser.Common/Plugins/BasePluginOfT.cs)
- [PluginPageInfo](https://github.com/jellyfin/jellyfin/blob/v10.11.11/MediaBrowser.Model/Plugins/PluginPageInfo.cs)
- [HomeSectionType](https://github.com/jellyfin/jellyfin-web/blob/v10.11.11/src/types/homeSectionType.ts)
- [Home screen settings](https://github.com/jellyfin/jellyfin-web/blob/v10.11.11/src/components/homeScreenSettings/homeScreenSettings.js)
- [User display preferences](https://github.com/jellyfin/jellyfin-web/blob/v10.11.11/src/scripts/settings/userSettings.js)
- [Branding and Custom CSS](https://github.com/jellyfin/jellyfin-web/blob/v10.11.11/src/apps/dashboard/routes/branding/index.tsx)
- [Server plugin-page loading](https://github.com/jellyfin/jellyfin-web/blob/v10.11.11/src/components/ServerContentPage.tsx)
- [Plugin-page HTML translation](https://github.com/jellyfin/jellyfin-web/blob/v10.11.11/src/lib/globalize/index.js)

## Checked plugin and dashboard contracts

| Surface | Checked implementation | Result |
| --- | --- | --- |
| Runtime ABI | Targets net9.0 and references Jellyfin.Controller and Jellyfin.Model 10.11.11, with runtime assets excluded. | Release build passes. |
| Identity and configuration | Plugin derives from BasePlugin of PluginConfiguration and declares one stable plugin ID. | Supported. |
| Dashboard/sidebar page | IHasWebPages, embedded configPage.html, and PluginPageInfo.EnableInMainMenu provide the Dashboard entry. | Supported; live render still requires server testing. |
| Plugin-page translation | Jellyfin Web passes server-provided plugin HTML through globalize.translateHtml, where literal dollar-brace tokens are translation placeholders. The embedded page contains no JavaScript template interpolation tokens. | Supported translation-safe page source. |
| Current Jellyfin sections | Reads getDisplayPreferences('usersettings', userId, 'emby') and the official homesection0 through homesection9 custom preferences. Empty values use Jellyfin's official default-section sequence. | Supported read path. |
| Native section names | Maps only the official 10.11.11 HomeSectionType values. | Supported. |
| Saved plugin drafts | Elevated plugin controller routes persist only plugin configuration: label colors, hybrid order, section type, source IDs, and manual item IDs. | Supported plugin-owned configuration. |
| Jellyfin media previews | Uses the official current-user Items query with ParentId, Recursive, StartIndex, and Limit, continuing through TotalRecordCount. | Supported read path. |
| Custom CSS | Reads `Branding/Configuration` and updates `System/Configuration/Branding` through Jellyfin Web 10.11.11 authenticated `ApiClient`. Unrelated CSS and branding fields are preserved. | Supported administrator path; live application still requires server testing. |
| Collection/tag pickers | Reuses the installed Collection Manager plugin's existing settings, art-collection, manual-item, metadata-catalog, and preview routes. | Supported by the required companion plugin; version-pair testing required. |
| Content ordering | Saves a normalized order value and applies title, premiere date, date created, rating-tag, or manual ID ordering in the browser client. | Supported plugin-owned configuration and official Items fields; live result still requires server testing. |
| Custom home rows | Serves embedded authenticated client settings and embedded browser assets from plugin controller routes. | Supported plugin-controller pattern; live Jellyfin Web behavior still requires server testing. |
| Web integration | Resolves File Transformation's published `IWebFileTransformationWriteService` during registration and installs a direct `TransformFile` callback for `index.html`; the callback injects links to plugin-owned embedded assets without changing files on disk. | Matches File Transformation 2.5.11.0's public write-service contract while avoiding its late callback-service lookup; File Transformation is a runtime dependency. |

## Explicit current boundary

This release renders plugin-owned custom rows in Jellyfin Web and interleaves
them with Jellyfin's native rows. It does not write to or replace Jellyfin Web
files, and it does not replace Jellyfin's ten native home-section preferences.
The browser assets are added at response time by File Transformation.

No media metadata, collection membership, NFO file, media file, or library
configuration is changed by the section-design interface.

## Remaining runtime evidence

Source review, JavaScript parsing, Release compilation, catalog checksum
validation, an expandable-stream transformation-callback smoke test, and archive inspection are
separate from installed behavior. The real Jellyfin 10.11.11 checks remain in
[goal-testing.txt](goal-testing.txt) and must be recorded before any dashboard
behavior is described as runtime-verified.
