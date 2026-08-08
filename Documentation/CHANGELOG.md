# Changelog

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
