# Home Screen Sections Manager

For instructions and more information, check out the repo [here](https://github.com/mp3li/Home-Screen-Sections-Manager-Jellyfin-Plugin). To stay up to date with more of the dev's work, check out their Patreon [here](https://www.patreon.com/cw/mp3li).

## Current dashboard tabs

- Main Settings
- Create Home Screen Sections
- Manage Home Screen Sections

These tabs are intentionally empty while the supported Jellyfin 10.11.11
workflow for each section is designed and verified.

## Requirements

- Jellyfin Server 10.11.11
- Administrator access
- .NET SDK 9.0 to build from source

## Build

```bash
dotnet build "Home Screen Sections Manager/HomeScreenSectionsManager.csproj" --configuration Release
```

## License

Home Screen Sections Manager is available under the [Home Screen Sections
Manager Noncommercial License 1.0](LICENSE).
