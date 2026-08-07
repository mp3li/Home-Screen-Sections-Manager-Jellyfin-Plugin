<p align="center">
  <img src="Assets/Branding/home-screen-sections-manager-icon.png" alt="Home Screen Manager icon: retro television with an artist paint palette and paintbrush" width="180" />
</p>

<h1 align="center">Home Screen Manager</h1>

For instructions and more information, check out the repo [here](https://github.com/mp3li/Home-Screen-Sections-Manager-Jellyfin-Plugin). To stay up to date with more of the dev's work, check out their Patreon [here](https://www.patreon.com/cw/mp3li).

<p align="center"><strong>Early testing build:</strong> this release lets you design, order, save, and add custom sections to Jellyfin Web's home screen while keeping Jellyfin's native home rows in the same hybrid layout.</p>

## Current dashboard tabs

- Main Settings
- Customization Settings
- Create and Manage Home Screen Sections

**Main Settings** controls automatic rule refresh, removal buttons for Continue
Watching and Next Up, the per-user My List, series and season information,
selected-library infinite scrolling, collections on detail pages, enhanced
Jellyfin-only search, and header breadcrumbs.

**Customization Settings** saves and applies Abyss through Jellyfin's normal
Custom CSS branding configuration. In addition to Abyss's documented global
corner radius, indicator pill, optional font, and Lite Mode settings, it splits
the shared Abyss hover accent, top navigation, play buttons, watched progress,
sidebar icons, and My List hearts into explicit controls. It also supplies the Home
logo, media-bar timing, and media-bar image type.

**Create and Manage Home Screen Sections** shows the current ten-slot
Jellyfin home section arrangement together with saved plugin sections. Jellyfin and
plugin rows have separately configurable label colors. One row can be selected at a
time; plugin rows can be edited or deleted; and every row can be dragged. The
first row receives the **Media Bar** label and supplies the media shown in the
top bar, whether that row came from Jellyfin or this plugin.

The current section types are Manual Content, individual or multiple collection
content, multiple collections in a row, individual or combined tags,
multi-match tags, individual or multiple library content, and libraries in a
row. The media, collection, metadata-tag, and library pickers reuse the same
interface and preview patterns as Collection Manager. **Save and Move On**
stores the current definition and reveals **Section Content Order Settings**.
Each section can be ordered by title, release date, date added, rating, or a
text-only manual list that can be dragged into the exact desired order.
**Section Art Appearance Settings** then controls Extra Small through Extra
Large sizing, official Jellyfin image types, poster/wide/square/circle shapes,
and whether the media name and year appear beneath the art. **Add Section to
Home Screen** saves these choices and enables the section in Jellyfin Web.

Home Screen Manager uses a credited, MIT-licensed adaptation of Abyss's
spotlight logic together with the installed Abyss spotlight stylesheet. This
keeps Abyss's media-bar appearance while allowing the first draggable home row,
saved timing, and selected Backdrop, Primary, Banner, or Thumbnail image type to
drive the bar. The source row remains visible as a normal row immediately below
the media bar. Saved
collection and library sections are read live from Jellyfin. When automatic
refresh is enabled, saved tag rules are refreshed through Collection Manager's
existing metadata preview routes.

The uploaded Home logo remains present throughout Jellyfin Web, including
breadcrumbed detail pages, and is hidden on playback screens. It always retains
Home navigation behavior.

My List intentionally uses Jellyfin's existing per-user Likes field—the same
working storage path used by the behavioral reference—rather than creating a
second watchlist database.

Custom rows are loaded through the same JavaScript Injector configuration path
used by KefinTweaks. Home Screen Manager creates or updates only its named
loader entry and preserves every other Injector script and setting. The plugin
does not overwrite Jellyfin Web files.

## Requirements

- Jellyfin Server 10.11.11
- Administrator access
- [Abyss](https://github.com/AumGupta/abyss-jellyfin)
- [Collection Manager](https://github.com/mp3li/Collection-Manager-Jellyfin-Plugin)
- [JavaScript Injector](https://github.com/n00bcodr/Jellyfin-JavaScript-Injector)
- [File Transformation 2.5.11.0](https://github.com/IAmParadox27/jellyfin-plugin-file-transformation) is recommended for JavaScript Injector on Jellyfin 10.11.11
- .NET SDK 9.0 to build from source

## Install this testing build

1. Open **Dashboard → Plugins → Repositories** in Jellyfin.
2. Add this repository manifest URL:

   ```text
   https://raw.githubusercontent.com/mp3li/Home-Screen-Sections-Manager-Jellyfin-Plugin/main/manifest.json
   ```

3. Refresh the catalog and install the newest **Home Screen Manager**
   testing version.
4. Install **JavaScript Injector** if it is not already installed.
5. Install **File Transformation 2.5.11.0**, the catalog release targeting
   Jellyfin 10.11.11, for JavaScript Injector's recommended non-destructive
   injection path.
6. Restart Jellyfin, then open **Dashboard → Home Screen Manager**.

## Build from source

```bash
dotnet build "Home Screen Sections Manager/HomeScreenSectionsManager.csproj" --configuration Release
```

## License

Home Screen Manager is available under the [Home Screen Manager
Noncommercial License 1.0](LICENSE). The adapted Abyss portion retains its
original MIT copyright and license in [Third-Party Notices](THIRD-PARTY-NOTICES.md).
