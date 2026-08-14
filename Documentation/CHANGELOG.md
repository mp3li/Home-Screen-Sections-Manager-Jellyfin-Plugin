# Changelog

## [0.1.0.43-test] - 2026-08-14

- Adds the default-disabled **Top Row Settings** tab with per-page visibility, Collections in a Row or Libraries in a Row content, drag ordering, constrained Extra Small non-poster art, and Add/Refresh behavior.
- Renders Top Row above Jellyfin's header controls with a glassy media-bar-compatible fade, mouse/trackpad horizontal scrolling, direct navigation, hover darkness, and no arrows, hearts, or Play button.
- Synchronizes section-title edits between the draggable row and deep editor, preserves custom Top 10-50 wording, and places the inline-edit caret at the end.
- Makes the former Fast marquee rate the new Normal Speed, adds spacing when section names are hidden, prevents small-art hover controls from growing, and slightly widens Extra Small wide art without changing gaps.
- Renames the visible **Multiple Collections in a Row** label to **Collections in a Row** while preserving existing saved section compatibility.

## [0.1.0.41-test] - 2026-08-13

- Replaces custom-page row movement with a transform-driven horizontal track so right/left arrows, mouse-wheel scrolling, and mouse dragging work even when Jellyfin refuses native `scrollLeft`; limits that track sizing to custom pages so **Added to My List** remains left-aligned.
- Adds a direct completed-Series query and watched-episode Series-ID recovery to per-user **Watch Again**, while retaining completed Movies and most/least recently completed ordering.
- Aligns the bottom of each Top 10-50 number with the bottom of its artwork, layers the art in front of the number, restores solid and gradient number colors, tightens the shadow offset, and adds a saved **Shadow Color** picker.
- Stops Display Top changes from rewriting custom section names and synchronizes the section title with its saved Top draft so Refresh Section retains administrator-entered wording.
- Makes marquee titles snap back immediately when hover ends.
- Adds default-on **Media Bar Slow Zoom Settings** immediately below Media Bar Image Type Settings, with On and Off choices that control every Media Bar background.

## [0.1.0.40-test] - 2026-08-13

- Adds **Marquee Effect on Titles Settings** at the end of Main Settings, with mutually exclusive on/off controls and the hover-to-scroll title effect enabled by default.
- Applies marquee movement only to media titles that actually overflow their card, and removes it immediately when the administrator turns the setting off.
- Makes custom-page arrows, mouse-wheel scrolling, and mouse dragging use a plugin-owned measured track with a fallback for Jellyfin clients that refuse native horizontal scroll movement.
- Derives completed Watch Again Series from every regular aired episode in the signed-in user's watch history, ignoring Specials and future episodes while retaining completion-date ordering with Movies.
- Forces Top 10-50 ordering back to highest rating, preserves administrator-entered section titles during Refresh Section, saves numbering choices directly, and uses compatible explicit number sizing so enabled ranks remain visible.
- Retains the confirmed native circle geometry and hover clipping plus custom-card hover darkness and functional Play buttons.

## [0.1.0.39-test] - 2026-08-13

- Replaces custom-page rows' hidden-tab-dependent Jellyfin scrollers with plugin-owned horizontal scrolling that supports working arrow buttons, mouse-wheel scrolling, mouse dragging, touch panning, and infinite-page loading.
- Derives completed Series per signed-in user from Series user data and the user's played Episodes, then combines them with completed Movies for Watch Again completion-date ordering.
- Prevents appearance-only Refresh Section actions from erasing saved Top 10-50 item IDs when a content preview is temporarily empty, and reconstructs an already-emptied Top section from its saved sources.
- Corrects native Jellyfin square and circle geometry by replacing the original portrait bottom padding instead of stacking a second aspect-ratio padding value.
- Clips native hover darkness to circular art and adds Jellyfin-style hover darkness plus a functional centered Play button to plugin-created cards.
- Retains the confirmed sidebar glyph colors, Media Bar Series Logo resolution, My List behavior, and direct logo-to-Home navigation unchanged.

## [0.1.0.38-test] - 2026-08-13

- Paints the configured solid color or gradient on sidebar icon circles while using the shared Accent Color for the smaller glyphs inside them.
- Tries the actual Series Logo endpoint when episode metadata omits its Logo tag, while retaining transparent-logo validation and the clean text fallback.
- Adds **Most Recently Completed** and **Least Recently Completed** ordering exclusively to per-user Watch Again sections.
- Adds a guarded fallback for Jellyfin scroller-arrow clicks that do not move plugin sections on custom pages.
- Shows Top 10-50 ranking numbers reliably, reserves number spacing only while numbering is enabled, and aligns non-circular title/year text while keeping circular text centered.
- Preserves administrator-entered Top 10-50 section titles when the displayed Top count changes.
- Allows native Jellyfin sections to be edited through Section Art Appearance Settings only, applying size, image type, shape, and title-text visibility without duplicating the native section.
- Retains the working My List and direct custom-logo-to-Home behavior.

## [0.1.0.37-test] - 2026-08-13

- Requests Jellyfin's original Logo image without resize or quality conversion, preserving transparency that could otherwise be flattened into an opaque miniature backdrop.
- Resolves missing episode and season logos from their Series item when Jellyfin does not include parent-logo metadata on the Media Bar item itself.
- Retains the opaque-artwork safety check, so a genuinely rectangular backdrop stored in the Logo slot still falls back to the clean text title.
- Leaves the working My List Media Bar and matching per-user row lifecycle unchanged.
- Adds a **Watch Again** section type that dynamically shows both completed movies and completed series from each signed-in user’s own Jellyfin watch history, with no manual content selection.
- Makes the custom header logo directly activate the Home screen’s Home page even when My List and plugin-created pages share the same Home route.
- Extends browser coverage for unscaled original Logo URLs, explicit Series-logo fallback, per-user Watch Again rows and Media Bars, and direct logo-to-Home activation.

## [0.1.0.36-test] - 2026-08-13

