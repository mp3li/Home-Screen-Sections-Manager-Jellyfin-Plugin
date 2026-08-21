# Performance and Architecture

## Project phase

At first, Home Screen Manager was trying to establish whether its ideas were
possible at all: custom sections mixed with native rows, custom pages, Top Rows,
Media Bars, per-user My List, automatic sections, and companion-plugin
integration without replacing Jellyfin Web files.

Those capabilities now exist. The current phase is load-time and efficiency
engineering. New work must preserve the established feature set while reducing
request count, request payloads, eager image downloads, repeated computation,
and competition with native navigation or playback—especially for remote users.

## Support boundary

| Layer | Status for this project |
| --- | --- |
| Jellyfin server/plugin APIs | Compiled against `Jellyfin.Controller` and `Jellyfin.Model` 10.11.11 on `net9.0`; authenticated Items, Resume, image, display-preference, session, and user-data routes are target-version contracts. |
| Jellyfin Web integration | Custom rows use the 10.11.11 Home container, card classes, registered custom elements, routes, and view lifecycle. These are version-pinned implementation contracts, not an official custom-row plugin API. |
| Browser primitives | `IntersectionObserver`, `AbortController`, `fetch`, and local storage are standard browser facilities used around Jellyfin's APIs. |
| Companion plugins | JavaScript Injector/File Transformation provide the loader path; Custom Tabs, Collection Manager, and Abyss own their respective optional integration contracts. |
| KefinTweaks | Behavioral and architectural reference only. It is not maintained by Jellyfin, and its current README explicitly calls Jellyfin 10.11.x untested and unsupported. |

The accurate statement is therefore not “everything is officially supported by
Jellyfin.” The server calls are pinned and supported for Jellyfin 10.11.11; the
custom browser UI is an additive, tested integration with that exact Jellyfin
Web version. Installed-server testing remains the final evidence boundary.

## KefinTweaks comparison

Audited reference: KefinTweaks revision
[`290b36f7bfb7587aa12667895ce6395f41d02c73`](https://github.com/ranaldsgift/KefinTweaks/tree/290b36f7bfb7587aa12667895ce6395f41d02c73).
The target-version comparison uses Jellyfin Web's
[`HomeSectionType`](https://github.com/jellyfin/jellyfin-web/blob/v10.11.11/src/types/homeSectionType.ts)
and
[`recentlyAdded`](https://github.com/jellyfin/jellyfin-web/blob/v10.11.11/src/components/homesections/sections/recentlyAdded.ts)
implementations at tag `v10.11.11`.

| Concern | KefinTweaks reference | Home Screen Manager current architecture |
| --- | --- | --- |
| Placement | Appends additive sections to the visible `.homeSectionsContainer` and marks a container as rendered. | Appends plugin-owned sections to the active 10.11.11 Home/custom-page container without replacing native rows. |
| Normal row size | Defaults custom sections to 16 items and asks the server to sort/filter before returning that bounded result. | Sends and hydrates 16 items initially, then requests another 16 only when horizontal scrolling approaches the end. |
| Initial scheduling | Starts configured custom-section families in parallel with `Promise.all`. | Starts only near-viewport rows, orders them by vertical position, and permits at most two plugin section requests globally and one per page. This is intentionally more conservative for remote servers. |
| Short-lived query reuse | Uses an in-memory API-helper cache with a five-minute default TTL for matching item-query URLs. | Reuses in-flight work and maintains per-user/per-section caches; Watch Again uses five minutes and emergency Top recovery six hours. |
| Expensive discovery data | Uses local storage and IndexedDB, including long-lived caches and background preloading for expensive discovery datasets. | Avoids browser-wide discovery scans in ordinary rows, moves My List selection to one server query, and returns only bounded ID pages to the browser. |
| Card rendering | Builds Jellyfin-shaped cards and currently assigns card background images during construction. | Builds the same native-shaped card contract but keeps image URLs inert until a shared viewport observer promotes them. |
| Server component | Client-only front-end enhancement. | Real Jellyfin plugin stores server-wide definitions and supplies authenticated paging/helper endpoints; the injected client remains responsible for Web rendering. |

Home Screen Manager should learn from KefinTweaks' successful small payloads,
server-side filtering, caching, and one-time container lifecycle. It should not
copy eager parallelism blindly: this project has more server-wide sections,
Media Bars, saved item sets, and remote-user evidence showing that uncontrolled
work can starve native navigation and playback.

## Current loading rules

1. A custom page may use at most one section request at a time, and the plugin
   may use at most two section requests across visible pages.
2. Offscreen rows and explicit Media Bars do not query until they approach the
   viewport. Leaving a page aborts its active request.
3. A normal row hydrates 16 items. Further 16-item pages load only near the end
   of horizontal scrolling. A user's larger Maximum Items choice is the row's
   ceiling, not its initial payload: for example, 80 means up to five 16-item
   pages as the user moves through that row.
4. Card image URLs remain inert until near the viewport. Section names remain
   normal text headings and do not request or display backdrop artwork.
5. The initial settings response includes only 16 saved IDs per section. The
   rest are available through an authenticated, bounded endpoint.
6. My List uses one user-scoped server query and returns one bounded ID page,
   rather than one recursive browser query per library.
7. Media Bars reuse matching row work, and expensive history/art discovery is
   bounded and cached.

## Dashboard editing rules

1. **Select Content** renders the section-specific editor shell immediately.
   Library and collection catalogs fill independently afterward; neither one
   blocks the other or replaces the editor when it is slow or unavailable.
2. Reopening a saved section never hydrates its complete item list before the
   editor can open. Only the visible 16-item preview page is queried.
3. Dashboard ID hydration uses at most 16 IDs per Items request. This keeps GET
   URLs bounded for remote access and reverse proxies instead of grouping 100
   long Jellyfin IDs into one request that may be rejected as HTTP 400.
4. Manual library browsing queries the server 16 items at a time, including
   server-side search and total-count paging. Opening a large library no longer
   recursively downloads the whole library.
5. Lazy preview data is separate from saved selection state. An unchanged save
   retains every saved ID and its order, including IDs on preview pages that
   were never opened. Full manual-order labels are hydrated only through the
   explicit **Load all selected items for reordering** action.
6. Ordinary collection/library expansion requests only lightweight item and
   image-shape data. Rating, tag, sort, and series fields are reserved for Top
   ranking, where those fields are actually required.

## Evidence boundary

Syntax checks, Release compilation, and the browser contracts prove source and
fixture behavior, including a deliberately unresolved library-catalog request
while a 40-item saved section opens and pages in 16-ID requests. They do not
prove performance on the installed Jellyfin
server, its reverse proxy, its storage, or its upload connection. The real
acceptance test is a clean install of the exact package on Jellyfin 10.11.11,
measuring a cold remote page, a warm remote page, navigation during loading, and
playback while several custom sections exist.
