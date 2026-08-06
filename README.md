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

**Main Settings** remains intentionally blank. **Customization Settings** saves
and applies the Abyss theme's supported accent, global corner radius,
indicator-pill color, optional font, and Lite Mode settings through Jellyfin's normal Custom CSS branding configuration.

**Create and Manage Home Screen Sections** shows the current ten-slot
Jellyfin home section arrangement together with saved plugin sections. Jellyfin and
plugin rows have separately configurable label colors. One row can be selected at a
time; plugin rows can be edited or deleted; all rows can be dragged except
Continue Watching, which remains the top Abyss media bar.

The current section types are Manual Content, individual or multiple collection
content, multiple collections in a row, individual or combined tags,
multi-match tags, individual or multiple library content, and libraries in a
row. The media, collection, metadata-tag, and library pickers reuse the same
interface and preview patterns as Collection Manager. **Save and Move On**
stores the current definition and reveals **Section Content Order Settings**.
Each section can be ordered by title, release date, date added, rating, or a
text-only manual list that can be dragged into the exact desired order. **Add Section to Home Screen** saves the
selected order and enables the section in Jellyfin Web.

Custom rows are added through File Transformation's non-destructive served-web
transformation. The plugin does not overwrite Jellyfin Web files.

## Requirements

- Jellyfin Server 10.11.11
- Administrator access
- [Abyss](https://github.com/AumGupta/abyss-jellyfin)
- [Collection Manager](https://github.com/mp3li/Collection-Manager-Jellyfin-Plugin)
- [File Transformation](https://github.com/IAmParadox27/jellyfin-plugin-file-transformation)
- .NET SDK 9.0 to build from source

## Install this testing build

1. Open **Dashboard → Plugins → Repositories** in Jellyfin.
2. Add this repository manifest URL:

   ```text
   https://raw.githubusercontent.com/mp3li/Home-Screen-Sections-Manager-Jellyfin-Plugin/main/manifest.json
   ```

3. Refresh the catalog and install the newest **Home Screen Manager**
   testing version.
4. Install **File Transformation 2.5.11.0**, the catalog release targeting
   Jellyfin 10.11.11, if it is not already installed.
5. Restart Jellyfin, then open **Dashboard → Home Screen Manager**.

## Build from source

```bash
dotnet build "Home Screen Sections Manager/HomeScreenSectionsManager.csproj" --configuration Release
```

## License

Home Screen Manager is available under the [Home Screen Manager
Noncommercial License 1.0](LICENSE).