- Keeps every explicitly configured Media Bar paired immediately above its regular section row, including **Added to My List**, so Section Art Appearance Settings continue to control the matching row beneath the bar.
- Rehydrates Media Bar items with current Jellyfin artwork metadata instead of relying on older cached records, restoring Logo artwork on My List and plugin-created custom-page Media Bars.
- Refreshes a Media Bar when artwork metadata changes even when its item IDs stay the same.
- Rejects opaque Logo images that contain a miniature backdrop or other rectangular artwork and uses the clean text title instead; transparent Jellyfin Logo artwork remains unchanged.
- Keeps the My List Media Bar and its per-user matching row mounted together while items load and rotate.
- Extends browser coverage for paired-row order, per-user My List content, persistence through rotation, custom-page Logo loading, and backdrop-like Logo rejection.

## [0.1.0.35-test] - 2026-08-13

- Keeps an edited section's saved ID, content, placement, and applied state when continuing through Section Type Settings, so converting **Added to My List** into a Media Bar refreshes the existing section instead of resetting it as a new draft.
- Labels the final action **Refresh Section** during editing and reports refresh-specific progress without creating a duplicate section.
- Restricts the Media Bar logo slot to Jellyfin's actual Logo endpoint; items without a real Logo keep the text title and never substitute backdrop, primary, thumb, or banner artwork in that slot.
- Adds safe top spacing to plugin-created pages so their first section or Media Bar clears Jellyfin's top navigation controls.
- Extends dashboard and browser contracts for edit-in-place Media Bar refresh, duplicate prevention, strict Logo URLs, and custom-page top spacing.

## [0.1.0.34-test] - 2026-08-13

- Adds **My List Content Section**, which skips content selection and loads each signed-in user’s own Jellyfin Likes at display time without saving one user’s items into shared plugin settings.
- Adds **Added to My List** as the default first managed section on the My List page. It can be reordered, shown or hidden, edited, and converted into a Media Bar while retaining per-user content.
- Keeps circular-art heart buttons fully visible above the circle instead of clipping them at the artwork boundary.
- Prevents invalid or stale custom-page section assignments from falling back onto Home, and prevents creating a section while an older page-switch request is still repopulating the editor.
- Extends browser and dashboard contracts for the My List media bar, editable default row, circular-heart stacking, zero saved My List item IDs, and strict custom-page isolation.

## [0.1.0.33-test] - 2026-08-13

- Restores saved Top 10 and other plugin sections on Home and removes the custom-page render-generation race that could leave rows stuck on Loading section content.
- Resets stale custom-page selections to Home on a fresh site load or browser refresh and removes the extra page-name heading from plugin-created pages.
- Adds Copy + Paste Section, aligned Show controls, immediate Media Bar label updates, page-aware Add Section button text, and removes the gray Home drag marker.
- Keeps the mandatory first Home Media Bar while making Media Bar Yes/No authoritative on every other page. Art Appearance settings continue to control the matching row below each Media Bar.
- Deletes a plugin page together with only its own sections; Undo Delete Page restores the page, its layout, and its sections. The renamed refresh action preserves and refreshes every remaining page layout.

## [0.1.0.32-test] - 2026-08-13

- Adds global top-navigation page creation, editing, visibility, ordering, and per-page section layouts.
- Adds Hide Favorites, Show controls for all sections, page-aware section moving, and multiple explicitly selected media bars per page.
- Prevents duplicate My List tabs and adds a top gradient to media bars placed below the first page section.

## [0.1.0.31-test] - 2026-08-12

### Reworked

- Replaces the shared Abyss iframe boundary with a Home Screen Manager-owned Abyss-derived media bar. The plugin frame has a separate identity and lifecycle, while retaining Abyss 1.2.2's responsive measurements, installed spotlight stylesheet, visual structure, blending, animation, controls, and MIT attribution.
- Replaces the Custom Tabs dependency for **My List** with a plugin-owned Home tab and content panel. Existing legacy Home Screen Manager Custom Tabs markup is removed without changing any unrelated custom tab.
- Uses a stable no-cache JavaScript Injector bootstrap endpoint so later catalog versions load the browser client embedded in the installed DLL instead of retaining an older hard-coded loader version.

### Fixed

- Applies the saved media-bar image type and timing to the plugin-owned document without Abyss's loader replacing the frame source or pause/resume state.
- Keeps the original Abyss spotlight paused and hidden while Home Screen Manager is enabled, including when Abyss creates its frame after the plugin client starts.
- Loads **Added to My List** from Jellyfin's per-user Likes data using current live library IDs, so library renames or delete/recreate operations cannot leave a stale saved parent ID in My List.
- Removes the repository and Patreon promotional sentence from the README.

### Safety and validation

- Retains Abyss revision `0dc066d604bdbf7977c014f275ae6f2967ec4fe2`, its original copyright notice, full MIT license, and upstream link.
- An integrated headless-browser contract passes for an Abyss-loader race, simultaneous media bar and native Home rows, Primary image requests, one-second automatic slide timing, Home/My List/Home navigation, a populated **Added to My List** row, and live library-scoped Likes reads.
- Release build succeeds against Jellyfin 10.11.11 with zero warnings and zero errors.

## [0.1.0.30-test] - 2026-08-12

### Fixed

- Makes the authenticated client-settings message the media bar's single runtime authority for the saved image type and timing. Embedded HTML and URL values remain startup fallbacks and no Custom CSS copy can override the live saved values.
- Confirms the applied media-bar image type and interval back to the parent client after rendering; browser validation verifies that Primary requests Jellyfin's Primary endpoint first and a one-second interval advances after one second.
- Loads each user's Jellyfin Likes with the official Jellyfin Web 10.11.11 `ApiClient.getItems(userId, options)` signature and one recursive `Filters: Likes` request, without depending on mutable library parent IDs.
- Renders My List as one section named **Added to My List**, including a visible empty state under that heading when the user has not added anything.
- Gives custom-section titles and production years the same measured left edge for every non-circular art shape while retaining centered circular text.

### Safety and validation

- Retains the adapted Abyss 1.2.2 source revision, copyright notice, full MIT license, upstream link, visual structure, blending, controls, and responsive stylesheet.
- Browser contracts pass for actual media-bar image selection and timing, populated My List rendering, the exact section heading, the Jellyfin Likes query, and title/year alignment.

