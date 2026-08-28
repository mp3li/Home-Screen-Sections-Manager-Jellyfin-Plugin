<p align="center">
  <img src="Assets/Branding/home-screen-sections-manager-icon.png" alt="Home Screen Manager icon: retro television with an artist paint palette and paintbrush" width="180" />
</p>

<h1 align="center">Home Screen Manager Jellyfin Plugin</h1>

<p align="center">
  Turn Jellyfin into a fully customized discovery experience with native and custom sections, complete custom pages, Media Bars, Top Rows, a per-user My List, additional interface features, and controls that further customize the <a href="https://github.com/AumGupta/abyss-jellyfin">Abyss theme</a> this plugin is specifically made to be compatible with.
</p>

<p align="center">
  <img src="Assets/Badges/version.svg" alt="Version: 0.1.0.66" />
  <img src="Assets/Badges/status.svg" alt="Status: Active Testing" />
  <img src="Assets/Badges/target.svg" alt="Target: Jellyfin 10.11.11" />
  <img src="Assets/Badges/interface.svg" alt="Interface: Dashboard and Jellyfin Web" />
  <img src="Assets/Badges/sections.svg" alt="Sections: Native and Custom" />
  <img src="Assets/Badges/pages.svg" alt="Pages: Home My List and Custom" />
  <img src="Assets/Badges/abyss.svg" alt="Compatible with Abyss Theme" />
</p>

## Why This Plugin Was Created

I’ve loved Jellyfin and used it for years, but its browsing experience often felt like: here are your boxes of media. It worked wonderfully when I already knew exactly what I wanted to watch, listen to, or read, but discovery still felt like work.

I didn’t want to recreate a paid streaming service inside Jellyfin. I wanted the part those services get right: an official, professional-feeling interface that catches your attention, gives you somewhere interesting to go, and helps you discover something in a library you already own. I wanted that experience with far more control and customization than a subscription platform would ever give me.

I also wanted to keep the media library itself simple. One folder for Movies, one for Series, one for Music, one for Books, one for Audiobooks, and, in my case, one separate library for Live Performances and Proshots. I don’t want to spend my time manually maintaining a meticulously divided folder system, but I do want the library I browse to feel meticulously organized.

That is why discovery is the entire point of Home Screen Manager. Custom pages can work like the dedicated Movies and Shows pages on Netflix or the separate Book and Audiobook areas in Libby. Sections can go much deeper than a few general library rows. They can bring together hand-picked media, collections, libraries, metadata, rankings, seasons, viewing and listening history, and activity in ways designed to make something catch your eye.

The logo features are part of that feeling too. A logo-only Top Row can make opening your Netflix or Crunchyroll collection feel like entering that service, except you never leave Jellyfin and only browse the media you actually have in that collection. It is one more way to make paid streaming platforms easier to use less.

Home Screen Manager was specifically built as the presentation layer in a three-plugin workflow:

1. [Media Tagging Manager](https://github.com/mp3li/Media-Tagging-Manager-Jellyfin-Plugin) builds detailed, useful metadata.
2. [Collection Manager](https://github.com/mp3li/Collection-Manager-Jellyfin-Plugin) turns that metadata and your existing Jellyfin organization into native, automatically maintained collections.
3. Home Screen Manager turns those collections, tags, libraries, and media into rich Home and custom-page discovery experiences.

With the companion plugins’ own automatic processing enabled, newly scanned media can flow into its tags and collections without rebuilding a complicated folder structure by hand. Home Screen Manager’s live user sections and scheduled section types resolve automatically; saved static section snapshots have an explicit, bounded refresh so their updates stay under your control and don’t jam Jellyfin. All three plugins work together, but Home Screen Manager can also be used completely standalone.

There are **26 section types**, and the same type can be used in many different ways. The plugin also brings together widely loved Jellyfin customizations such as removing an item from Continue Watching or Next Up, a true per-user My List with customizable heart buttons on media hover, enhanced search, infinite scrolling, detail-page collection rows, breadcrumbs, long-title marquees, a server message bar, and much more.

The project first had to answer whether custom mixed sections, additional pages, Top Rows, Media Bars, per-user features, and companion-plugin integration were even possible without replacing Jellyfin Web files. Those features now exist. The current development phase is about optimizing load times, request order, batching, caching, and efficiency while protecting everything that already works.

## About Home Screen Manager

Home Screen Manager is much more than a Home-row editor. It manages the Home screen and complete custom discovery pages, combines Jellyfin’s native rows with plugin-owned sections, creates page navigation, adds Media Bars and Top Rows, provides a per-user My List, extends the Abyss theme, and adds optional search, navigation, detail-page, library, series, title, and playback-progress features across Jellyfin Web.

Administrators decide which features are enabled, which pages and sections exist, where every row appears, which sections also supply a Media Bar, which artwork and ordering rules are used, and how the surrounding interface should look. Installing the plugin alone doesn’t create pages, invent sections, change library contents, or silently redesign the server.

Native Home rows remain Jellyfin-owned. Home Screen Manager can place and style them alongside custom rows, but it doesn’t copy their media into another database. Custom cards retain Jellyfin navigation, playback, images, user data, horizontal scrolling, multi-select, and bulk-action behavior for the supported Jellyfin Web version.

The plugin doesn’t download media, change tags, rewrite NFO files, modify collection membership, rename or move files, alter video or audio streams, or replace Jellyfin Web files.

## Section Types

The names and descriptions below match the current plugin dashboard exactly.

- **My List Content Section** — Create a section that displays the signed-in user’s own My List content. No content selection is required, and every user sees only their own items.
- **Watch Again** — Create a section that automatically displays completed movies and the most recently completed episode from each watched series for the signed-in user. No content selection is required, and every user sees only their own watch history.
- **Continue Watching** — Create a native-style section containing the signed-in user’s resumable video items. No content selection is required.
- **Continue Listening** — Create a native-style section containing the signed-in user’s resumable audiobook and audio items. No content selection is required.
- **Continue Reading** — Create a native-style section containing the signed-in user’s resumable books. No content selection is required.
- **Continue Watching & Listening** — Create one user-specific section combining resumable video and audio content. No content selection is required.
- **Continue Reading & Listening** — Create one user-specific section combining resumable books and audio content. No content selection is required.
- **Songs Recently Listened To** — Create a user-specific section of songs listened to for at least 10 seconds. No content selection is required.
- **Artists Recently Listened To** — Create a user-specific section of artists from songs listened to for at least 10 seconds. No content selection is required.
- **Albums Recently Listened To** — Create a user-specific section of albums from songs listened to for at least 10 seconds. No content selection is required.
- **Manual Content** — Create a section that displays manually selected content.
- **Individual Collection Content** — Create a section that displays all content of one selected collection. For example, all content in the Thrillers Collection.
- **Multiple Collection Content** — Create a section that displays all content of multiple selected collections. For example, all content in the Thrillers Collection and all content in the Horror Collection.
- **Collections in a Row** — Create a section that displays collections in a row, by their image. Similar to Jellyfin's main/big My Media section, but showing selected collections instead. For example, Netflix Collection, Hulu Collection, etc. Or another example: the primary images for multiple collections, like Horror Collection, Thriller Collection, 70s Scary Movies Collection, 80s Scary Movies Collection, 90s Scary Movie Collection, 2000s Scary Movie Collection, 2010s Scary Movie Collection.
- **Individual Tag Content** — Create a section that displays all content of one selected tag. For example, all content with a horror genre tag.
- **Multiple Tag Content** — Create a section that displays all content of multiple selected tags. For example, all content with a horror tag, and all content with a thriller tag, combined all together.
- **Muilti-Match Tag Collection Content** — Create a section that displays all content that matches all selected tags. For example, if 'thriller genre' and 'horror genre' tag are both selected, then the content must have BOTH a thriller and horror tag to be in this section. Or if 'thriller genre' and 'M. Night Shyamalan Director' tag are selected, the content must be a thriller directed by M. Night Shyamalan to be in this section.
- **Library Content** — Create a section that displays all content of one selected library. For example, all content in the Movies library.
- **Recently Added in a Library** — Create a native-style Recently Added section for one selected Jellyfin library.
- **Multiple Library Content** — Create a section that displays all content of all selected libraries. For example, all content in the Audiobooks and the Books libraries.
- **Libraries in a Row** — Create a section that displays multiple libraries in a row, by their image. Similar to Jellyfin's main/big My Media section, but showing only selected libraries instead of all.
- **Rotating Sections** — Create multiple section drafts from selected collections, libraries, and metadata tags, then rotate which draft appears on the home screen using the schedule you choose.
- **Seasonal Sections** — Create multiple section drafts from selected collections, libraries, and metadata tags, then choose the recurring date window when each draft appears on the home screen.
- **Top 5-100** — Based on IMDB ratings that must already be tagged in your media to use this feature. Select as much media as you’d like and the displayed media and media order will be picked based on your selections.
- **Crunchyroll Top 5-100** — Create a Top 5-100 section from selected content using Crunchyroll upvotes/downvotes, overall ratings, or any selected whole-number star ratings. For star choices, the whole-number portion is used, so 4.8 counts as 4 stars. Rating tags are checked only after Save and Move On.
- **What Other Users Are Watching/Reading/Listening To** — Displays a random combination of what all users have recently watched/are currently watching.

## Added Customization Features to [Abyss Theme](https://github.com/AumGupta/abyss-jellyfin) & Compatibility

I love the Abyss theme and wanted to start by making this plugin specifically built around compatibility with the [Abyss theme by AumGupta](https://github.com/AumGupta/abyss-jellyfin). Later I plan on adding compatibility for other themes.

Abyss originally documents three core customization variables:

- Accent color
- Global corner radius
- Episode-count and indicator-pill background color

Its README also documents an optional Lite Mode and a custom web-font override. Home Screen Manager brings those controls into its dashboard and adds a multitude of customization options beyond the theme’s original capabilities:

- Solid, vertical-gradient, horizontal-gradient, or center-gradient Top Navigation colors
- A separate selected Top Navigation text color while retaining the accent hover color
- Solid or gradient Play and Resume button colors
- Solid or gradient watched-progress and playback-progress colors
- Solid or gradient sidebar icon-circle colors
- Solid or gradient My List heart colors
- An uploaded Home Screen logo that also becomes the Home control on other pages
- Media Bar display timing from 1 to 300 seconds
- Abyss Original, Backdrop, Primary, Banner, or Thumbnail Media Bar image behavior
- Optional Media Bar slow zoom
- Dashboard control over global corner rounding from 0 to 64 pixels
- Dashboard control over the Abyss accent and episode-count pill colors
- A stylesheet URL and exact font-family override
- A dashboard Lite Mode toggle for lower-power clients
- Top Row logo-shadow color and removal controls
- Marquee Message fonts, text color, shadow, solid or gradient bar colors, speed, visibility, and persistence
- Top 5-100 number fonts, solid or gradient number colors, and shadow controls

The Media Bar is adapted from Abyss Spotlight rather than presented as original Home Screen Manager work. Abyss is MIT-licensed. The adapted source retains the original copyright, MIT license notice, version/revision credit, and upstream repository link. The Abyss license is kept in the source tree, embedded into the compiled plugin assembly, and documented in [Third-Party Notices](THIRD-PARTY-NOTICES.md). Home Screen Manager’s own code remains under this project’s separate noncommercial license; that license doesn’t replace or restrict the MIT terms that continue to apply to the adapted Abyss portion.

## Custom Pages

Custom Pages turn the top navigation into a set of complete, focused discovery destinations. Home remains locked first, while Favorites, My List, and plugin-created pages can be shown, hidden, and reordered. A custom page can be created for Movies, Series, Books, Audiobooks, Music, a provider collection, a genre, live performances, or any other experience you want, then filled with its own independent combination of native-style and custom sections.

Pages can be created, renamed, deleted, restored, reordered, and populated without replacing Jellyfin’s Home screen. Their definitions and layouts are server-wide, while per-user sections still resolve separately for the person signed in. When more than four custom pages are visible, the top navigation automatically becomes an arrowed horizontal strip that also supports mouse, mouse-wheel, trackpad, and touch scrolling.

## Top Rows

Top Rows are compact visual navigation rows that can sit beneath Jellyfin’s navigation across Home, custom pages, libraries, browse pages, and detail pages. The Main Top Row is the server-wide default. A page or library can have one saved targeted Top Row that replaces Main only in that assigned area when its override is enabled; a library assignment follows that library through its browse and detail pages.

A Top Row can contain selected collections, selected libraries, or genres from an assigned library. Content can be manually dragged into an exact order or sorted by title. Artwork is intentionally Extra Small and can use Automatic, Primary, Art, Backdrop, Banner, Logo, Thumb, Disc, Box, Box Rear, Screenshot, Menu, or Chapter images in wide, square, or circular shapes.

**Display Logos Only** uses the exact collection-logo artwork assignments saved by [Collection Manager](https://github.com/mp3li/Collection-Manager-Jellyfin-Plugin). It can create the feeling of selecting a familiar service or curated destination while staying entirely inside your own Jellyfin library. Top Rows can scroll away with the page or remain visible, and their subtle logo shadow can be recolored or removed.

## Media Bars

Any eligible plugin section can also become a full-width Media Bar, and a page can have more than one. The Media Bar showcases that section’s items with large background artwork, item information, navigation, playback actions, automatic advancement, and optional slow zoom. Its matching regular section remains available below and keeps its own card artwork settings.

Media Bars can use Abyss Original image selection or prioritize Backdrop, Primary, Banner, or Thumbnail artwork with fallbacks. Display timing is configurable from 1 to 300 seconds per item. They load only near the viewport, reuse cached and in-flight source work, and stop obsolete page work when navigation changes so a visually rich page doesn’t require every showcase to load at once.

## My List

My List adds a true per-user page, heart buttons on supported media cards and detail pages, and a **My List Content Section** that can appear on Home or any custom page. It uses Jellyfin’s existing per-user Likes field instead of inventing a second watchlist database, so every signed-in user sees and manages only their own items.

The My List page can be shown, hidden, and positioned in the top navigation. The My List section can be reordered, restyled, hidden, or used as a Media Bar like another plugin section. Heart controls can use solid or gradient colors, and Favorites can be hidden independently when My List is the preferred way to save media.

## Additional Features

The **Main Settings** tab adds optional features across Jellyfin Web, not only on the Home screen:

- **Refresh Home Screen and All Pages Sections** refreshes saved static sections in one explicit, single-flight, server-conscious run.
- **Remove from Continue Watching and Next Up** adds an X button to supported cards so an item can be removed directly from either row.
- **My List** adds the per-user page and heart controls, with a separate option to hide Favorites.
- **Series Info** adds season and episode totals to series and season pages and shows an estimated playback finish time when runtime details are available.
- **Infinite Scroll** automatically asks Jellyfin for the next page as you approach the bottom of each administrator-selected library.
- **Collections on Detail Page** adds an **Also Part of These Collections** row to supported media detail pages.
- **Enhanced Search** adds grouped All, Movies and TV, Music, and Books modes without adding Jellyseerr features.
- **Bread Crumbing** adds a clickable, media-aware location trail to the upper-left header on supported detail pages.
- **Marquee Effect on Titles** lets long media titles scroll instead of remaining cut off, with Extra Slow, Slow, Normal Speed, Fast, and Faster options.

The separate **Marquee Message Settings** tab can add a server-wide message to selected Home-screen pages or every non-playback page, with its own font, colors, gradients, shadow, speed, and scroll-or-persist behavior.

## Automatic and Scheduled Maintenance

Home Screen Manager is designed to support a low-maintenance discovery workflow without turning a library change into an uncontrolled wall of server requests.

- My List, Watch Again, Continue Watching, Continue Listening, Continue Reading, combined Continue sections, recently listened sections, and other-user activity resolve from current Jellyfin user data.
- Rotating Sections change drafts on the saved hourly, daily, or weekly interval.
- Seasonal Sections choose drafts by their saved recurring date windows.
- Recently Added in a Library continues to use Jellyfin’s current library data.
- With their own automatic processing enabled, Media Tagging Manager can process new media after Jellyfin scans it and Collection Manager can reconcile matching native collections.
- Static collection-content, library-content, metadata-tag, Top 5-100, and Crunchyroll Top 5-100 section snapshots update when created, edited, individually refreshed, or included in **Refresh Home Screen and All Pages Sections**. Version 0.1.0.66 doesn’t silently schedule that full static refresh in the background.
- Top Rows save the chosen navigation-item IDs and request their current names and artwork while browsing; their selection, target, order, and appearance change only when edited.
- The all-pages refresh is single-flight, processes sections one at a time, reuses matching source scans, uses lightweight ID requests, and yields between larger batches to keep Jellyfin responsive.

On the browsing side, custom sections load near the viewport, start with 16 items, and request another 16 only when horizontal scrolling approaches the end. Artwork is also lazy-loaded. A saved maximum of 80 is therefore a ceiling reached across as many as five 16-item batches, not one giant initial request.

## Data and Safety Model

### Server-Wide Configuration

Page definitions, page order, section definitions, layouts, Top Rows, Marquee Message settings, artwork choices, and customization settings are stored in the plugin configuration and apply server-wide. Uploaded Home logos and imported fonts are stored as plugin settings.

### Per-User Content

My List, Watch Again, Continue sections, recently listened sections, and the requesting user’s accessible view of shared activity are resolved through Jellyfin’s existing user data. Saving a section definition doesn’t combine one user’s Likes, playback progress, or history with another user’s data.

### Native Jellyfin Ownership

Native Home rows remain Jellyfin-owned. Home Screen Manager can order, show, hide, and restyle the live rows, but it doesn’t copy their media into a second database. Playback, images, user data, library views, media queries, multi-select, and bulk actions continue to use the signed-in Jellyfin user’s normal access.

### Explicit Refresh and Customization

Static collection-content, library-content, metadata-tag, and ranking section snapshots change only when they are created, edited, individually refreshed, or included in the explicit all-pages refresh. Dynamic history, seasonal, rotating, recently added, and activity sections resolve according to their own rules. Top Rows retain their saved source IDs while requesting current navigation-item names and artwork.

Customization saves a named Home Screen Manager block through Jellyfin’s normal Branding Custom CSS setting while preserving unrelated Custom CSS. The browser client is loaded through one named JavaScript Injector entry and preserves every unrelated Injector script and setting.

## Current Release

The current catalog build is **0.1.0.66**. This active-testing release adds Crunchyroll Top 5-100 ranking by upvotes/downvotes, overall rating, or any simple combination of whole-number star categories; checks only selected content after **Save and Move On**; makes navigation beyond four custom pages a true four-page scroll window; and lowers detail-page Primary/Poster artwork further while preserving the faster lazy and batched loading architecture and the existing scrolling, multi-select, repeated-section, refresh, and custom-page edge fixes.

The current source passes the browser, dashboard, and performance regression contracts and builds against Jellyfin 10.11.11 with zero warnings or errors. The published manifest and release archive were downloaded and verified after publication. Installed-server results can still vary with library size, storage, proxy configuration, available upload bandwidth, and client hardware.

## Requirements

- Jellyfin Server **10.11.11**
- Administrator access
- [JavaScript Injector](https://github.com/n00bcodr/Jellyfin-JavaScript-Injector)
- [File Transformation 2.5.11.0](https://github.com/IAmParadox27/jellyfin-plugin-file-transformation) — recommended for JavaScript Injector’s non-destructive Jellyfin 10.11.11 injection path
- [Abyss Theme](https://github.com/AumGupta/abyss-jellyfin) — the visual base this plugin is specifically designed to extend and remain compatible with
- (Optional but recommended) [Media Tagging Manager](https://github.com/mp3li/Media-Tagging-Manager-Jellyfin-Plugin) — builds a detailed metadata foundation for deeper automatic discovery
- (Optional but recommended) [Collection Manager](https://github.com/mp3li/Collection-Manager-Jellyfin-Plugin) — builds and maintains native collections, supplies metadata-tag catalogs, and provides exact logo assignments for **Display Logos Only**
- A current browser supported by Jellyfin Web

Home Screen Manager requires neither an external API key nor either companion plugin for its native, manual-media, collection, library, history, page, navigation, and presentation features.

## Install

1. Open **Dashboard → Plugins → Repositories** in Jellyfin.
2. Add this repository manifest URL:

   ```text
   https://raw.githubusercontent.com/mp3li/Home-Screen-Sections-Manager-Jellyfin-Plugin/main/manifest.json
   ```

3. Refresh the catalog and open **Home Screen Manager**.
4. Select **Install** or **Update** for the newest compatible version.
5. Install and configure [Abyss](https://github.com/AumGupta/abyss-jellyfin), including its Spotlight files, by following the upstream Abyss installation guide.
6. Ensure JavaScript Injector is installed and enabled. File Transformation 2.5.11.0 is recommended for its Jellyfin 10.11.11 injection path.
7. Restart Jellyfin when prompted.
8. Open **Dashboard → Home Screen Manager** from the Dashboard sidebar.

Future versions use the same plugin GUID and repository entry, so normal releases appear as an **Update** on the existing plugin instead of as another plugin.

The published release ZIP contains only the compiled plugin DLL and [LICENSE](LICENSE). It doesn’t contain server configuration, page or section settings, user activity, Likes, logs, imported artwork, media paths, NFO files, or media. The third-party Abyss license is embedded in the compiled plugin assembly.

## How to Use This Plugin

Home Screen Manager has six dashboard tabs. The names below match the plugin exactly, and every tab description appears before its expandable control guide.

### Main Settings

Use this tab for additional Jellyfin Web behavior, per-user My List controls, library browsing improvements, detail-page additions, and explicit section maintenance.

<details>
<summary><strong>Click here to expand Main Settings content</strong></summary>

<br />

#### Refresh Home Screen and All Pages Sections Settings

Refresh your saved Home screen and all pages sections after changing media, tags, collections, libraries, or library names. Sections are refreshed one at a time, matching sources are reused, and large libraries pause briefly between lightweight ID batches so Jellyfin remains responsive. Rotating, seasonal, and user-activity sections update separately and don’t require this refresh.

- **Refresh Home Screen and All Pages Sections** starts the bounded all-pages refresh.

#### Remove from Continue Watching and Next Up Settings

Add an X button when you hover over items in Continue Watching and Next Up. Click the X to remove that item from the row.

- **Enable removal buttons** turns the X controls on or off.

#### My List Settings

Add a per-user My List page and heart buttons for adding or removing media from My List. Also choose whether to hide Favorites from the Home-screen top navigation.

- **Enable My List**
- **Hide Favorites**

#### Series Info Settings

Display season and episode totals on series and season pages. When runtime details are available, also show the estimated time playback will finish.

- **Enable enhanced series information**

#### Infinite Scroll Settings

Select the libraries where Jellyfin should automatically load more media as you approach the bottom of the library page.

- Select any available Jellyfin libraries.
- **Save Infinite Scroll Settings** saves the chosen library list.

#### Collections on Detail Page Settings

Show an **Also Part of These Collections** section on supported media detail pages.

- **Show collections on detail pages**

#### Enhanced Search Settings

Add grouped search modes for Movies and TV, Music, Books, and All Jellyfin media. This doesn’t include Jellyseerr features.

- **Enable enhanced search**

#### Bread Crumbing Settings

Show a clickable location trail in the upper-left header on supported media detail pages.

- **Enable bread crumbing**

#### Marquee Effect on Titles Settings

Choose whether long media titles slowly scroll on hover instead of remaining truncated.

- **Turn on marquee effect on titles** or **Turn off marquee effect on titles**
- **Marquee Speed Settings:** Extra Slow, Slow, Normal Speed, Fast, or Faster

Use **Save Main Settings** to save the tab’s toggle, radio, and speed settings. Infinite Scroll also has its own save button because its library selection is maintained separately.

</details>

### Customization Settings

Use this tab to manage the original Abyss controls exposed by the plugin and all additional Home Screen Manager color, logo, Media Bar, font, rounding, and Lite Mode options.

<details>
<summary><strong>Click here to expand Customization Settings content</strong></summary>

<br />

#### Accent Color Settings

Choose the shared Abyss accent color used by hover states, including top navigation text, play and resume buttons, and sidebar menu items.

- **Accent Color**

#### Top Navigation Color Settings

Customize the centered Home, Favorites, My List, and other page tabs.

- **Color Style:** Solid (Default), Vertical Gradient, Horizontal Gradient, or Center Gradient
- **First Color**
- **Second Color** for gradient styles

#### Top Navigation Selected Text Color Settings

Customize the text color of the currently selected Home, Favorites, My List, or other top-navigation tab when it isn’t hovered. Hovering continues to use the Accent Color.

- **Selected Text Color**

#### Play Button Color Settings

Customize Jellyfin play and resume buttons.

- **Color Style:** Solid (Default), Vertical Gradient, Horizontal Gradient, or Center Gradient
- **First Color**
- **Second Color** for gradient styles

#### Watched Progress Color Settings

Customize watched-progress bars and playback progress bar colors.

- **Color Style:** Solid (Default), Vertical Gradient, Horizontal Gradient, or Center Gradient
- **First Color**
- **Second Color** for gradient styles

#### Sidebar Icon Circle Color Settings

Customize the gradient or solid color used by the circles around sidebar icons. The smaller icons inside the circles use the Accent Color.

- **Color Style:** Solid (Default), Vertical Gradient, Horizontal Gradient, or Center Gradient
- **First Color**
- **Second Color** for gradient styles

#### My List Heart Color Settings

Customize the heart buttons used to add media to My List.

- **Color Style:** Solid (Default), Vertical Gradient, Horizontal Gradient, or Center Gradient
- **First Color**
- **Second Color** for gradient styles

#### Episode Count Pill Color Settings

Select the background color used for Abyss episode-count and indicator pills. Abyss uses dark gray by default.

- **Episode Count Pill Color**

#### Home Screen Logo Settings

Add a logo beside the menu button on Home. On other pages, the same logo replaces the upper-left Home icon while keeping its Home-button function.

- Import PNG, JPEG, WebP, or GIF artwork.
- **Remove Logo** clears the imported image.

#### Media Bar Timing Settings

Choose how many seconds each item remains visible before the Media Bar advances. Abyss uses 5 seconds by default.

- **Seconds Per Item:** 1–300

#### Media Bar Image Type Settings

Choose the Jellyfin image type used behind Media Bar items. Abyss Original keeps Abyss’s hybrid behavior: episodes try their own Primary image and then the series Backdrop, while other media tries its own Backdrop first. Named types force that image type first and use available fallbacks only when it can’t be loaded.

- **Image Type:** Abyss Original, Backdrop, Primary, Banner, or Thumbnail

#### Media Bar Slow Zoom Settings

Choose whether Media Bar background artwork slowly zooms while each item is displayed.

- **Turn on Media Bar slow zoom** or **Turn off Media Bar slow zoom**

#### Global Corner Rounding Settings

Choose how rounded corners appear throughout Abyss. Lower values make cards, buttons, menus, and other elements more square; higher values make them more rounded. Abyss uses 24 pixels by default.

- **Corner Rounding:** 0–64 px

#### Font Override Settings

Optionally use a different web font with Abyss. Enter the font stylesheet URL supplied by Google Fonts or another provider and the exact font-family name. Leave both blank to keep the theme’s normal font.

- **Font Stylesheet URL**
- **Font Family Name**

#### Lite Mode Settings

Turn Lite Mode on for lower-power mobile, TV, and embedded clients. It keeps Abyss colors, typography, spacing, and component styling while reducing blur, shadows, and entrance motion.

- **Enable Abyss Lite Mode**

Use **Save & Apply Customization Settings** to apply all customization controls while preserving unrelated Jellyfin Branding Custom CSS.

</details>

### Marquee Message Settings

Use this tab to create one server-wide scrolling announcement and control exactly where it appears, how it looks, and whether it stays visible while the page scrolls.

<details>
<summary><strong>Click here to expand Marquee Message Settings content</strong></summary>

<br />

#### Marquee Message Settings

Choose whether to enable or disable a custom Marquee Message. The message appears at the very top of the selected page or pages for every user.

- **Enable Marquee Message** or **Disable Marquee Message**

#### Marquee Message Page Visibility Settings

Select which existing Home-screen pages should display the Marquee Message. Home is selected by default, or choose Always Show to display it on every page except active playback.

- **Always Show**
- Any currently available Home, My List, Favorites, or custom page

#### Marquee Message Persistence Settings

Choose whether the Marquee Message scrolls away with the page or remains visible with Jellyfin’s top navigation while you scroll.

- **Scroll With Page** or **Keep Message Visible**

#### Marquee Message Content

Enter the server-wide message that should appear at the top of the selected page or pages.

- **Message**

#### Marquee Message Appearance Settings

Choose the message font, text and shadow colors, and the solid or gradient colors used by the message bar.

- **Message Font:** Import Message Font accepts TTF or OTF; **Remove Imported Font** returns to the default Abyss font.
- **Message Text Colors:** Font Color, Font Shadow Color, and **Remove Shadow**.
- **Message Bar Colors:** Solid (Default), Vertical Gradient, Horizontal Gradient, or Center Gradient, plus First Bar Color and Second Bar Color.

#### Marquee Message Speed Settings

Choose how quickly the message continuously scrolls across the Marquee Message bar.

- **Marquee Speed:** Extra Slow, Slow, Normal Speed, Fast, or Faster

Use **Save Marquee Message Settings** to save the complete message configuration.

</details>

### Create and Manage Top Rows

Use this tab to manage the Main Top Row and create targeted page or library navigation rows with their own content, ordering, visibility, persistence, artwork, and logo presentation.

<details>
<summary><strong>Click here to expand Create and Manage Top Rows content</strong></summary>

<br />

#### Existing Top Rows

This area shows the Main Top Row and every saved page or library Top Row. Main appears everywhere outside active playback unless an enabled targeted row overrides it. Each page or library can have only one targeted Top Row.

- Label colors: **Main Top Row Label Color**, **Applied Area Label Color**, **Override On Label Color**, and **Override Off Label Color**
- Actions: **Create Top Row**, **Edit Top Row**, **Delete Top Row**, **Undo Delete Top Row**, and **Copy + Paste Top Row**

#### Top Row Settings

Choose a name for the saved Top Row. The Main Top Row name is fixed because it is the server-wide default.

- **Top Row Name**

#### Top Row Application Settings

Assign a targeted Top Row to one Home-screen page or one Jellyfin library. A library assignment covers its landing, browse, and detail pages. Main instead applies everywhere unless an enabled targeted row overrides it.

- **Applied Area Type:** Home Screen Page or Jellyfin Library and Its Pages
- **Applied Area:** choose one currently available page or library
- **Override Main Top Row** or **Keep Override Off**

#### Enable or Disable Top Row Settings

Choose whether this Top Row section is active.

- **Enable Top Row** or **Disable Top Row**

#### Top Row Persistence Settings

Choose whether the Top Row scrolls away with the page or remains visible with Jellyfin’s top navigation.

- **Scroll With Page** or **Keep Top Row Visible**

#### Logo Only Mode Shadow Settings

Choose the very slight, partially transparent shadow behind Top Row logos when Display Logos Only is enabled. This can keep dark logos visible without adding a background or outline.

- **Logo Shadow Color**
- **Remove Shadow**

#### Top Row Section Content

Choose what kind of visual navigation belongs in the row, select its items, and drag the selected items into the desired order.

- **Collections in a Row** — Display selected collections as navigation art.
- **Libraries in a Row** — Display selected Jellyfin libraries as navigation art.
- **Genres in a Row** — Display genres from the assigned Jellyfin library as navigation art; available only for a library-targeted Top Row.
- **Select Top Row Content** chooses the available collections, libraries, or genres.
- **Selected Top Row Content Order** is the drag-and-drop selected-item list.

#### Section Content Order Settings

Choose the order for selected Top Row navigation items.

- **Content Order:** Manual (Drag to Choose Exact Order), Title (A–Z), or Title (Z–A)

#### Section Art Appearance Settings

Top Row art is always Extra Small, never uses poster/tall rectangle art, and doesn’t show media text or a section name.

- **Art Size:** Extra Small
- **Art Type:** Automatic, Primary, Art, Backdrop, Banner, Logo, Thumb, Disc, Box, Box Rear, Screenshot, Menu, or Chapter
- **Art Shape:** Wide Rectangle, Square, or Circle
- **Display Logos Only:** currently uses logo-based art applied through Collection Manager

Use **Add Top Row** when creating or the save/refresh action shown while editing.

</details>

### Create and Manage Home Screen Sections

Use this tab to manage every native and plugin section on Home, My List, and custom pages, then create custom sections from any of the 26 available section types.

<details>
<summary><strong>Click here to expand Create and Manage Home Screen Sections content</strong></summary>

<br />

#### Existing Home Screen Sections

Choose a Home Screen Page to see its complete ordered layout. Jellyfin rows are labeled separately from Home Screen Manager rows and Media Bars. Plugin sections can be fully edited; native sections expose their supported appearance and maximum-item controls.

- Label colors: **Jellyfin Label Color**, **Home Screen Manager Label Color**, and **Media Bar Label Color**
- **Home Screen Page:** Home, My List when enabled, or any custom page
- Per-section **Show** control and drag-and-drop ordering
- Actions: **Create Section**, **Edit Section**, **Delete Section**, **Undo Delete Section**, **Move Section**, **Copy + Paste Section**, and **Refresh Section**
- **Move Section To:** select a destination Home Screen Page, then Move Section or Close.
- **Copy + Paste Section To:** select a destination Home Screen Page, then Copy + Paste Section or Close.

#### Media Bar Section Settings

Specify whether this plugin section should also supply a Media Bar.

- **Yes** or **No**

#### New Section Type Settings

Select which type of section to create. All 26 names and exact descriptions are listed in [Section Types](#section-types). Existing choices remain available when creating another section of the same type.

- Choose one section type.
- **Select Content** opens the relevant editor immediately; libraries, collections, or metadata catalogs continue loading only when the chosen type needs them.

#### Type-Specific Content Sections

The next section changes according to the selected type:

- **My List Content Section** and **Watch Again:** no content selection; each resolves from the signed-in user.
- **Continue Watching**, **Continue Listening**, **Continue Reading**, **Continue Watching & Listening**, and **Continue Reading & Listening:** choose the Jellyfin libraries allowed to supply resumable content; existing sections default to every library.
- **Songs Recently Listened To**, **Artists Recently Listened To**, and **Albums Recently Listened To:** no content selection; each resolves separately for the signed-in user.
- **Select Media:** Manual Content opens Jellyfin libraries individually, with search, Previous Page, Select This Page, Clear This Page, Next Page, and 16-item pagination.
- **Select Collection for Section:** choose one collection for Individual Collection Content or multiple collections for Multiple Collection Content and Collections in a Row.
- **Select Metadata Tags:** choose one tag for Individual Tag Content, combine any selected tags for Multiple Tag Content, or require every selected tag for Muilti-Match Tag Collection Content. Tag types and values come from the latest available scan and can be searched.
- **Selected Libraries:** choose one library for Library Content or Recently Added in a Library; choose one or more for Multiple Library Content or Libraries in a Row. Multiple-library editors also offer Select All and Select None.
- **Select Sources for Section Drafts:** Rotating Sections, Seasonal Sections, Top 5-100, and Crunchyroll Top 5-100 can use selected collections, libraries, and metadata tags. Each source picker expands independently.
- **Rotating Section Drafts:** each selected source becomes a draft; drag drafts to set their rotation order and edit each draft title.
- **Rotation Timing Settings:** set **Rotate Every** from 1 to 525600 and choose Hours, Days, or Weeks.
- **Seasonal Section Drafts:** each selected source becomes a draft; set its recurring start month/day and end month/day, then drag drafts to set priority when date windows overlap.
- **Top 5-100 Settings:** choose Display Top 5, 10, 20, 30, 40, 50, 75, or 100.
- **Crunchyroll Top 5-100 Settings:** choose Display Top 5, 10, 20, 30, 40, 50, 75, or 100. **Crunchyroll Ranking** can use Upvotes / Downvotes, Overall Rating, or Star Rating(s). Upvotes / Downvotes reads tags such as `crunchyrollratings: 15.2k upvotes / 96 downvotes`; Overall Rating and Star Rating(s) read tags such as `crunchyrollrating: 4.8 / 5 from 52,354 ratings`. Star Rating(s) provides independent 1-star through 5-star checkboxes; selecting more than one includes media matching any selected category. Categories use the whole-number portion, so 4.8 counts as 4 stars. Overall Rating and Star Rating(s) can be ordered Highest to Lowest or Lowest to Highest. Select sources first; only **Save and Move On** checks that selected content’s required Crunchyroll rating tags. Unrated or nonmatching items are excluded, and an entirely unmatched selection stops with an explanation instead of creating an empty section.
- **Top Section Draft:** combines media from selected collections and libraries with media matching selected tags, then lets you edit the draft title.
- **Other Users Activity Settings:** choose Movies, Series, Music/Audiobooks, or Books and a Maximum Media Items value from 1 to 100. User identities aren’t displayed.

#### Content In Section

Preview the selected content that will be displayed. Saved previews hydrate in bounded ID batches rather than one oversized request.

- **Save and Move On** saves the content selection and reveals ordering and appearance settings.

#### Section Content Order Settings

Choose how content appears and, for most custom types, the maximum number of media items. Rating ordering requires supported ratings in the media tags.

- **Content Order:** Title (A–Z), Title (Z–A), Release Date (Oldest First), Release Date (Newest First), Recently Added (Newest First), Recently Added (Oldest First), Rating (Highest First), Random (New Order on Every Reload), or Manual (Drag to Choose Exact Order)
- Watch Again additionally offers **Least Recently Completed** and **Most Recently Completed**.
- Other automatic user types additionally offer **Least Recent First** and **Most Recent First**.
- **Maximum Media in Section:** leave blank for All on custom sections or Jellyfin Default on native sections; larger values are loaded in 16-item batches while browsing.
- Manual ordering opens a drag-and-drop list for the exact item order.

#### Section Art Appearance Settings

Choose the regular row’s image size, Jellyfin image type, shape, and text visibility. If the section is also a Media Bar, these controls affect its matching regular row below, not the full-width Media Bar.

- **Art Size:** Extra Small, Small, Medium (Jellyfin Default), Large, or Extra Large
- **Art Type:** Default, Poster, Primary, Art, Backdrop, Banner, Logo, Thumb, Disc, Box, Box Rear, Screenshot, Menu, or Chapter
- **Art Shape:** Poster / Tall Rectangle, Book / Audiobook, Wide Rectangle, Square, or Circle
- **Show text under the art** displays the media name and year.
- **Show section name** controls the row heading.

#### Numbering Settings

Top 5-100 and Crunchyroll Top 5-100 sections can add large visible ranking numbers.

- Visible numbers: **Yes** or **No**
- **Color Style:** Solid (Default), Vertical Gradient, Horizontal Gradient, or Center Gradient
- **First Color**, **Second Color**, **Shadow Color**, and **Remove Shadow**
- **Import Numbering Font:** TTF or OTF, with an option to remove the imported font

#### Top Section Content Warning

If a Top 5-100 or Crunchyroll Top 5-100 value exceeds the number of supplied media items, the warning explains the mismatch so the section can be renamed or its sources adjusted.

- **Add Section Anyways** accepts the smaller available result.
- **Close** returns to the editor without adding it.

Finish with **Add Section to [Page] Page** when creating or **Refresh Section** when editing.

</details>

### Create and Manage Home Screen Pages

Use this tab to control the top-navigation page order and create the complete custom destinations that hold their own sections and Media Bars.

<details>
<summary><strong>Click here to expand Create and Manage Home Screen Pages content</strong></summary>

<br />

#### Existing Home Screen Pages

See every current top-navigation Home Screen Page. Jellyfin pages and Home Screen Manager pages have separate labels. Native Jellyfin pages can’t be renamed here, but their sections can still be managed from the Sections tab. Home remains locked first.

- Label colors: **Jellyfin Label Color**, **Home Screen Manager Label Color**, and **Media Bar Label Color**
- Per-page **Show** control and drag-and-drop ordering
- Actions: **Create Page**, **Edit Page**, **Delete Page**, and **Undo Delete Page**

#### Page Settings

Select the title shown for a plugin-created page.

- **Page Title**
- **Add/Refresh Page Home Screen Page** saves a new title or refreshes the edited page.

After saving, open **Create and Manage Home Screen Sections**, select the page in **Home Screen Page**, and add or arrange its sections. More than four visible custom pages automatically use the arrowed, horizontally scrollable top-navigation layout.

</details>

## Compatibility and Limits

- Target server and Web client: **Jellyfin 10.11.11**.
- Target ABI: **10.11.11.0**.
- Runtime framework: **net9.0**.
- The dashboard and write endpoints require an elevated Jellyfin administrator.
- Server/plugin APIs are official target-version contracts. Custom rows, pages, Top Rows, Media Bars, and other browser presentation features are tested, version-pinned Jellyfin Web integrations; Jellyfin doesn’t provide one official custom-home-row plugin API.
- The browser loader is additive and doesn’t overwrite Jellyfin Web files.
- Metadata-tag sections depend on the latest available Collection Manager catalog and preview data.
- Top ranking depends on a supported IMDb rating tag or Jellyfin Community Rating already attached to the media.
- Shared activity doesn’t display user identities and remains limited by the requesting user’s accessible media.
- Static source rules are snapshots until explicitly refreshed; dynamic user, rotation, season, recently added, and activity sections resolve according to their own rules.
- Remote performance still depends on the Jellyfin server, reverse proxy, storage, upload connection, library size, and client.

## Companion Plugins

- [Media Tagging Manager](https://github.com/mp3li/Media-Tagging-Manager-Jellyfin-Plugin) can enrich Movies and Series with provider, network, genre, keyword, collection, people, production, rating, classification, and language metadata.
- [Collection Manager](https://github.com/mp3li/Collection-Manager-Jellyfin-Plugin) can turn existing Jellyfin, NFO, or Media Tagging Manager metadata into native collections and coordinated collection artwork and logos.

Home Screen Manager remains usable without either companion for its native, manual-media, collection, library, history, page, navigation, and presentation features.

## Documentation

- [Changelog](Documentation/CHANGELOG.md)

## License

Home Screen Manager is available under the [Home Screen Manager Noncommercial License 1.0](LICENSE). Read it before redistributing, modifying, or using the project outside your own server. The adapted Abyss portion retains its original MIT copyright and license in [Third-Party Notices](THIRD-PARTY-NOTICES.md), the source tree, and the compiled plugin assembly.
