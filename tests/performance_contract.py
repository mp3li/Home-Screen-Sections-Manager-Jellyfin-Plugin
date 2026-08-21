from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CLIENT = (ROOT / "Home Screen Sections Manager" / "Web" / "homeScreenClient.js").read_text()
CLIENT_CSS = (ROOT / "Home Screen Sections Manager" / "Web" / "homeScreenClient.css").read_text()
CLIENT_CONTROLLER = (ROOT / "Home Screen Sections Manager" / "Api" / "HomeScreenClientController.cs").read_text()
MY_LIST_CONTROLLER = (ROOT / "Home Screen Sections Manager" / "Api" / "MyListItemsController.cs").read_text()
DASHBOARD = (ROOT / "Home Screen Sections Manager" / "Configuration" / "configPage.html").read_text()


def run() -> None:
    # Cold-page work must be visibility-driven and retain enough placeholder
    # height that off-screen rows do not all enter the observer margin at once.
    assert "queueSectionLoadWhenNear(state)" in CLIENT
    assert "rootMargin:'75% 0px 75% 0px'" in CLIENT
    assert '.hssm-client-section[data-hssm-loading="true"]' in CLIENT_CSS

    # Card artwork URLs must remain inert until the shared observer promotes
    # them. The card builder must not emit an eager background-image style.
    assert 'data-hssm-image-url="' in CLIENT
    assert "function observeCardArtwork(scope)" in CLIENT
    card_builder = CLIENT[CLIENT.index("function card(item, section, rank)"):CLIENT.index("function sectionNode(")]
    assert "background-image:url" not in card_builder

    # Saved catalogs and My List are server-paged rather than fanned out from
    # every browser across every library.
    assert "InitialSectionItemIdLimit = 16" in CLIENT_CONTROLLER
    assert "var SECTION_PAGE_SIZE = 16" in CLIENT
    assert 'data-scrollevent="true"' in CLIENT
    assert "scroller.addScrollEventListener(onSectionScroll" in CLIENT
    assert "scroller.getScrollPosition()" in CLIENT
    assert "scroller.getScrollSize()" in CLIENT
    assert 'HttpGet("sections/{sectionId}/item-ids")' in CLIENT_CONTROLLER
    assert 'HttpGet("my-list-item-ids")' in MY_LIST_CONTROLLER
    assert "IsLiked = true" in MY_LIST_CONTROLLER
    assert "loadLikedItemsPage(start, limit" in CLIENT

    # The old 12,000-record Watch Again scan must not return.
    assert "Limit:2000" not in CLIENT
    assert "Limit:10000" not in CLIENT
    assert "episodeHistoryLimit" in CLIENT

    # Music-artist Media Bars need only a small album-art candidate window,
    # never the former 1,000-album metadata response.
    assert "Limit:1000" not in CLIENT
    assert "artistAlbumLimit" in CLIENT

    # Section names remain normal text headings; lazy image work belongs to
    # media cards and must not turn headings into backdrop banners.
    assert 'data-hssm-image-overlay="header"' not in CLIENT
    assert ".hssm-section-title-with-art" not in CLIENT_CSS

    # The section editor must render before its catalogs settle, and both saved
    # preview hydration and manual library browsing must remain 16-item work.
    assert "setupData().then" not in DASHBOARD
    assert "for (let index = 0; index < values.length; index += 16)" in DASHBOARD
    assert "index += 100" not in DASHBOARD
    assert "function loadManualPage(id)" in DASHBOARD
    assert "StartIndex:(Math.max(1, view.page) - 1) * 16, Limit:16" in DASHBOARD
    assert "renderIdBackedContent(content, state.savedItemIds" in DASHBOARD

    # A full all-pages refresh must be single-flight, reuse repeated source
    # scans, omit image/count payload work, and breathe between large pages.
    assert "HSSMRefreshSavedSectionsInFlight" in DASHBOARD
    assert "function cachedRefreshRequest(key, request)" in DASHBOARD
    assert "EnableImages:false, EnableTotalRecordCount:false" in DASHBOARD
    assert "refreshBreather(60)" in DASHBOARD
    assert "loadRefreshParentItems(sourceId, excludeNavigationFolders, '')" in DASHBOARD


if __name__ == "__main__":
    run()
    print("performance contract passed")