## [0.1.0.29-test] - 2026-08-12

### Changed

- Adds **Abyss Original** to reproduce Abyss's real hybrid image behavior: episodes try their own Primary image and then the series Backdrop, while other media tries its own Backdrop.
- Renames **Backdrop (Default)** to **Backdrop**. This explicit mode requests Jellyfin Backdrop artwork first and uses another available type only when that request cannot be loaded.
- Publishes the saved media-bar image choice and timing as plugin-owned Custom CSS properties, using the same applied configuration path as the working Abyss color controls while retaining server and message fallbacks.

### Fixed

- Requests the selected Jellyfin image endpoint directly instead of rejecting it solely because an optional image tag was absent from a section payload.
- Keeps automatic media-bar timing active when reduced-motion is enabled while continuing to suppress the decorative zoom animation.
- Aligns custom-section year text with the title for non-circular cards and keeps both lines centered for circular cards.

## [0.1.0.28-test] - 2026-08-12

### Fixed

- Makes the server's currently saved media-bar timing and image type authoritative inside the no-cache media-bar document itself, so stale parent-client settings cannot override either preference.
- Adds explicit no-store headers and a request nonce to the browser-client settings response.
- Loads **My List** from the same user library-root discovery and per-parent Likes queries used by KefinTweaks, while retaining this plugin's music and book support and allowing one inaccessible library to be skipped without blanking the entire page.
- Normalizes library names from both Jellyfin 10.11.11 `topParentId` and generic `parentId` routes into the same smaller centered position below top navigation.
- Centers every text row beneath circular art, including the production year.

### Safety and validation

- Does not alter the working Home composition, row order, section lifecycle, heart buttons, My List tab ownership, arrows, or Abyss presentation.
- Verified against Jellyfin Web 10.11.11's `ApiClient` contract and library router, the local plugin base, KefinTweaks' library-scoped Likes implementation, Custom Tabs, and the adapted Abyss media document.

## [0.1.0.27-test] - 2026-08-12

### Fixed

- Applies the live saved media-bar image type and timing after cached settings are reconciled, without remounting Home rows or changing the now-stable native/plugin section composition.
- Loads **My List** through the actual Custom Tabs active panel and Jellyfin 10.11.11 `ApiClient.getItems` calls scoped to each library parent, following the bounded working pattern used by KefinTweaks instead of one global Likes query.
- Recreates the plugin-owned My List content container if Custom Tabs supplies the page marker without it, displays an explicit loading, empty, or error state, and permits a failed render to retry when the tab is reopened.
- Reduces the library/page context-title size while keeping its established placement below the top navigation.

### Safety and validation

- Leaves the v0.1.0.26 Home lifecycle, native row ownership, hybrid ordering, scroller controls, media-bar source selection, and Abyss presentation unchanged.
- Verified the query and tab boundaries against Jellyfin Web 10.11.11, the local plugin base, Custom Tabs revision `0809e54e86864fab9b15a075eb5e58987df3b00d`, and KefinTweaks' per-library Likes-query implementation.

## [0.1.0.26-test] - 2026-08-12

### Reworked

- Replaces the previous competing Home repair loop with the proven KefinTweaks lifecycle pattern: wait for Jellyfin Web's visible Home container, mount plugin rows once for that view, and use Jellyfin's view-show callback after preserving its original handler.
- Keeps every Jellyfin-owned Home node in its original DOM position. Hybrid ordering now uses a flex-column container and CSS `order`; the native Recently Added wrapper uses `display: contents` so its individual library rows can be ordered without being detached.
- Binds Home/Favorites/My List changes to Jellyfin's actual `emby-tabs` control rather than relying on a non-bubbling document event.

### Fixed

- Stops the media bar from replacing or hiding all rows below it and stops plugin remounts from racing Jellyfin's asynchronous native section loading.
- Restores native and plugin row arrows, mouse dragging, mouse-wheel scrolling, touch scrolling, and keyboard navigation by preserving Jellyfin's required scroll-button/scroller sibling relationship and using Jellyfin's registered scroller markup for plugin rows.
- Removes all document-level library-link rewriting and current-route repair. The plugin no longer changes Jellyfin's native Movies, Shows, Music, Books, Home, or sidebar destinations.
- Keeps My List and page titles stable across real tab/view changes without removing and recreating them during duplicate lifecycle notifications.
- Carries the chosen media-bar image type and timing in the iframe URL as well as the configuration payload, and requests Banner and Logo metadata for Continue Watching items.

### Safety and validation

- Verified against fresh KefinTweaks source revision `290b36f7bfb7587aa12667895ce6395f41d02c73`, Custom Tabs revision `0809e54e86864fab9b15a075eb5e58987df3b00d`, Abyss's spotlight loader, and Jellyfin Web 10.11.11's HomeTab, home-sections, scroller, and scroll-button source.
- Uses no document-wide Home observer, no periodic browser polling, no native Home-row reparenting, no native tab-state mutation, and no Jellyfin library-link interception.

## [0.1.0.25-test] - 2026-08-12

### Reworked

- Removes Home Screen Manager’s competing Home-tab and Abyss-iframe lifecycle controls. Jellyfin Web 10.11.11 remains the sole owner of native Home/Favorites panel activation, and Abyss remains the sole owner of spotlight visibility and pause/resume behavior.
- Mounts plugin-created rows only after Jellyfin’s active `#homeTab` has built its native `.homeSectionsContainer`, then watches only direct child replacement on that one active container. The plugin never hides, replaces, or takes ownership of the native Home container.
- Makes **My List** a real Custom Tabs page, following the same working integration boundary used by KefinTweaks. Home Screen Manager updates only its own `My List` entry and no longer manufactures a tab or rewrites native `is-active`, selected, hidden, or display states.

### Fixed

