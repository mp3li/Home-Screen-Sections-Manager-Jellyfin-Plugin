# Changelog

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
