# Jellyfin 10.11.11 Compatibility Audit

## Scope and method

This audit covers the dashboard configuration and custom home-row renderer.
Each Jellyfin surface was checked against the local read-only Jellyfin Plugin
Base and the local official Jellyfin Web v10.11.11 source checkout before
implementation. The served-web integration follows the same named JavaScript Injector
configuration path used by the local KefinTweaks reference.

## What "supported" means in this audit

- **Official Jellyfin contract** means a target-version server/plugin API or
  authenticated REST route exposed by Jellyfin 10.11.11.
- **Version-pinned Jellyfin Web contract** means DOM, custom elements, routing,
  or browser-client behavior present in Jellyfin Web 10.11.11. It can be tested
  and deliberately supported by this project, but it is not a public Jellyfin
  plugin extension point.
- **Companion-plugin contract** means a route or configuration shape owned by
  JavaScript Injector, File Transformation, Custom Tabs, Collection Manager, or
  Abyss. Compatibility requires the named plugin/version combination.
- **KefinTweaks reference** means a useful community implementation pattern. It
  is not official Jellyfin support, and KefinTweaks currently labels Jellyfin
  10.11.x untested and unsupported.

Accordingly, not every browser integration below is "officially supported by
Jellyfin." The server APIs are supported for the pinned target; injected custom
rows are a tested, version-specific enhancement built on Jellyfin Web behavior.

Primary official references:

- [BasePlugin<TConfiguration>](https://github.com/jellyfin/jellyfin/blob/v10.11.11/MediaBrowser.Common/Plugins/BasePluginOfT.cs)
- [PluginPageInfo](https://github.com/jellyfin/jellyfin/blob/v10.11.11/MediaBrowser.Model/Plugins/PluginPageInfo.cs)
- [HomeSectionType](https://github.com/jellyfin/jellyfin-web/blob/v10.11.11/src/types/homeSectionType.ts)
- [Home screen settings](https://github.com/jellyfin/jellyfin-web/blob/v10.11.11/src/components/homeScreenSettings/homeScreenSettings.js)
- [Recently Added home rows](https://github.com/jellyfin/jellyfin-web/blob/v10.11.11/src/components/homesections/sections/recentlyAdded.ts)
- [User display preferences](https://github.com/jellyfin/jellyfin-web/blob/v10.11.11/src/scripts/settings/userSettings.js)
- [Branding and Custom CSS](https://github.com/jellyfin/jellyfin-web/blob/v10.11.11/src/apps/dashboard/routes/branding/index.tsx)
- [Server plugin-page loading](https://github.com/jellyfin/jellyfin-web/blob/v10.11.11/src/components/ServerContentPage.tsx)
- [Plugin-page HTML translation](https://github.com/jellyfin/jellyfin-web/blob/v10.11.11/src/lib/globalize/index.js)
- [ApiClient plugin configuration methods](https://github.com/jellyfin/jellyfin-web/blob/v10.11.11/src/apiclient.d.ts)
- [Official item and Resume endpoints](https://github.com/jellyfin/jellyfin/blob/v10.11.11/Jellyfin.Api/Controllers/ItemsController.cs)
- [Official item-image endpoint](https://github.com/jellyfin/jellyfin/blob/v10.11.11/Jellyfin.Api/Controllers/ImageController.cs)
- [Official Next Up endpoint](https://github.com/jellyfin/jellyfin/blob/v10.11.11/Jellyfin.Api/Controllers/TvShowsController.cs)
- [Official session manager contract](https://github.com/jellyfin/jellyfin/blob/v10.11.11/MediaBrowser.Controller/Session/ISessionManager.cs)
- [Official session information](https://github.com/jellyfin/jellyfin/blob/v10.11.11/MediaBrowser.Controller/Session/SessionInfo.cs)

## Checked plugin and dashboard contracts

| Surface | Checked implementation | Result |
| --- | --- | --- |
| Runtime ABI | Targets net9.0 and references Jellyfin.Controller and Jellyfin.Model 10.11.11, with runtime assets excluded. | Release build passes. |
| Identity and configuration | Plugin derives from BasePlugin of PluginConfiguration and declares one stable plugin ID. | Supported. |
| Dashboard/sidebar page | IHasWebPages, embedded configPage.html, and PluginPageInfo.EnableInMainMenu provide the Dashboard entry. | Supported; live render still requires server testing. |
| Plugin-page translation | Jellyfin Web passes server-provided plugin HTML through globalize.translateHtml, where literal dollar-brace tokens are translation placeholders. The embedded page contains no JavaScript template interpolation tokens. | Supported translation-safe page source. |
| Current Jellyfin sections | Reads getDisplayPreferences('usersettings', userId, 'emby') and the official homesection0 through homesection9 custom preferences. Empty values use Jellyfin's official default-section sequence. | Supported read path. |
| Native section names | Maps only the official 10.11.11 HomeSectionType values. | Supported. |
| Saved plugin drafts | Elevated plugin controller routes persist only plugin configuration: Jellyfin, plugin, and Media Bar label colors; hybrid order; section type; source IDs; manual item IDs; ordered rotating/seasonal source drafts; recurring date windows; rotation interval; content order; and art appearance. | Supported plugin-owned configuration. |
| Jellyfin media previews | Uses the official current-user Items query with ParentId, Recursive, StartIndex, and Limit, continuing through TotalRecordCount. | Supported read path. |
| Custom CSS | Reads `Branding/Configuration` and updates `System/Configuration/Branding` through Jellyfin Web 10.11.11 authenticated `ApiClient`. Unrelated CSS and branding fields are preserved. | Supported administrator path; live application still requires server testing. |
| Collection/tag pickers | Reuses the installed Collection Manager plugin's existing settings, art-collection, manual-item, metadata-catalog, and preview routes. | Supported by the required companion plugin; version-pair testing required. |
| Content ordering | Saves a normalized order value and applies title, premiere date, date created, rating, per-load random, or manual ID ordering in the browser client. | Supported plugin-owned configuration and official Items fields; live result still requires server testing. |
| Art appearance | Saves normalized size, official Jellyfin image type, a separate Poster choice mapped to Jellyfin Primary, Jellyfin card shape, and text visibility values; the browser client maps them to official card classes and item image routes. | Supported image/card contracts; live result still requires server testing. |
| Custom home rows | Serves embedded authenticated client settings and versioned browser assets from plugin controller routes, waits for Jellyfin Web 10.11.11’s active `#homeTab` and native `.homeSectionsContainer`, then appends plugin rows to that container. One container-scoped direct-child observer handles only Jellyfin rebuilding that container; no document-wide observer, attribute observer, visibility override, or native panel-state mutation is used. Home reads remain limited to two concurrent requests, rows and artwork begin only near the viewport, and saved or dynamic content is paged 16 items at a time through registered `emby-scroller` and `emby-itemscontainer` elements. The paging listener opts into Jellyfin's transform-aware scroll event and reads position/size through the 10.11.11 `emby-scroller` methods, with native scrolling retained for plugin-owned custom-page rows. Large saved ID lists are delivered through the plugin's authenticated paging route instead of the startup settings response. | Official item/controller APIs plus a version-pinned Jellyfin Web integration; live Jellyfin Web behavior still requires server testing. |
| Section-header artwork | Gives each visible plugin section header a photographic background derived from the first resolved item. It reuses the same authenticated image URL and viewport observer as the row cards, so the header adds no metadata query and does not eagerly load offscreen artwork. | Plugin-owned presentation using official image routes and browser-standard lazy observation; installed theme/contrast testing required. |
| Web integration | Uses Jellyfin Web 10.11.11’s `getPluginConfiguration` and `updatePluginConfiguration` methods to create or update only `Home-Screen-Manager-Loader` in JavaScript Injector. The bootstrap remains uncached; version-keyed client JS/CSS are immutable-cacheable and the media-bar document carries an explicit plugin version. The dashboard synchronizes a stale loader without altering other Injector scripts. | Companion-plugin contract: JavaScript Injector is required and File Transformation is recommended for its non-destructive injection mode; installed update testing remains required. |
| Rotating and seasonal rows | Selects one saved collection, library, or metadata-tag source draft in the browser, reuses official Jellyfin item reads for collection/library children, and reuses Collection Manager's existing metadata preview route for tag matches. Rotation is interval-based; seasonal windows recur annually and may cross year-end. | Supported plugin-owned configuration plus existing read paths; installed-server timing and date-window testing required. |
| Top 10-50 | Reuses the same collection, library, and metadata-tag source picker, combines sources into one saved draft, reads official Jellyfin Tags and CommunityRating fields, accepts common explicit IMDb rating-tag formats with CommunityRating fallback, and saves the chosen count and original rank-art controls. | Supported read-only item and plugin-owned configuration path; installed art-layout testing required. |
| Cross-user activity | Reads authenticated session NowPlayingItem values and per-user DatePlayed-descending item results through Jellyfin 10.11.11's ISessionManager, IUserManager, and ILibraryManager contracts, maps episode activity to its parent series in Series mode, caches the item-only result for 60 seconds, returns only randomized media IDs, and lets the requesting user resolve only accessible items. | Supported server contracts; result mix and permission visibility require multi-user server testing. |
| Dashboard editor loading and content preview paging | Renders the content editor before its independent Jellyfin library/collection catalogs finish. Existing saved content and manual library browsing use official current-user Items queries in 16-item pages; saved ID hydration is also capped at 16 IDs per URL. Preview state is separate from the complete saved ID order, so an unchanged save retains unopened pages. Full manual-order labels load only after an explicit administrator action. | Official 10.11.11 Items query parameters plus plugin-owned dashboard behavior; installed remote/proxy timing still requires server testing. |
| Media bar | Serves a plugin-owned, credited adaptation of Abyss Spotlight 1.2.2, retains its MIT notice, uses the installed Abyss stylesheet, receives the first eligible hybrid row's official Jellyfin item results, excludes My Media and Recently Added rows as sources, requests up to 30 Continue Watching results, and uses authenticated Jellyfin image URLs for Backdrop, Primary, Banner, or Thumb with immediate `img.onerror` fallbacks. New requests resolve independently and a generation guard rejects obsolete results. Playback uses Jellyfin Web's item-based playback manager contract or its `ApiClient.play({ ids })` fallback and never clicks page controls or sends session commands. | Supported read-only API, plugin-controller, image, and Jellyfin Web playback patterns; exact installed theme behavior still requires server testing. |
| Logo | Inserts one fitted, Home-linked logo beside Jellyfin Web's official `.mainDrawerButton` on every non-playback page, hides the redundant native Home icon, and keeps breadcrumbs as a separate flex item. | Grounded in Jellyfin Web 10.11.11 header structure; installed-client testing required. |
| Accent and split colors | Exposes Abyss's documented shared accent variable for hover states and generates narrowly scoped Custom CSS for active header-tab backgrounds, selected active-tab text, play/resume buttons, progress bars, sidebar icons, and My List hearts. | Supported administrator Custom CSS path; client/theme testing required. |
| My List | Creates or updates only its own `{ Title, ContentHtml }` entry in the installed Custom Tabs plugin configuration, lets Custom Tabs and Jellyfin own the actual tab/panel lifecycle, and uses official per-user Likes/UserData plus the boolean `updateUserItemRating` contract. One authenticated plugin endpoint performs the user-scoped `IsLiked` server query and returns bounded ID pages; visible hearts use bounded hydration. Episode entries retain episode Likes while displaying series identity. | Official per-user Jellyfin data plus a plugin-owned paging endpoint; no separate media database. Custom Tabs is required only for this feature, and installed 10.11.11 behavior remains to be tested. |
| Series information | Reads official item counts and runtime ticks; season totals use the returned episode runtimes. | Supported item fields; displayed end time is calculated in the browser. |
| Infinite scroll | Activates only for saved library IDs and advances Jellyfin's own `.btnNextPage`, preserving the native query, sort, filter, and card rendering. | Grounded in Jellyfin Web paging controls; installed-library testing required. |
| Detail collections | Queries BoxSet items and their current children, then renders matching collections before Jellyfin's Similar section. | Read-only official Items queries; installed-library testing required. |
| Enhanced search | Uses Jellyfin Items `SearchTerm` queries with All, Movies and TV, Music, and Books modes; no Jellyseerr calls are present. | Supported read-only search path; installed-client testing required. |
| Breadcrumbs | Uses official item, ancestor, and current-user Items queries to build media-aware Movies, Shows, seasons, episodes, artists, albums, and songs navigation with sibling selectors inside Jellyfin Web's `.headerLeft`. | Grounded in Jellyfin Web 10.11.11 header and item-query contracts; installed-client testing required. |
| Manual refresh | The Dashboard refreshes applied static collection, library, tag, and Top rules sequentially, preserves manual order for surviving items, and performs one final plugin-settings write. Rotating, seasonal, and cross-user activity sections remain dynamic. The browser client performs no periodic all-rule polling. | Supported explicit administrator action with bounded reads; installed large-library timing requires testing. |
| Library identity and native Latest Media | Uses current user views and stable Jellyfin IDs first, stores server/user-scoped ID/name/type snapshots, migrates only unambiguous replacement IDs, repairs stale `topParentId` routes, and exposes Jellyfin Web 10.11.11’s existing per-library Recently Added child elements as independent ordered/hidden rows. The plugin moves the live elements; it does not query, cache, or rebuild their native content. | Conservative client-side identity reconciliation. Ambiguous delete/re-add replacements require administrator selection rather than a guessed mapping. |

## Recovery release boundary

Version 0.1.0.18 remains the emergency recovery package that disables the browser runtime. Version 0.1.0.25 removes the later competing Home/media-bar lifecycle and manual My List tab implementation while retaining the 0.1.0.19 route isolation and playback restrictions.

## Explicit current boundary

This release renders plugin-owned custom rows in Jellyfin Web, interleaves
them with Jellyfin's native rows, and uses a credited plugin adaptation of the
Abyss spotlight that retains Abyss's installed stylesheet and visual contract.
It does not write to or
replace Jellyfin Web files, and it does not replace Jellyfin's ten native
home-section preferences. The browser assets are loaded by the named JavaScript
Injector entry after the administrator clicks **Add Section to Home Screen**.

No media metadata, collection membership, NFO file, media file, or library
configuration is changed by the section-design interface.

## Remaining runtime evidence

Source review, JavaScript parsing, Release compilation, catalog checksum
validation, named-loader preservation, manual-order, art-renderer, rotation, and
seasonal-window smoke tests, and archive inspection are
separate from installed behavior. The real Jellyfin 10.11.11 checks remain in
[goal-testing.txt](goal-testing.txt) and must be recorded before any dashboard
behavior is described as runtime-verified.