- Prevents the Abyss media bar from taking over the page after native Home briefly appears; native and plugin rows remain separate siblings below the spotlight.
- Stops repeated route or settings reconciliation from reconfiguring the same media-bar payload and resetting the active dot. The selected image type is requested first and switches immediately; the image element falls back only when that request fails.
- Prevents repeated My List rendering during unrelated Home DOM changes, removes the stale selected border caused by hand-managed tab classes, restores the My List page title, and slightly reduces page-title size below top navigation.
- Invalidates saved section-content caches when **Refresh Home Screen Sections** completes, so rating-ordered sections re-read and reorder from the ratings already present in Jellyfin tags or `CommunityRating`. No external ratings API is called.

### Safety and validation

- Follows Jellyfin Web 10.11.11’s `HomeTab`/`homeSections` ownership, Abyss’s installed spotlight lifecycle, KefinTweaks’ per-container append pattern, and Custom Tabs’ documented `Tabs` configuration shape.
- Uses no document-wide observer, attribute observer, periodic rule polling, forced iframe visibility, or native tab-state mutation. Installed Jellyfin Web behavior still requires this test round.

## [0.1.0.24-test] - 2026-08-12

### Reworked

- Replaces the coupled Home-entry repair with an event-driven integrity observer modeled on Jellyfin Web 10.11.11’s cached Home lifecycle, Abyss’s own spotlight lifecycle, and KefinTweaks’ per-container section initialization pattern.
- Checks the configured Abyss media bar and plugin-created rows independently whenever Jellyfin creates, replaces, shows, or returns to the cached Home DOM. Missing rows do not wait for media-bar data, and a missing or paused media bar does not remove rows.
- Versions the injected client, stylesheet, and media-bar document; serves them with no-store headers; and synchronizes the JavaScript Injector loader from the plugin dashboard. An installed update can no longer silently continue running an older browser client from a prior release.

### Fixed

- Restores the chosen native Home or Favorites panel when leaving My List instead of clearing the active state from every native Home panel.
- Keeps the configured Abyss frame visible and resumed on Home rather than hiding it during route cleanup.
- Places My List and library/page titles in the content area below the existing header tabs using the previously added normalized title layout, now delivered through the versioned client and stylesheet.
- Uses the exact source descriptions **Selecting a collection includes all current media items in that collection.** and **Selecting a library includes all current media items in that library.** with no rotating or seasonal qualifier.

### Safety and validation

- Uses no periodic browser polling. Recovery is triggered only by Jellyfin route/view events and relevant cached-Home DOM mutations; media reads remain bounded and paged.
- Preserves Jellyfin’s native Home sections and Abyss’s iframe, styling, timing, image selection, and MIT attribution. Browser scripts, the generated Injector loader, and manifest parse successfully; the Release build succeeds against Jellyfin 10.11.11 with zero warnings.

## [0.1.0.23-test] - 2026-08-11

### Fixed

- Makes Home re-entry wait for Jellyfin Web 10.11.11’s cached `#indexPage` and active `#homeTab` instead of rendering into a still-visible Dashboard or inactive Home tab.
- Recovers plugin rows and the Abyss media bar independently when Jellyfin rebuilds the cached Home DOM. Existing configured media-bar content is preserved across ordinary navigation and the active Abyss frame is explicitly resumed.
- Keeps stale section requests from repainting removed or replaced rows.
- Moves My List and other active page titles below the existing header tabs so they no longer overlap the uploaded logo or Home/Favorites/My List and library-navigation tabs.
- Restores readable Create and Manage rows for long Recently Added names and adds a persistence-safe **Undo Delete Section** action.
- States that selected collection and library sources include all current media, and pages rotating, seasonal, and user-activity rows in bounded 40-item reads instead of stopping at the first page.

### Safety and validation

- Uses Jellyfin Web 10.11.11’s official cached Home page, active tab, `viewshow`, item-query, and registered scroller contracts and the plugin base’s bounded-retry and paged-read guidance. It adds no periodic browser polling and does not rebuild native Recently Added content.
- Dashboard and client scripts parse successfully, and the Release build succeeds against Jellyfin 10.11.11. Installed-server behavior remains part of this test round.

## [0.1.0.22-test] - 2026-08-11

### Fixed

- Restores the left and right arrow buttons on native Jellyfin rows, plugin-created home sections, My List, and plugin-created detail rows.
- Removes the plugin capture-phase click interceptor that stopped Jellyfin 10.11.11 from receiving arrow clicks and attempted to move a non-native scroller through raw `scrollLeft`.
- Keeps mouse-wheel, mouse-drag, touch, focus, and keyboard behavior unchanged.

### Safety and validation

- Leaves arrow movement, item alignment, disabled-button state, animation, and right-to-left handling with Jellyfin Web 10.11.11’s registered `emby-scroller` and `emby-scrollbuttons` controls. Plugin-created rows retain Jellyfin’s documented custom-element upgrade pattern.
- Browser scripts parse successfully and the Release build succeeds against Jellyfin 10.11.11. Installed-server behavior remains part of this test round.

## [0.1.0.21-test] - 2026-08-11

### Reworked

- Makes every live Jellyfin **Recently Added to …** child row an individual
  Jellyfin-labeled entry in Create and Manage Home Screen Sections. Each row can
  be shown or hidden and dragged independently while Jellyfin continues to own
  its content, title, artwork, and navigation.
- Makes selected libraries literal content sources in Top 10–50, Rotating, and
  Seasonal source pickers. Library sources save as supported drafts, survive
  stable-ID renames, and participate in the same preview, ordering, and art flow
  as collection and metadata-tag sources.

### Fixed

- Adds a bounded Jellyfin-client readiness path and coalesces duplicate route
  events so Home initialization cannot silently exit or repeatedly cancel the
  same render. Custom rows, My List, hearts, and removal controls initialize
  independently from media-bar artwork.
- Removes the shared media-bar request queue that allowed one stale request to
  delay a newer source or image-type selection. Existing generation checks still
  prevent an older result from overwriting the current slide.
- Gives My List an explicit Home/Favorites/My List panel state, so selecting My
  List shows its own content and returning to Home or Favorites restores the
  corresponding native panel.
- Initializes Jellyfin’s registered scroller controls for every plugin-created
  row and adds one home-scoped arrow handler, restoring left/right buttons while
  retaining mouse-wheel, mouse-drag, touch, and focus navigation.
