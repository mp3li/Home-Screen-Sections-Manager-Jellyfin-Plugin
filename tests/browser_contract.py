from __future__ import annotations

import json
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]
CLIENT = ROOT / "Home Screen Sections Manager" / "Web" / "homeScreenClient.js"
CLIENT_CSS = ROOT / "Home Screen Sections Manager" / "Web" / "homeScreenClient.css"
MEDIA_BAR = ROOT / "Home Screen Sections Manager" / "Web" / "mediaBar.html"


def base_item(item_id: str, name: str, item_type: str = "Movie") -> dict:
    return {
        "Id": item_id,
        "Name": name,
        "Type": item_type,
        "ProductionYear": 2026,
        "ImageTags": {"Primary": "primary-tag", "Thumb": "thumb-tag"},
        "BackdropImageTags": ["backdrop-tag"],
        "UserData": {"Likes": True},
    }


def run() -> None:
    settings = {
        "Sections": [
            {"Id": "manager-home-top", "Name": "Top 10", "PageId": "home", "Type": "top-10-50", "ItemIds": ["resume-one", "resume-two"], "DisplayTopCount": 10, "IsApplied": True, "IsVisible": True, "IsMediaBar": False},
            {"Id": "manager-home-test", "Name": "Test Section", "PageId": "home", "Type": "manual-content", "ItemIds": ["resume-two"], "IsApplied": True, "IsVisible": True, "IsMediaBar": False},
            {"Id": "manager-movies-one", "Name": "Movie Picks", "PageId": "manager-page-movies", "Type": "manual-content", "ItemIds": ["resume-one"], "IsApplied": True, "IsVisible": True, "IsMediaBar": True},
            {"Id": "manager-movies-two", "Name": "More Movies", "PageId": "manager-page-movies", "Type": "manual-content", "ItemIds": ["resume-two"], "IsApplied": True, "IsVisible": True, "IsMediaBar": True},
            {"Id": "manager-movies-hidden", "Name": "Saved for Later", "PageId": "manager-page-movies", "Type": "manual-content", "ItemIds": ["liked-one"], "IsApplied": True, "IsVisible": False, "IsMediaBar": False},
            {"Id": "my-list-content", "Name": "Added to My List", "PageId": "my-list", "Type": "my-list-content", "ItemIds": [], "IsApplied": True, "IsVisible": True, "IsMediaBar": True, "ArtShape": "circle"},
        ],
        "SectionOrder": ["jellyfin-0-resume", "manager-home-top", "manager-home-test"],
        "Pages": [{"Id": "my-list", "Name": "My List"}, {"Id": "manager-page-movies", "Name": "Movies"}],
        "PageOrder": ["home", "favorites", "my-list", "manager-page-movies"],
        "PageLayouts": [
            {"PageId": "home", "SectionOrder": ["jellyfin-0-resume", "manager-home-top", "manager-home-test"]},
            {"PageId": "manager-page-movies", "SectionOrder": ["manager-movies-one", "manager-movies-two", "hidden:manager-movies-hidden"]},
            {"PageId": "my-list", "SectionOrder": ["my-list-content"]},
        ],
        "EnableMyList": True,
        "HideFavorites": False,
        "MediaBarIntervalSeconds": 1,
        "MediaBarImageType": "primary",
    }
    resume = base_item("resume-one", "Resume One")
    resume_two = base_item("resume-two", "Resume Two")
    liked = base_item("liked-one", "Liked One")
    liked["ImageTags"]["Logo"] = "logo-tag"
    requests: list[str] = []
    page_errors: list[str] = []

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        page.on("pageerror", lambda error: page_errors.append(str(error)))

        def route_handler(route):
            url = urlparse(route.request.url)
            requests.append(route.request.url)
            path = url.path
            query = parse_qs(url.query)
            if path.endswith("/client-settings"):
                route.fulfill(status=200, content_type="application/json", body=json.dumps(settings))
            elif path.endswith("/Users/user/Views"):
                route.fulfill(status=200, content_type="application/json", body=json.dumps({"Items": [{"Id": "library-one", "Name": "Movies", "CollectionType": "movies"}]}))
            elif path.endswith("/Users/user/Items/Resume"):
                route.fulfill(status=200, content_type="application/json", body=json.dumps({"Items": [resume, resume_two]}))
            elif path.endswith("/Users/user/Items"):
                if query.get("Filters") == ["Likes"] and query.get("ParentId") == ["library-one"]:
                    route.fulfill(status=200, content_type="application/json", body=json.dumps({"Items": [liked]}))
                elif query.get("Ids"):
                    route.fulfill(status=200, content_type="application/json", body=json.dumps({"Items": [resume, resume_two]}))
                else:
                    route.fulfill(status=200, content_type="application/json", body=json.dumps({"Items": []}))
            elif path.endswith("/DisplayPreferences/usersettings"):
                route.fulfill(status=200, content_type="application/json", body=json.dumps({"CustomPrefs": {"homesection0": "resume"}}))
            elif path.endswith("/media-bar.html"):
                route.fulfill(status=200, content_type="text/html", body=MEDIA_BAR.read_text().replace("__HSSM_MEDIA_BAR_INTERVAL__", "1").replace("__HSSM_MEDIA_BAR_IMAGE_TYPE__", "primary"))
            elif "/Items/" in path and "/Images/" in path:
                route.fulfill(status=200, content_type="image/svg+xml", body='<svg xmlns="http://www.w3.org/2000/svg" width="32" height="18"><rect width="32" height="18" fill="blue"/></svg>')
            elif path.endswith("/ui/spotlight.css"):
                route.fulfill(status=200, content_type="text/css", body="body{margin:0;background:#000;color:#fff}")
            else:
                route.fulfill(status=200, content_type="application/json", body="{}")

        page.route("**/*", route_handler)
        page.goto("http://jellyfin.test/web/#/home")
        page.set_content(
            """
            <html><head></head><body>
              <header class="skinHeader"><div class="headerLeft"></div><div class="headerTabs">
                <div is="emby-tabs" class="tabs-viewmenubar" data-index="0"><div class="emby-tabs-slider">
                  <button class="emby-tab-button" data-index="0"><div class="emby-button-foreground">Home</div></button>
                  <button class="emby-tab-button" data-index="1"><div class="emby-button-foreground">Favorites</div></button>
                  <button class="emby-tab-button legacy-my-list" data-index="2"><div class="emby-button-foreground">My List</div></button>
                  <button class="emby-tab-button emby-tab-button-active hssm-custom-page-tab" data-index="3" data-hssm-page-id="manager-page-movies"><div class="emby-button-foreground">Movies</div></button>
                </div></div>
              </div></header>
              <div id="indexPage" class="page homePage libraryPage">
                <div id="homeTab" class="tabContent pageTabContent" data-index="0">
                  <iframe class="featurediframe" src="about:blank" title="Abyss Spotlight"></iframe>
                  <div class="sections homeSectionsContainer">
                    <div class="section0 verticalSection"><h2 class="sectionTitle">Continue Watching</h2><div class="card" data-id="resume-one"></div><div class="card" data-id="resume-two"></div></div>
                  </div>
                </div>
                <div id="favoritesTab" class="tabContent pageTabContent" data-index="1"><div class="sections"></div></div>
                <div class="tabContent pageTabContent hssm-my-list-page" data-index="2"><div class="sections"></div></div>
                <div class="tabContent pageTabContent hssm-owned-custom-page is-active" data-index="3" data-hssm-page-id="manager-page-movies"><div class="sections homeSectionsContainer hssm-custom-page-container"></div></div>
              </div>
            </body></html>
            """
        )
        page.evaluate("location.hash = '#/home'")
        page.evaluate(
            """
            window.ApiClient = {
              getCurrentUserId: () => 'user',
              serverId: () => 'server',
              getUrl: (path, params) => { const u = new URL('/' + path, location.origin); Object.entries(params || {}).forEach(([k,v]) => u.searchParams.set(k, v)); return u.href; },
              getJSON: url => fetch(url).then(r => r.json()),
              getDisplayPreferences: () => Promise.resolve({ CustomPrefs:{ homesection0:'resume' } }),
              getUserViews: () => Promise.resolve({ Items:[{ Id:'library-one', Name:'Movies', CollectionType:'movies' }] }),
              getItems: (userId, options) => fetch(ApiClient.getUrl('Users/' + userId + '/Items', options)).then(r => r.json()),
              getItem: (userId, id) => Promise.resolve({ Id:id, Name:'Liked One', Type:'Movie', ImageTags:{Primary:'x'}, UserData:{Likes:true} }),
              updateUserItemRating: () => Promise.resolve({ Likes:true })
            };
            window.CustomElements = { upgradeSubtree(){} };
            document.querySelector('.tabs-viewmenubar').addEventListener('click', event => {
              const button=event.target.closest('.emby-tab-button');
              const tabs=event.currentTarget;
              const current=tabs.querySelector('.emby-tab-button-active');
              if(!button||button===current)return;
              const previousIndex=Number(current.dataset.index);
              const selectedTabIndex=Number(button.dataset.index);
              current.classList.remove('emby-tab-button-active');
              button.classList.add('emby-tab-button-active');
              const panels=document.querySelectorAll('#indexPage > .tabContent');
              if(panels[previousIndex])panels[previousIndex].classList.remove('is-active');
              if(panels[selectedTabIndex])panels[selectedTabIndex].classList.add('is-active');
              tabs.dispatchEvent(new CustomEvent('tabchange',{detail:{selectedTabIndex,previousIndex}}));
            });
            """
        )
        page.add_style_tag(content=CLIENT_CSS.read_text())
        page.add_script_tag(content=CLIENT.read_text())
        page.wait_for_timeout(500)
        if page.locator(".hssm-owned-media-bar").count() == 0:
            raise AssertionError({"errors": page_errors, "hash": page.evaluate("location.hash"), "status": page.evaluate("window.HomeScreenManagerClient && window.HomeScreenManagerClient.status()"), "body": page.locator("body").inner_html(), "requests": requests})
        page.wait_for_selector(".hssm-owned-media-bar", state="attached")
        page.wait_for_function("document.querySelector('#homeTab').classList.contains('is-active')")
        page.wait_for_selector("#homeTab [data-hssm-section-id='manager-home-top'] .hssm-client-card")
        page.wait_for_selector("#homeTab [data-hssm-section-id='manager-home-test'] .hssm-client-card")
        assert page.locator("#homeTab [data-hssm-section-id^='manager-movies-']").count() == 0
        page.wait_for_selector(".hssm-my-list-tab")
        page.wait_for_selector(".hssm-custom-page-tab[data-hssm-page-id='manager-page-movies']")
        page.wait_for_function("document.querySelector('.hssm-owned-media-bar').dataset.hssmAppliedImageType === 'primary'")

        result = page.evaluate(
            """
            () => ({
              originalSuppressed: getComputedStyle(document.querySelector('.featurediframe')).display === 'none',
              ownedHasNoAbyssIdentity: !document.querySelector('.hssm-owned-media-bar').classList.contains('featurediframe'),
              ownedVisible: getComputedStyle(document.querySelector('.hssm-owned-media-bar')).display === 'block',
              imageType: document.querySelector('.hssm-owned-media-bar').dataset.hssmAppliedImageType,
              interval: document.querySelector('.hssm-owned-media-bar').dataset.hssmAppliedIntervalSeconds,
              myListPanelCount: document.querySelectorAll('.hssm-owned-my-list-page').length,
              myListTabCount: document.querySelectorAll('.hssm-my-list-tab').length
            })
            """
        )
        assert result == {
            "originalSuppressed": True,
            "ownedHasNoAbyssIdentity": True,
            "ownedVisible": True,
            "imageType": "primary",
            "interval": "1",
            "myListPanelCount": 1,
            "myListTabCount": 1,
        }, result
        media_frame = page.frame_locator(".hssm-owned-media-bar")
        media_frame.locator("#title").wait_for(state="visible")
        first_title = media_frame.locator("#title").text_content()
        page.wait_for_timeout(1200)
        second_title = media_frame.locator("#title").text_content()
        assert first_title != second_title, {"first": first_title, "second": second_title}
        assert any("/Items/resume-one/Images/Primary" in url for url in requests), requests

        # Simulate Abyss creating/replacing its iframe after the plugin starts.
        page.evaluate("""() => { const f=document.createElement('iframe'); f.className='featurediframe'; f.src='about:blank'; document.querySelector('#homeTab').prepend(f); }""")
        page.wait_for_function("getComputedStyle(document.querySelector('#homeTab > .featurediframe')).display === 'none'")
        assert page.locator(".hssm-owned-media-bar").count() == 1

        page.locator(".hssm-my-list-tab").click()
        page.wait_for_selector(".hssm-owned-my-list-page.is-active .hssm-client-card[data-id='liked-one']")
        page.wait_for_selector(".hssm-owned-my-list-page.is-active .hssm-section-media-bar[data-hssm-media-section-id='my-list-content']")
        my_list_frame = page.frame_locator(".hssm-owned-my-list-page.is-active .hssm-section-media-bar[data-hssm-media-section-id='my-list-content']")
        my_list_frame.locator("#logo").wait_for(state="visible")
        assert "/Items/liked-one/Images/Logo" in my_list_frame.locator("#logo").get_attribute("src")
        assert all("/Images/Backdrop" not in url and "/Images/Primary" not in url and "/Images/Thumb" not in url and "/Images/Banner" not in url for url in [my_list_frame.locator("#logo").get_attribute("src")])
        my_list_state = page.evaluate(
            """() => ({
              homeActive: document.querySelector('#homeTab').classList.contains('is-active'),
              panelActive: document.querySelector('.hssm-owned-my-list-page').classList.contains('is-active'),
              sectionTitle: document.querySelector('.hssm-owned-my-list-page .sectionTitle').textContent.trim(),
              homeMediaBarHidden: getComputedStyle(document.querySelector('#homeTab > .hssm-owned-media-bar')).display === 'none',
              myListMediaBarVisible: getComputedStyle(document.querySelector('.hssm-owned-my-list-page .hssm-section-media-bar')).display !== 'none',
              oneManagedSection: document.querySelectorAll('.hssm-owned-my-list-page [data-hssm-section-id="my-list-content"]').length === 1,
              circularHeartUnclipped: getComputedStyle(document.querySelector('.hssm-owned-my-list-page .hssm-shape-circle .cardScalable')).overflow === 'visible',
              circularHeartOnTop: Number(getComputedStyle(document.querySelector('.hssm-owned-my-list-page .hssm-shape-circle .hssm-my-list-button')).zIndex) >= 20
            })"""
        )
        assert my_list_state == {"homeActive": False, "panelActive": True, "sectionTitle": "Added to My List", "homeMediaBarHidden": True, "myListMediaBarVisible": True, "oneManagedSection": True, "circularHeartUnclipped": True, "circularHeartOnTop": True}, my_list_state

        # Jellyfin's documented emby-tabs event owns the return to Home.
        page.evaluate("document.querySelector('.emby-tab-button[data-index=\"0\"]').click()")
        page.wait_for_function("getComputedStyle(document.querySelector('#homeTab > .hssm-owned-media-bar')).display === 'block'")
        assert page.locator("#homeTab .homeSectionsContainer").count() == 1
        assert page.locator("#homeTab .section0").count() == 1
        page.locator(".hssm-custom-page-tab[data-hssm-page-id='manager-page-movies']").click()
        page.wait_for_selector(".hssm-owned-custom-page.is-active [data-hssm-section-id='manager-movies-one'] .hssm-client-card")
        page.wait_for_selector(".hssm-owned-custom-page.is-active .hssm-section-media-bar[data-hssm-media-section-id='manager-movies-two']")
        page.wait_for_function("document.querySelectorAll('.hssm-owned-custom-page.is-active .hssm-section-media-bar').length === 2")
        custom_page_state = page.evaluate(
            """() => ({
              titleAbsent: !document.querySelector('.hssm-owned-custom-page.is-active .hssm-page-context-title'),
              visibleSections: document.querySelectorAll('.hssm-owned-custom-page.is-active [data-hssm-section-id]').length,
              hiddenSectionAbsent: !document.querySelector('[data-hssm-section-id="manager-movies-hidden"]'),
              mediaBars: document.querySelectorAll('.hssm-owned-custom-page.is-active .hssm-section-media-bar').length,
              lowerBarMarked: document.querySelector('.hssm-section-media-bar[data-hssm-media-section-id="manager-movies-two"]').classList.contains('hssm-media-bar-not-first'),
              topPadding: parseFloat(getComputedStyle(document.querySelector('.hssm-owned-custom-page.is-active')).paddingTop)
            })"""
        )
        assert {key: value for key, value in custom_page_state.items() if key != "topPadding"} == {"titleAbsent": True, "visibleSections": 2, "hiddenSectionAbsent": True, "mediaBars": 2, "lowerBarMarked": True}, custom_page_state
        assert custom_page_state["topPadding"] >= 60, custom_page_state
        page.frame_locator(".hssm-section-media-bar[data-hssm-media-section-id='manager-movies-two']").locator("body.hssm-media-bar-top-gradient").wait_for(state="attached")
        settings["HideFavorites"] = True
        settings["PageOrder"] = ["home", "hidden:favorites", "my-list", "manager-page-movies"]
        page.evaluate("window.HomeScreenManagerClient.invalidate(); window.HomeScreenManagerClient.refresh();")
        page.wait_for_function("document.querySelector('.emby-tab-button[data-index=\"1\"]').classList.contains('hssm-hidden-page-tab')")
        assert any("Filters=Likes" in url and "ParentId=library-one" in url for url in requests), requests
        assert not page_errors, page_errors
        browser.close()


if __name__ == "__main__":
    run()
    print("browser contract passed")