- Preserves hidden Recently Added rows through layout, section-edit, manual
  refresh, and apply saves. Deleted libraries leave no stale native row; renamed
  libraries retain their stable ID and show their live name.

### Appearance

- Softens and lengthens the Abyss media bar’s lower blend into the page and adds
  a restrained, blurred liquid-glass reflection derived from the active slide’s
  selected artwork.

### Safety and validation

- Reuses Jellyfin Web 10.11.11’s live Recently Added child elements and official
  user-view, display-preference, item, image, and custom-element contracts. It
  does not rebuild native Recently Added content or modify Jellyfin Web files.
- Browser scripts parse successfully and the Release build succeeds against
  Jellyfin 10.11.11. Installed-server behavior remains part of this test round.

## [0.1.0.20-test] - 2026-08-10

### Reworked

- Replaces periodic browser-side section polling with an explicit **Refresh Home
  Screen Sections** action. Applied static rules refresh sequentially and make
  one final settings write; rotating, seasonal, and cross-user activity rows
  remain dynamic without coupling Home or playback to whole-library work.
- Reconciles cached client settings with the live plugin endpoint on every
  session and moves all Home Screen Manager browser caches to a new server- and
  user-scoped schema, preventing an older image type, timing value, section
  order, or feature toggle from remaining active after a save or update.

### Fixed

- Requests media-bar artwork with Jellyfin Web 10.11.11's official
  `ImageTypeLimit` and `EnableImageTypes` options, uses returned image tags in
  scaled URLs, honors Backdrop, Primary, Banner, and Thumbnail before fallbacks,
  and prevents an older source request from overwriting a newer selection.
- Replaces and hides the original Abyss spotlight frame before loading the
  configured first slide while allowing custom rows and controls to initialize
  independently. The frame is revealed only after the configured bar renders.
- Keeps My List inside the native Home tab slider, places its one heart in the
  upper-left of card art, uses Jellyfin's boolean Likes update contract, and
  restores independently detected removal controls for Continue Watching and
  Next Up.
- Reloads current Top 10–50 selections through one sequential queue, reports
  per-source/page progress, cancels obsolete paged work after a selection
  change, and continues accepting explicit rating tags or Jellyfin Community
  Rating metadata.
- Resolves saved native home rows by their Jellyfin section token instead of an
  obsolete numeric slot. The native Latest Media wrapper remains one untouched
  Jellyfin block even when libraries are renamed, deleted, or added and its
  inner Recently Added rows change.
- Tracks live library IDs, names, and collection types per server/user. A rename
  keeps the same ID; an unambiguous deleted-and-re-added replacement records a
  conservative old-to-new alias, repairs stale Movies/TV/Music/Books routes,
  and migrates library and metadata-tag sources during manual refresh. It never
  guesses between multiple possible replacement libraries.

### Safety and validation

- Playback continues to use Jellyfin Web's item-based playback contract. No
  background playback-progress write, browser polling loop, document-wide DOM
  observer, or Jellyfin Web file replacement was added.
- Browser scripts parse successfully and the Release build succeeds with zero
  warnings against Jellyfin 10.11.11. Installed-server behavior remains part of
  this testing round.

## [0.1.0.19-test] - 2026-08-08

### Rebuilt

- Replaces the emergency-disabled browser client with a route-isolated runtime. Dashboard and playback routes cannot initialize Home sections, My List card scanning, media-bar reads, or Home observers, even when Jellyfin leaves an old Home view in the DOM.
- Renders cached custom rows, My List controls, and cached media-bar data independently. Home rows no longer wait for the media bar or Jellyfin's display-preferences request before appearing.
- Limits Home item reads to two concurrent requests, media-bar reads to one, and My List status reads to one. Section content loads in 40-item pages as the row is scrolled instead of fetching every saved ID at startup.
- Rebuilds the media bar without blob downloads, sequential image timeouts, synthetic Jellyfin button clicks, raw video routes, or session playback commands. It uses Jellyfin image URLs with immediate image fallbacks and only the supported Jellyfin Web playback contracts.
- Scopes the only DOM observer to the active visible view and disconnects it on route changes. It observes added nodes only and never watches the document body, document root, classes, or attributes.

### Fixed

- Keeps the uploaded logo and breadcrumbs isolated from Home and playback work.
- Makes My List hearts appear without waiting for the full list, performs one explicit Jellyfin Likes write per click, caches the returned item, and displays liked episodes with their series as the primary card identity.
- Recognizes common IMDb rating-tag formats and Jellyfin's native Community Rating field for Top 10-50 ranking.
- Maps episode activity to its parent series for the Series form of What Other Users Are Watching/Reading/Listening To.
- Adds Random (New Order on Every Reload) and the separate Poster art choice to every section type.

### Safety and validation

- The only playback-progress reset is the administrator-enabled, user-clicked remove button on Continue Watching or Next Up. The client contains no background playback-progress writes.
- Browser scripts parse successfully, the Release build succeeds with zero warnings against Jellyfin 10.11.11, and the release archive and catalog checksum are verified locally. Installed Jellyfin Web behavior remains part of this testing round.

## [0.1.0.18-test] - 2026-08-08

### Emergency recovery

- Disables the Home Screen Manager browser runtime while the severe installed-server regression is investigated.
- Makes no item, collection, activity, My List, media-bar, playback-adjacent, or user-data API requests.
- Restores Abyss's normal spotlight iframe, unhides it, and removes Home Screen Manager's injected Home elements and styles.
- Preserves saved plugin configuration for later recovery; no media, metadata, NFO, collection, or playback-progress data is changed by this release.

### Validation

- The recovery client parses and contains no ApiClient references.
- The Release build succeeds with zero warnings against Jellyfin 10.11.11.
- Installed recovery still requires closing old Jellyfin Web tabs, restarting Jellyfin, and disabling the existing Injector loader where possible.

## [0.1.0.17-test] - 2026-08-08

### Added

- Adds **Random (New Order on Every Reload)** to Section Content Order Settings for every section type.
- Adds **Poster** to Section Art Appearance Settings. Jellyfin 10.11.11 exposes poster artwork through its Primary image contract, so Poster uses that supported image while remaining a distinct saved plugin choice.

### Fixed

- Removes the recursive all-section startup refresh and the DOM-mutation rerender loop that could delay Home, My List, hearts, playback, the media bar, and Dashboard requests for minutes.
- Applies non-media-bar enhancements immediately, renders saved custom-section snapshots through a bounded three-worker queue, and lets the media bar use the same saved source instead of blocking the rest of Home.
- Refreshes at most one live section per minute in the background and serializes multi-source and paged item reads; rotating and seasonal timing still re-evaluates when automatic newly-added-media refresh is disabled.
- Caches the privacy-preserving cross-user activity result for 60 seconds and maps episode activity to its parent series when Series is selected.
- Recognizes additional IMDb tag text formats and falls back to Jellyfin's supported CommunityRating field so existing rated media is no longer incorrectly reported as entirely unranked.

### Validation

- Dashboard and browser JavaScript parse successfully.
- The Release build succeeds with zero warnings against Jellyfin 10.11.11.
- Installed timing, playback, My List, Top ranking, and Series activity remain part of this testing round.

## [0.1.0.16-test] - 2026-08-08

### Added

- Adds **Top 10-50** at the end of the section-type picker, reusing the exact
  collapsed collection/library/tag source-picker interface and combining all
  selected collections and metadata tags into one editable draft.
- Ranks only media with explicit IMDb rating tags, supports Top 10, 20, 30, 40,
  or 50, and adds optional oversized solid/gradient ranking numbers with a
  user-imported TTF or OTF font.
- Adds **What Other Users Are Watching/Reading/Listening To**, with Movies,
  Series, Music/Audiobooks, and Books modes, an editable maximum item count,
  type-aware default names, and a randomized combination of recent/current
  activity without exposing user identities.
- Adds 20-item paging to every image-based **Content In Section** preview while
  retaining the complete text-only list for manual ordering.

### Fixed

- Renders each saved custom-row snapshot independently and immediately while its
  live collection, tag, library, rotation, seasonal, or activity rule refreshes
  in the background.
- Starts the configured media bar from its saved item snapshot and reuses a
  matching locally cached payload on reload, preventing multi-minute blank
  media-bar waits without restoring the original Continue Watching flash.
- Displays liked episodes in My List with their series art and series name as
  the primary identity and the episode title beneath it, matching the established
  behavioral reference while retaining Jellyfin's per-user Likes storage.

### Validation

- Dashboard and browser JavaScript parse successfully.
- The Release build succeeds with zero warnings against Jellyfin 10.11.11.
- Installed Jellyfin Web behavior remains part of the current testing round.

## [0.1.0.15-test] - 2026-08-08

### Fixed

- Starts the configured media bar as soon as its own first eligible saved source finishes loading instead of waiting for every custom Home row.
- Shows the selected media-bar title, controls, and carousel immediately while metadata-confirmed artwork loads, with bounded image requests and no original Abyss/Continue Watching slide flash.
- Uses Jellyfin Web 10.11.11's supported string rating value for My List, updates the single heart immediately, and prevents a late initial read from undoing a click.
- Clears detail-page breadcrumbs immediately when returning Home.

### Changed

- Moves **Top Navigation Selected Text Color Settings** into its own full settings section directly below **Top Navigation Color Settings**.

## [0.1.0.14-test] - 2026-08-07

### Added

- Adds a separately saved **Media Bar Label Color** accessibility control beside
  the existing Jellyfin and Home Screen Manager badge colors.
- Adds a **Selected Tab Text Color** control inside Top Navigation Color Settings
  for the active Home, Favorites, My List, or other top-navigation tab.

### Fixed

- Hides the original Abyss iframe immediately with an inline priority style and
  reveals it only after the configured first image has rendered, removing the
  installed-client delay that remained in 0.1.0.13.
- Places My List inside Jellyfin's native Home/Favorites tab slider instead of
  appending it beneath the top navigation.
- Uses one Material heart icon whose class changes between outline and filled
  states, preventing the duplicate-heart glyph.
- Builds plugin rows with Jellyfin 10.11.11's native scroller elements so desktop
  arrows, mouse-wheel scrolling, mouse dragging, touch, and focus navigation work.
- Replaces raw folder-path breadcrumbs with fast media-aware Jellyfin navigation
  for movies, shows, seasons, episodes, artists, albums, and songs, including
  sibling season, album, and song selectors.
- Keeps the active Abyss frame tied to the visible Home tab, makes every carousel
  dot directly operable, and cancels stale artwork work before applying a newly
  selected media-bar image type.

### Changed

- Places **My List Heart Color Settings** directly below **Sidebar Icon Color
  Settings**, followed by **Episode Count Pill Color Settings**.


## [0.1.0.13-test] - 2026-08-07

### Fixed

- Keeps the original Abyss spotlight frame hidden until Home Screen Manager has
  fetched, decoded, and rendered the configured first media-bar image, preventing
  the default Continue Watching artwork from flashing before the selected source.

### Changed

- Prevents My Media, My Media (small), and Latest Media from becoming the
  media-bar source in both the section editor and the Home-screen runtime.
- Documents that Continue Watching can supply up to 30 available items to the
  media bar while remaining present as a normal row below it.

## [0.1.0.12-test] - 2026-08-07

### Added

- Exposes Abyss's shared **Accent Color** as a visible picker for hover states,
  including top navigation text, play and resume buttons, and sidebar menu items.

- Adds a credited Abyss-compatible media-bar document that uses the installed
  Abyss spotlight stylesheet and preserves the upstream MIT notice.
- Makes the saved first hybrid row the real media-bar source and applies the
  saved interval and Backdrop, Primary, Banner, or Thumbnail image setting.

### Changed

- Keeps the media-bar source row visible as a normal home section beneath the
  bar instead of hiding or duplicating it.
- Keeps the uploaded Home logo on every non-playback Jellyfin Web page,
  including detail pages with breadcrumbs, while preserving Home navigation.

### Validation boundary

- Source, JavaScript, embedded-resource, and Release-build checks are local;
  exact installed Abyss/Jellyfin behavior still requires the next test build.

## [0.1.0.11-test] - 2026-08-06

### Added

- Adds **Rotating Sections**, with collapsed collection, library, and metadata-tag
  pickers, one draggable draft per selected collection or tag, and configurable
  rotation intervals in hours, days, or weeks.
- Adds **Seasonal Sections** with the same collapsed source pickers and draggable
  drafts, plus a recurring start and end month/day window for every draft.
- Gives rotating and seasonal sections the existing content preview, content
  ordering, manual ordering, art appearance, save, edit, and home-screen apply
  workflow.

### Changed

- Preserves Abyss's existing media bar, logo treatment, backdrop blending, and
  Jellyfin's native Continue Watching row while plugin sections load.
- Applies the saved solid or gradient color directly to My List heart icons.
- Keeps Jellyfin's hovering play button centered by leaving its native overlay
  positioning intact for every art size and shape.
- Places paired color controls closer together, adds Thumbnail to the media-bar
  image choices, and clarifies Main Settings and Customization Settings wording.

### Validation

- The Dashboard and browser JavaScript parse, rotating and recurring seasonal
  date-window smoke checks pass, and the Jellyfin 10.11.11 Release build succeeds.
- Installed-server behavior remains a test-round requirement.

## [0.1.0.10-test] - 2026-08-06

### Added

- Adds **Section Art Appearance Settings** after **Section Content Order
  Settings** and before **Add Section to Home Screen**.
- Adds Extra Small, Small, Medium, Large, and Extra Large responsive art sizes;
  Medium preserves the existing Jellyfin-size default.
- Adds Automatic, Primary/Poster, Art, Backdrop, Banner, Logo, Thumb, Disc, Box,
  Box Rear, Screenshot, Menu, and Chapter image choices using Jellyfin's
  official image types.
- Adds Poster/Tall Rectangle, Wide Rectangle, Square, and Circle shapes, plus a
  native checkbox for showing or hiding the media name and year.
- Persists and restores every art setting for each saved section.
- Adds separate solid, vertical-gradient, horizontal-gradient, and center-gradient controls for the top navigation, play buttons, watched progress, sidebar icons, and My List hearts.
- Adds an uploaded Home logo beside the menu button and uses the same logo inside Jellyfin's existing Home button on other pages.
- Adds media-bar timing and Backdrop, Primary/Poster, or Banner image settings.
- Adds Main Settings for automatic rule refresh, Continue Watching and Next Up removal buttons, My List, series information, selected-library infinite scroll, collections on detail pages, enhanced Jellyfin-only search, and header breadcrumbs.
- Adds My List as a per-user header tab backed by Jellyfin's existing `UserData.Likes` field and official rating update call.
- Adds an **Also Part of These Collections** detail-page section and series/season count plus **Ends at** information.

### Home screen behavior

- The first saved hybrid section is labeled **Media Bar**, supplies the media-bar items, and is not duplicated as a normal row below the bar.
- Native and plugin-created rows can all be dragged into the first position; Continue Watching is no longer forcibly pinned.
- Collection and library sources are re-read from Jellyfin, while tag rules can be refreshed from Collection Manager on the automatic refresh interval.
- The Abyss spotlight iframe is suppressed only while Home Screen Manager's own media bar is active.

### Validation

- Adds a local Jellyfin-DOM browser harness covering the loader, media bar, hidden source row, plugin row, My List tab, and logo.
- The harness renders with one instance of each expected element and no browser page errors.


### Changed

- Changes home-screen loading to the same JavaScript Injector configuration path
  used by KefinTweaks.
- **Add Section to Home Screen** now creates or updates only the named
  `Home-Screen-Manager-Loader` entry and preserves every other JavaScript
  Injector script and setting.
- Removes the superseded custom File Transformation callback and hosted-service
  path so the plugin has one authoritative browser loader.

### Fixed

- Fixes saved manual ordering not reaching the Home screen when the previous
  browser injection path did not load.
- Applies the saved manual item rank and selected art appearance in the injected
  Home Screen Manager renderer.

### Test boundary

- The Jellyfin 10.11.11 Release build, dashboard/client JavaScript parsing,
  named-loader preservation, initialization smoke test, and rendered browser
  harness pass with zero build warnings and zero page errors. Installed-server
  behavior still requires the checks in `goal-testing.txt`.

## [0.1.0.9-test] - 2026-08-06

### Added

- Adds a text-only draggable content list whenever **Manual (Drag to Choose
  Exact Order)** is selected.
- Persists the dragged item ID order through **Save and Move On** and **Add
  Section to Home Screen** for every section type.
- Adds authenticated integration diagnostics for registration state, transformed
  index responses, last transformation time, and applied section count.

### Fixed

- Replaces the released File Transformation callback wrapper with its published
  write-service callback contract, captured at registration time, so serving
  Jellyfin Web does not depend on a provider that has already been disposed.
- Uses the visible Jellyfin home-page container selector and bounded retry
  behavior demonstrated by the reference implementations, including page-view,
  page-show, route-change, and class-change handling.
- Reports success only after the section is saved, File Transformation is
  registered, and the Home Screen Manager browser client can load.

### Test boundary

- The JavaScript sources parse, the Jellyfin 10.11.11 Release build succeeds,
  and an expandable-stream smoke test confirms the callback injects both
  embedded browser assets. Installation and visible home-row behavior still
  require the real-server checks in `goal-testing.txt`.

## [0.1.0.8-test] - 2026-08-06

### Added

- Adds the complete **Section Content Order Settings** stage for every section
  type, with title, release-date, date-added, rating, and manual-order choices.
- Adds **Add Section to Home Screen**, with normal Jellyfin Dashboard success
  and failure feedback.
- Persists each completed section's content order and applied state.
- Adds an authenticated Jellyfin Web client that renders applied custom rows,
  fetches their configured media, applies the selected ordering, and combines
  them with Jellyfin's existing home rows.
- Registers the client through the File Transformation plugin's supported
  non-destructive served-web transformation interface.

### Fixed

- Keeps Continue Watching at the top while preserving custom rows around the
  current native Jellyfin arrangement.
- Preserves the real `homesection0` through `homesection9` slot number when
  native settings contain empty slots.
- Injects the browser CSS and JavaScript only once and leaves Jellyfin's source
  files unchanged.

### Test boundary

- Source parsing, the Release build, embedded-resource inspection, and the
  transformation callback smoke test pass. Installed Jellyfin 10.11.11 browser
  behavior still requires the real-server checks in `goal-testing.txt`.

## [0.1.0.7-test] - 2026-08-05

### Changed

- Changes the plugin display name to **Home Screen Manager** while retaining the existing repository folders, assembly, namespace, API routes, embedded-resource path, GUID, and asset paths.
- Replaces the separate **Create Home Screen Sections** and empty **Manage Home Screen Sections** tabs with one **Create and Manage Home Screen Sections** tab.
- Removes the redundant generated-CSS preview and Copy button from Customization Settings. **Save & Apply Customization Settings** continues generating Abyss CSS behind the scenes and writes it only to Jellyfin's native server Branding Custom CSS field.

### Fixed

- Shows only one **Loading section settings…** message while a selected section-type editor loads.
- Keeps the new section draft active after **Create Section**, allowing another section type to be selected and created when the user changes their mind.
- Migrates previously saved Home Screen Sections Manager Abyss CSS marker blocks to the new Home Screen Manager marker name without duplicating imports or overrides.

### Test boundary

- This build saves complete section drafts and hybrid ordering but does not yet render those drafts as Jellyfin home-screen sections.

## [0.1.0.6-test] - 2026-08-05

### Fixed

- Moves every Dashboard handler inside the plugin page root and one embedded script, so Jellyfin Web 10.11.11 retains the type-specific editor and Customization Settings logic when loading the page.
- Uses the exact plain tab-button structure from Media Tagging Manager and Collection Manager, removing the extra Abyss/Jellyfin action-button spacing and weight.
- Reduces the section-type spacing and removes the native checkbox container margin so each description sits directly beneath its option without overlapping.
- Keeps **New Section Type Settings** visible while **Create Section** opens the selected type-specific picker below it.
- Saves server Custom CSS through Jellyfin 10.11.11 official Branding read and update endpoints while preserving unrelated branding fields and CSS.
- Shows the same direct `Dashboard.alert` success or failure notification used by the other two plugins.

### Test boundary

- This build saves complete section drafts and hybrid ordering but does not yet render those drafts as Jellyfin home-screen sections.

## [0.1.0.5-test] - 2026-08-05

### Fixed

- Restores the exact borderless tab styling used by Media Tagging Manager and
  Collection Manager.
- Replaces the custom bordered section-type cards with the same native
  Jellyfin radio/check control structure used by the other two plugins.
- Adds enough vertical spacing for every section-type description to wrap
  without overlapping the next option.
- Keeps **New Section Type Settings** open and the native selected control
  intact after a section type is chosen.
- Advances to the correct type-specific picker only after **Create Section** is
  clicked, using one explicit state transition instead of competing click
  handlers.
- Uses the same direct Dashboard alert notification behavior as the other two
  plugins for successful and failed Customization Settings saves.

### Test boundary

- This build saves complete section drafts and hybrid ordering but does not yet
  render those drafts as Jellyfin home-screen sections.

## [0.1.0.4-test] - 2026-08-05

### Fixed

- Prevents Jellyfin Web 10.11.11's plugin-page translation pass from turning
  JavaScript template expressions into visible text in the current-section
  list and section-type picker.
- Restores real current-section rows, blue and purple ownership labels,
  single-row selection, plugin-only editing and deletion, inline naming, and
  all ten conditional section-type flows.
- Moves **Save & Apply Customization Settings** outside the **Custom CSS**
  section so it saves the complete Customization Settings tab.
- Adds the same visible Jellyfin alert feedback used by the preceding plugins,
  including useful server error details when a save cannot complete.
- Preserves saved section definitions and hybrid ordering when Customization
  Settings are updated.

### Test boundary

- This build saves complete section drafts and hybrid ordering but does not yet
  render those drafts as Jellyfin home-screen sections.

## [0.1.0.3-test] - 2026-08-04

### Added

- **Customization Settings** tab for the supported Abyss accent, corner radius,
  indicator-pill color, optional web font, and Lite Mode settings.
- Supported Jellyfin branding-configuration integration that preserves
  unrelated Custom CSS while applying the generated Abyss CSS.
- Restorable editing for every saved section name, type, and selected manual,
  collection, metadata-tag, or library source.

### Changed

- Ports the current Collection Manager manual-media, collection-art,
  metadata-tag, selected-library, and selected-content preview layouts into the
  corresponding section types.
- Uses the current Jellyfin theme text color for visible outlines instead of
  assuming a dark dashboard.
- Uses Collection Manager's aggregated metadata-type picker behavior, including
  source grouping, full search, matching counts, and person images.

### Fixed

- Displays complete collection and library content previews across every
  Jellyfin results page.
- Keeps the inline section-name input focused and editable without the parent
  row renderer replacing it.
- Restores the saved source selections and manual media cards when editing a
  plugin section.

### Test boundary

- This build saves complete section drafts and hybrid ordering but does not yet
  render those drafts as Jellyfin home-screen sections.

## [0.1.0.2-test] - 2026-08-04

### Added

- **Create Home Screen Sections** dashboard editor with current native-row labels,
  selection, drag ordering, and a locked Continue Watching row.
- Custom section creation, editing, deletion, label colors, and saved draft settings.
- Manual, collection, metadata-tag, and library source-picker flows reused from
  the preceding Collection Manager workflow, with Content In Section previews.
- Empty **Section Content Order Settings** stage revealed by **Save and Move On**.

### Test boundary

- This build configures section drafts only. It does not yet render or alter
  Jellyfin home-screen sections.

## [0.1.0.1-test] - 2026-08-04

### Added

- Initial **Home Screen Sections Manager** Jellyfin 10.11.11 plugin shell.
- Dashboard page with the empty **Main Settings**, **Create Home Screen
  Sections**, and **Manage Home Screen Sections** tabs.
- Project documentation, test tracker, compatibility audit, repository
  `.gitignore`, and Home Screen Sections Manager Noncommercial License 1.0.
