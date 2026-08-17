from __future__ import annotations

import json
from pathlib import Path
from urllib.parse import parse_qs, urlparse
from uuid import UUID

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]
CLIENT = ROOT / "Home Screen Sections Manager" / "Web" / "homeScreenClient.js"
CLIENT_CSS = ROOT / "Home Screen Sections Manager" / "Web" / "homeScreenClient.css"
MEDIA_BAR = ROOT / "Home Screen Sections Manager" / "Web" / "mediaBar.html"
CLIENT_CONTROLLER = ROOT / "Home Screen Sections Manager" / "Api" / "HomeScreenClientController.cs"


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
    assert "hssm-media-bar-boot-mask" in CLIENT_CONTROLLER.read_text()
    settings = {
        "Sections": [
            {"Id": "jellyfin-0-resume", "Name": "Continue Watching", "PageId": "home", "Type": "resume", "ItemIds": [], "SourceIds": [], "IsApplied": True, "IsVisible": True, "IsMediaBar": False, "ArtSize": "large", "ArtType": "thumb", "ArtShape": "circle", "ShowText": False, "ShowSectionName": False},
            {"Id": "manager-home-top", "Name": "Top 20 in Foreign Collection With A Deliberately Long Custom Section Name", "PageId": "home", "Type": "top-10-50", "SourceIds": ["collection|top-source"], "ItemIds": [], "DisplayTopCount": 20, "ShowRankNumbers": True, "RankNumberColorMode": "horizontal-gradient", "RankNumberColorOne": "#ff0000", "RankNumberColorTwo": "#0000ff", "RankNumberShadowColor": "#123456", "IsApplied": True, "IsVisible": True, "IsMediaBar": False},
            {"Id": "manager-home-test", "Name": "Test Section", "PageId": "home", "Type": "manual-content", "ItemIds": ["resume-two"], "ArtSize": "extra-small", "ArtShape": "wide", "ShowSectionName": False, "IsApplied": True, "IsVisible": True, "IsMediaBar": False},
            {"Id": "manager-movies-one", "Name": "Movie Picks", "PageId": "manager-page-movies", "Type": "manual-content", "ItemIds": ["resume-one"], "IsApplied": True, "IsVisible": True, "IsMediaBar": True},
            {"Id": "manager-movies-two", "Name": "More Movies", "PageId": "manager-page-movies", "Type": "manual-content", "ItemIds": ["resume-two"], "IsApplied": True, "IsVisible": True, "IsMediaBar": True},
            {"Id": "manager-watch-again", "Name": "Watch Again", "PageId": "manager-page-movies", "Type": "watch-again", "ItemIds": [], "SourceIds": [], "ContentOrder": "completed-descending", "IsApplied": True, "IsVisible": True, "IsMediaBar": True},
            {"Id": "manager-books", "Name": "Audiobooks", "PageId": "manager-page-movies", "Type": "manual-content", "ItemIds": ["audio-book-one"], "SourceIds": [], "ArtType": "primary", "ArtShape": "book", "ShowText": True, "IsApplied": True, "IsVisible": True, "IsMediaBar": False},
            {"Id": "manager-recent-songs", "Name": "Songs Recently Listened To", "PageId": "manager-page-movies", "Type": "recently-listened-songs", "ItemIds": [], "SourceIds": [], "ContentOrder": "completed-descending", "ArtType": "primary", "ArtShape": "square", "ShowText": True, "IsApplied": True, "IsVisible": True, "IsMediaBar": False},
            {"Id": "manager-library", "Name": "Library Items", "PageId": "manager-page-movies", "Type": "library-content", "ItemIds": ["year-folder", "actual-movie"], "SourceIds": ["library-one"], "IsApplied": True, "IsVisible": True, "IsMediaBar": False},
            {"Id": "manager-movies-hidden", "Name": "Saved for Later", "PageId": "manager-page-movies", "Type": "manual-content", "ItemIds": ["liked-one"], "IsApplied": True, "IsVisible": False, "IsMediaBar": False},
            {"Id": "my-list-content", "Name": "Added to My List", "PageId": "my-list", "Type": "my-list-content", "ItemIds": [], "IsApplied": True, "IsVisible": True, "IsMediaBar": True, "ArtShape": "circle"},
        ],
        "SectionOrder": ["jellyfin-0-resume", "manager-home-top", "manager-home-test"],
        "Pages": [{"Id": "my-list", "Name": "My List"}, {"Id": "manager-page-movies", "Name": "Movies"}],
        "PageOrder": ["home", "favorites", "my-list", "manager-page-movies"],
        "PageLayouts": [
            {"PageId": "home", "SectionOrder": ["jellyfin-0-resume", "manager-home-top", "manager-home-test"]},
            {"PageId": "manager-page-movies", "SectionOrder": ["manager-movies-one", "manager-movies-two", "manager-watch-again", "manager-books", "manager-recent-songs", "manager-library", "hidden:manager-movies-hidden"]},
            {"PageId": "my-list", "SectionOrder": ["my-list-content"]},
        ],
        "EnableMyList": True,
        "HideFavorites": False,
        "MediaBarIntervalSeconds": 1,
        "MediaBarImageType": "primary",
        "EnableMediaBarSlowZoom": True,
        "TitleMarqueeSpeed": "normal",
        "EnableTopRow": True,
        "TopRowPageIds": ["home", "manager-page-movies"],
        "TopRowAlwaysShow": False,
        "TopRowPersistent": False,
        "TopRowLogoShadowColor": "#ffffff",
        "EnableTopRowMessage": True,
        "TopRowMessagePageIds": ["home"],
        "TopRowMessageAlwaysShow": False,
        "TopRowMessagePersistent": False,
        "TopRowMessageText": "Welcome to the server - this is a deliberately wide message for marquee testing across every user account",
        "TopRowMessageFontColor": "#fefefe",
        "TopRowMessageFontShadowColor": "#112233",
        "TopRowMessageBarColorMode": "horizontal-gradient",
        "TopRowMessageBarColorOne": "#111111",
        "TopRowMessageBarColorTwo": "#332244",
        "TopRowMessageMarqueeSpeed": "fast",
        "TopRowSection": {"Id": "top-row", "Name": "Top Row", "PageId": "home", "Type": "multiple-collections-in-a-row", "SourceIds": [], "ItemIds": [], "ContentOrder": "manual", "ArtSize": "extra-small", "ArtType": "primary", "ArtShape": "circle", "DisplayLogosOnly": True, "ShowText": False, "ShowSectionName": False, "IsApplied": True},
        "TopRowLogoCollectionIds": [],
        "LogoImageDataUrl": "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='32'%3E%3C/svg%3E",
    }
    resume = base_item("resume-one", "Resume One")
    resume_two = base_item("resume-two", "Resume Two", "Episode")
    resume_two["SeriesId"] = "series-two"
    resume_two["SeriesName"] = "Series Two"
    series_two = base_item("series-two", "Series Two", "Series")
    liked = base_item("liked-one", "A Good Logo")
    liked["ImageTags"]["Logo"] = "logo-tag"
    liked_opaque = base_item("liked-opaque", "Z Opaque Logo")
    liked_opaque["ImageTags"]["Logo"] = "opaque-logo-tag"
    watched_movie = base_item("watched-movie", "Completed Movie", "Movie")
    watched_series = base_item("watched-series", "Completed Series", "Series")
    watched_episode_one = base_item("watched-episode-one", "Completed Premiere", "Episode")
    watched_episode_two = base_item("watched-episode-two", "A Completed Episode With A Deliberately Very Long Title For Marquee Testing", "Episode")
    watched_special = base_item("watched-special", "Unplayed Special", "Episode")
    watched_movie["UserData"]["LastPlayedDate"] = "2026-07-01T12:00:00Z"
    watched_series["UserData"].update({"Played": False, "UnplayedItemCount": 2})
    watched_series["RecursiveItemCount"] = 3
    for index, episode in enumerate([watched_episode_one, watched_episode_two], start=1):
        episode["SeriesId"] = "watched-series"
        episode["SeriesName"] = "Completed Series"
        episode["ParentIndexNumber"] = 1
        episode["IndexNumber"] = index
        episode["PremiereDate"] = f"2026-07-{index:02d}T00:00:00Z"
        episode["UserData"].update({"Played": True, "LastPlayedDate": f"2026-08-0{index}T12:00:00Z"})
    watched_special["SeriesId"] = "watched-series"
    watched_special["ParentIndexNumber"] = 0
    watched_special["IndexNumber"] = 1
    watched_special["PremiereDate"] = "2026-07-03T00:00:00Z"
    watched_special["UserData"]["Played"] = False
    audio_book = base_item("audio-book-one", "The Long Book", "AudioBook")
    audio_book["People"] = [{"Name": "Excellent Author", "Type": "Author"}]
    recent_song = base_item("recent-song-one", "Recently Heard Song", "Audio")
    recent_song.update({"Artists": ["The Artist"], "ArtistItems": [{"Id": "artist-one", "Name": "The Artist"}], "AlbumId": "album-one"})
    genre_drama = base_item("genre-drama", "Drama", "Genre")
    year_folder = base_item("year-folder", "2010 - 2015", "Folder")
    actual_movie = base_item("actual-movie", "Actual Movie", "Movie")
    resume["CommunityRating"] = 8.8
    resume_two["CommunityRating"] = 7.7
    top_row_items = [base_item(f"{index:032x}", f"Collection {index}", "BoxSet") for index in range(1, 17)]
    del top_row_items[-1]["ImageTags"]["Primary"]
    settings["TopRowSection"]["SourceIds"] = [item["Id"] for item in top_row_items]
    settings["TopRowSection"]["ItemIds"] = [item["Id"] for item in top_row_items]
    settings["TopRowLogoCollectionIds"] = [str(UUID(hex=item["Id"])) for item in top_row_items[:-1]]
    settings["TopRows"] = [
        {"Id": "main-top-row", "Name": "Main Top Row", "IsMain": True, "EnableTopRow": True, "OverrideMainTopRow": False, "TargetType": "main", "TargetId": "", "Persistent": False, "LogoShadowColor": "#ffffff", "Section": json.loads(json.dumps(settings["TopRowSection"]))},
        {"Id": "movies-page-top-row", "Name": "Movies Page Top Row", "IsMain": False, "EnableTopRow": True, "OverrideMainTopRow": True, "TargetType": "page", "TargetId": "manager-page-movies", "Persistent": False, "LogoShadowColor": "#ffffff", "Section": json.loads(json.dumps(settings["TopRowSection"]))},
        {"Id": "movies-library-top-row", "Name": "Movies Library Top Row", "IsMain": False, "EnableTopRow": True, "OverrideMainTopRow": True, "TargetType": "library", "TargetId": "library-one", "Persistent": True, "LogoShadowColor": "#ffffff", "Section": {"Id":"top-row-section-movies-library", "Name":"Top Row", "Type":"genres-in-a-row", "SourceIds":["genre-drama"], "ItemIds":["genre-drama"], "ContentOrder":"manual", "ArtSize":"extra-small", "ArtType":"primary", "ArtShape":"wide", "DisplayLogosOnly":False, "IsApplied":True}},
    ]
    first_top_row_id = top_row_items[0]["Id"]
    missing_top_row_id = top_row_items[-1]["Id"]
    items_by_id = {item["Id"]: item for item in [resume, resume_two, series_two, liked, liked_opaque, watched_movie, watched_series, watched_episode_one, watched_episode_two, watched_special, audio_book, recent_song, genre_drama, year_folder, actual_movie, *top_row_items]}
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
            elif path.endswith("/HomeScreenSectionsManager/recent-listening"):
                route.fulfill(status=200, content_type="application/json", body=json.dumps({"ItemIds": ["recent-song-one"]}))
            elif path.endswith("/Users/user/Views"):
                route.fulfill(status=200, content_type="application/json", body=json.dumps({"Items": [{"Id": "library-one", "Name": "Movies", "CollectionType": "movies"}]}))
            elif path.endswith("/Users/user/Items/Resume"):
                route.fulfill(status=200, content_type="application/json", body=json.dumps({"Items": [resume, resume_two]}))
            elif path.endswith("/Users/user/Items"):
                if query.get("Filters") == ["Likes"] and query.get("ParentId") == ["library-one"]:
                    route.fulfill(status=200, content_type="application/json", body=json.dumps({"Items": [liked, liked_opaque]}))
                elif query.get("Filters") == ["IsPlayed"] and query.get("IncludeItemTypes") == ["Movie"]:
                    route.fulfill(status=200, content_type="application/json", body=json.dumps({"Items": [watched_movie]}))
                elif query.get("Filters") == ["IsPlayed"] and query.get("IncludeItemTypes") == ["Episode"]:
                    route.fulfill(status=200, content_type="application/json", body=json.dumps({"Items": [watched_episode_one, watched_episode_two]}))
                elif query.get("IncludeItemTypes") == ["Series"]:
                    route.fulfill(status=200, content_type="application/json", body=json.dumps({"Items": []}))
                elif query.get("ParentId") == ["top-source"]:
                    route.fulfill(status=200, content_type="application/json", body=json.dumps({"Items": [resume, resume_two]}))
                elif query.get("Ids"):
                    ids = query["Ids"][0].split(",")
                    route.fulfill(status=200, content_type="application/json", body=json.dumps({"Items": [items_by_id[item_id] for item_id in ids if item_id in items_by_id]}))
                else:
                    route.fulfill(status=200, content_type="application/json", body=json.dumps({"Items": []}))
            elif path.endswith("/DisplayPreferences/usersettings"):
                route.fulfill(status=200, content_type="application/json", body=json.dumps({"CustomPrefs": {"homesection0": "resume"}}))
            elif path.endswith("/media-bar.html"):
                route.fulfill(status=200, content_type="text/html", body=MEDIA_BAR.read_text().replace("__HSSM_MEDIA_BAR_INTERVAL__", "1").replace("__HSSM_MEDIA_BAR_IMAGE_TYPE__", "primary"))
            elif "/HomeScreenSectionsManager/top-row-logo/" in path:
                route.fulfill(status=200, content_type="image/svg+xml", body='<svg xmlns="http://www.w3.org/2000/svg" width="320" height="120"><text x="12" y="82" fill="white" font-size="72">SOURCE LOGO</text></svg>')
            elif "/Items/" in path and "/Images/" in path:
                if path.endswith("/Items/liked-one/Images/Logo"):
                    route.fulfill(status=200, content_type="image/svg+xml", body='<svg xmlns="http://www.w3.org/2000/svg" width="320" height="120"><text x="12" y="82" fill="white" font-size="72">LOGO</text></svg>')
                elif path.endswith("/Items/liked-opaque/Images/Logo"):
                    route.fulfill(status=200, content_type="image/svg+xml", body='<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><rect width="320" height="180" fill="blue"/><text x="20" y="100" fill="white" font-size="52">LOGO</text></svg>')
                elif path.endswith("/Images/Logo"):
                    route.fulfill(status=200, content_type="image/svg+xml", body='<svg xmlns="http://www.w3.org/2000/svg" width="320" height="120"><text x="12" y="82" fill="white" font-size="72">LOGO</text></svg>')
                else:
                    route.fulfill(status=200, content_type="image/svg+xml", body='<svg xmlns="http://www.w3.org/2000/svg" width="70" height="40"><rect width="24" height="40" fill="#173b78"/><rect x="24" width="23" height="40" fill="#6d295f"/><rect x="47" width="23" height="40" fill="#1d5a4f"/></svg>')
            elif path.endswith("/ui/spotlight.css"):
                route.fulfill(status=200, content_type="text/css", body="body{margin:0;background:#000;color:#fff}")
            else:
                route.fulfill(status=200, content_type="application/json", body="{}")

        page.route("**/*", route_handler)
        page.goto("http://jellyfin.test/web/#/home")
        page.set_content(
            """
            <html><head><style>body{margin:0}.skinHeader{position:fixed;left:0;right:0;top:0}.tabContent:not(.is-active){display:none}.cardPadder-overflowPortrait{padding-bottom:150%}.cardPadder-backdrop{padding-bottom:56.25%}.cardScalable{position:relative}.cardContent{position:absolute;inset:0}.cardOverlayContainer{position:absolute;inset:0;background:rgba(0,0,0,.5);opacity:0}.card-hoverable:hover .cardOverlayContainer{opacity:1}.cardOverlayFab-primary:hover{transform:scale(1.2)}.hssm-my-list-button:hover{transform:scale(1.08)}</style></head><body>
              <header class="skinHeader"><div class="headerLeft"></div><div class="headerTabs">
                <div is="emby-tabs" class="tabs-viewmenubar" data-index="0"><div class="emby-tabs-slider">
                  <button class="emby-tab-button" data-index="0"><div class="emby-button-foreground">Home</div></button>
                  <button class="emby-tab-button" data-index="1"><div class="emby-button-foreground">Favorites</div></button>
                  <button class="emby-tab-button legacy-my-list" data-index="2"><div class="emby-button-foreground">My List</div></button>
                  <button class="emby-tab-button emby-tab-button-active hssm-custom-page-tab" data-index="3" data-hssm-page-id="manager-page-movies"><div class="emby-button-foreground">Movies</div></button>
                </div></div>
              </div></header>
              <div id="indexPage" class="page homePage libraryPage" style="min-height:2200px">
                <div id="homeTab" class="tabContent pageTabContent" data-index="0">
                  <iframe class="featurediframe" src="about:blank" title="Abyss Spotlight"></iframe>
                  <div class="sections homeSectionsContainer">
                    <div class="section0 verticalSection"><h2 class="sectionTitle">Continue Watching</h2><div class="card card-hoverable" data-id="resume-one"><div class="cardBox"><div class="cardScalable"><div class="cardPadder cardPadder-overflowPortrait"></div><a class="cardImageContainer cardContent" style="background-image:url(original-one)"></a><div class="cardOverlayContainer"></div></div><div class="cardText">Resume One</div></div></div><div class="card card-hoverable" data-id="resume-two"><div class="cardBox"><div class="cardScalable"><div class="cardPadder cardPadder-overflowPortrait"></div><a class="cardImageContainer cardContent" style="background-image:url(original-two)"></a><div class="cardOverlayContainer"></div></div><div class="cardText">Resume Two</div></div></div></div>
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
              accessToken: () => 'test-token',
              serverId: () => 'server',
              getUrl: (path, params) => { const u = new URL('/' + path, location.origin); Object.entries(params || {}).forEach(([k,v]) => u.searchParams.set(k, v)); return u.href; },
              getJSON: url => fetch(url).then(r => r.json()),
              getDisplayPreferences: () => Promise.resolve({ CustomPrefs:{ homesection0:'resume' } }),
              getUserViews: () => Promise.resolve({ Items:[{ Id:'library-one', Name:'Movies', CollectionType:'movies' }] }),
              getItems: (userId, options) => fetch(ApiClient.getUrl('Users/' + userId + '/Items', options)).then(r => r.json()),
              getItem: (userId, id) => Promise.resolve(id === 'audio-book-one'
                ? { Id:id, Name:'The Long Book', Type:'AudioBook', ImageTags:{Primary:'x'}, People:[{Name:'Excellent Author',Type:'Author'}], UserData:{Likes:true} }
                : { Id:id, Name:'Liked One', Type:'Movie', ImageTags:{Primary:'x'}, UserData:{Likes:true} }),
              getAncestorItems: () => Promise.resolve([{ Id:'library-one', Name:'Movies', Type:'CollectionFolder' }]),
              updateUserItemRating: () => Promise.resolve({ Likes:true })
            };
            window.CustomElements = { upgradeSubtree(){} };
            window.__playedIds = [];
            document.addEventListener('click', event => {
              const play = event.target.closest('[data-action="resume"]');
              const card = play && play.closest('.card[data-id]');
              if (card) window.__playedIds.push(card.dataset.id);
            });
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
        long_section_heading = page.locator("#homeTab [data-hssm-section-id='manager-home-top'] > .sectionTitleContainer .sectionTitle")
        assert long_section_heading.inner_text().strip() == "Top 20 in Foreign Collection With A Deliberately Long Custom Section Name"
        assert "id=top-source" in long_section_heading.locator("xpath=..").get_attribute("href")
        assert long_section_heading.locator("xpath=../span[contains(@class,'chevron_right')]").count() == 1
        assert long_section_heading.locator("xpath=../span[contains(@class,'chevron_right')]").inner_text().strip() == ""
        assert "button-flat-mini" in long_section_heading.locator("xpath=..").get_attribute("class").split()
        assert "padded-left" in long_section_heading.locator("xpath=../..").get_attribute("class").split()
        assert "padded-left" not in long_section_heading.locator("xpath=..").get_attribute("class").split()
        heading_style = long_section_heading.evaluate("node => ({overflow:getComputedStyle(node).overflow,textOverflow:getComputedStyle(node).textOverflow,whiteSpace:getComputedStyle(node).whiteSpace,lineClamp:getComputedStyle(node).webkitLineClamp,width:node.getBoundingClientRect().width,parentWidth:node.parentElement.getBoundingClientRect().width})")
        assert heading_style["overflow"] == "visible" and heading_style["textOverflow"] == "clip" and heading_style["whiteSpace"] == "normal" and heading_style["lineClamp"] == "none" and heading_style["width"] > heading_style["parentWidth"] * 0.9, heading_style
        page.wait_for_selector(f"#indexPage > .hssm-top-row .hssm-top-row-card[data-id='{first_top_row_id}']")
        assert page.locator("#indexPage > .hssm-top-row").get_attribute("data-hssm-top-row-id") == "main-top-row"
        page.wait_for_selector("#indexPage > .hssm-top-row-message")
        top_row_state = page.evaluate("""() => {
          const header=document.querySelector('.skinHeader'), host=document.querySelector('#indexPage'), message=host.querySelector(':scope > .hssm-top-row-message'), row=host.querySelector(':scope > .hssm-top-row'), track=row.querySelector('.hssm-top-row-track'), card=row.querySelector('.hssm-top-row-card');
          const action=card.matches('.cardImageContainer,.itemAction')?card:card.querySelector('.cardImageContainer,.itemAction'), logoStyle=getComputedStyle(card), logoImage=card.querySelector('.hssm-top-row-logo-image');
          return {
            firstChild:host.firstElementChild===message,
            rowAfterMessage:message.nextElementSibling===row,
            host:header.classList.contains('hssm-top-row-host'),
            position:getComputedStyle(row).position,
            messagePosition:getComputedStyle(message).position,
            messageText:message.textContent.trim(),
            messageBackground:getComputedStyle(message).backgroundImage,
            messageColor:getComputedStyle(message).color,
            messageShadow:getComputedStyle(message).textShadow,
            topGap:parseFloat(getComputedStyle(track).paddingTop),
            noArrows:row.querySelectorAll('button,.hssm-scroll-button').length===0,
            noPlay:row.querySelectorAll('[data-action="resume"],.cardOverlayFab-primary').length===0,
            noHeart:row.querySelectorAll('.hssm-my-list-button').length===0,
            href:action.getAttribute('href'),
            backdropFilter:getComputedStyle(row,'::before').backdropFilter || getComputedStyle(row,'::before').webkitBackdropFilter,
            plainLogo:card.tagName==='A' && !card.classList.contains('card') && !card.querySelector('.cardBox,.cardScalable,.cardPadder'),
            gap:parseFloat(getComputedStyle(track).gap),
            normalGap:parseFloat(getComputedStyle(document.querySelector('#homeTab [data-hssm-section-id="manager-home-test"] .hssm-client-items')).gap),
            width:card.getBoundingClientRect().width,
            scalableRatio:(() => { const scalable=card.querySelector('.cardScalable'), box=(scalable || card).getBoundingClientRect(); return box.height / box.width; })(),
            scrollable:track.scrollWidth>track.clientWidth,
            logosOnly:row.classList.contains('hssm-top-row-logos-only'),
            logoSrc:card.querySelector('.hssm-top-row-logo-image') && card.querySelector('.hssm-top-row-logo-image').getAttribute('src'),
            logoFit:card.querySelector('.hssm-top-row-logo-image') && getComputedStyle(card.querySelector('.hssm-top-row-logo-image')).objectFit,
            logoOverflow:logoStyle.overflow,
            logoRadius:logoStyle.borderRadius,
            logoBorder:logoStyle.borderStyle,
            logoOutline:logoStyle.outlineStyle,
            logoShadow:logoStyle.boxShadow,
            logoClip:logoStyle.clipPath,
            logoPadding:parseFloat(logoStyle.paddingTop),
            logoFilter:getComputedStyle(logoImage).filter,
            wideDespiteSavedCircle:row.classList.contains('hssm-shape-wide') && !row.classList.contains('hssm-shape-circle')
          };
        }""")
        assert top_row_state["firstChild"] and top_row_state["rowAfterMessage"] and top_row_state["host"] and top_row_state["position"] == "relative" and top_row_state["messagePosition"] == "relative" and top_row_state["topGap"] >= 4 and top_row_state["noArrows"] and top_row_state["noPlay"] and top_row_state["noHeart"] and top_row_state["plainLogo"] and top_row_state["logosOnly"] and top_row_state["wideDespiteSavedCircle"], top_row_state
        assert top_row_state["messageText"].startswith("Welcome to the server") and "linear-gradient" in top_row_state["messageBackground"] and top_row_state["messageColor"] == "rgb(254, 254, 254)" and "rgb(17, 34, 51)" in top_row_state["messageShadow"], top_row_state
        assert f"id={first_top_row_id}" in top_row_state["href"] and "blur" not in top_row_state["backdropFilter"] and top_row_state["scrollable"] and abs(top_row_state["gap"] - top_row_state["normalGap"]) < 1, top_row_state
        assert f"/HomeScreenSectionsManager/top-row-logo/{first_top_row_id}" in top_row_state["logoSrc"] and top_row_state["logoFit"] == "contain" and top_row_state["logoOverflow"] == "visible" and top_row_state["logoRadius"] == "0px", top_row_state
        assert top_row_state["logoBorder"] == "none" and top_row_state["logoOutline"] == "none" and top_row_state["logoShadow"] == "none" and top_row_state["logoClip"] == "none" and top_row_state["logoPadding"] > 0, top_row_state
        assert "drop-shadow" in top_row_state["logoFilter"] and "rgba(255, 255, 255" in top_row_state["logoFilter"], top_row_state
        assert parse_qs(urlparse(top_row_state["logoSrc"]).query).get("ApiKey") == ["test-token"], top_row_state
        assert page.locator(f".hssm-top-row-card[data-id='{missing_top_row_id}']").count() == 0
        top_row_scroll = page.locator(".hssm-top-row-track").evaluate("""track => { const before=track.scrollLeft; track.dispatchEvent(new WheelEvent('wheel',{deltaY:260,bubbles:true,cancelable:true})); return {before,after:track.scrollLeft}; }""")
        assert top_row_scroll["after"] > top_row_scroll["before"], top_row_scroll
        page.wait_for_selector("#homeTab .section0.hssm-native-art-override.hssm-size-large.hssm-shape-circle.hssm-art-thumb")
        assert page.locator("#homeTab .section0").evaluate("node => getComputedStyle(node).getPropertyValue('--hssm-card-width').trim()") == "14.5em"
        assert page.locator("#homeTab .section0 .cardText").first.evaluate("node => getComputedStyle(node).display") == "none"
        assert page.locator("#homeTab .section0 > .sectionTitle").evaluate("node => getComputedStyle(node).display") == "none"
        native_circle = page.locator("#homeTab .section0 .card").first.evaluate("card => { const scalable=card.querySelector('.cardScalable').getBoundingClientRect(); const overlay=getComputedStyle(card.querySelector('.cardOverlayContainer')); return {ratio:scalable.height/scalable.width, radius:overlay.borderRadius}; }")
        assert abs(native_circle["ratio"] - 1) < 0.03, native_circle
        assert native_circle["radius"] == "50%", native_circle
        assert page.locator("#homeTab [data-hssm-section-id='jellyfin-0-resume']").count() == 0
        assert page.locator("#homeTab [data-hssm-section-id='manager-home-test'] > .sectionTitleContainer").count() == 0
        hidden_name_spacing = page.locator("#homeTab [data-hssm-section-id='manager-home-test']").evaluate("node => parseFloat(getComputedStyle(node).paddingTop)")
        assert hidden_name_spacing >= 0.8, hidden_name_spacing
        extra_small_wide_width = page.locator("#homeTab [data-hssm-section-id='manager-home-test'] .hssm-client-card").evaluate("node => node.getBoundingClientRect().width")
        assert abs((extra_small_wide_width * 0.82) - top_row_state["width"]) < 1, {"section": extra_small_wide_width, "topRow": top_row_state["width"]}
        normal_scalable_ratio = page.locator("#homeTab [data-hssm-section-id='manager-home-test'] .hssm-client-card .cardScalable").evaluate("node => node.getBoundingClientRect().height / node.getBoundingClientRect().width")
        assert abs(normal_scalable_ratio - top_row_state["scalableRatio"]) < 0.01, {"section": normal_scalable_ratio, "topRow": top_row_state["scalableRatio"]}
        assert any(f"/HomeScreenSectionsManager/top-row-logo/{first_top_row_id}" in url for url in requests), requests
        assert not any(f"/Items/{first_top_row_id}/Images/" in url for url in requests), requests
        page.wait_for_selector("#homeTab [data-hssm-section-id='manager-home-top'] .hssm-my-list-button")
        page.wait_for_selector("#homeTab [data-hssm-section-id='manager-home-test'] .hssm-my-list-button")
        page.wait_for_selector("#homeTab .section0 .hssm-my-list-button")
        proportional_controls = page.evaluate("""() => {
          const width = selector => document.querySelector(selector).getBoundingClientRect().width;
          return {
            mediumPlay:width('#homeTab [data-hssm-section-id="manager-home-top"] .cardOverlayFab-primary'),
            smallPlay:width('#homeTab [data-hssm-section-id="manager-home-test"] .cardOverlayFab-primary'),
            mediumHeart:width('#homeTab [data-hssm-section-id="manager-home-top"] .hssm-my-list-button'),
            smallHeart:width('#homeTab [data-hssm-section-id="manager-home-test"] .hssm-my-list-button'),
            largeNativeHeart:width('#homeTab .section0 .hssm-my-list-button')
          };
        }""")
        assert proportional_controls["mediumPlay"] > proportional_controls["smallPlay"], proportional_controls
        assert proportional_controls["mediumHeart"] > proportional_controls["smallHeart"], proportional_controls
        assert proportional_controls["largeNativeHeart"] > proportional_controls["mediumHeart"], proportional_controls
        small_play = page.locator("#homeTab [data-hssm-section-id='manager-home-test'] .cardOverlayFab-primary")
        small_play.hover()
        small_play_hover_width = small_play.evaluate("node => node.getBoundingClientRect().width")
        assert small_play_hover_width > proportional_controls["smallPlay"] and small_play_hover_width <= proportional_controls["mediumPlay"], {"before": proportional_controls["smallPlay"], "hover": small_play_hover_width, "normal": proportional_controls["mediumPlay"]}
        small_heart = page.locator("#homeTab [data-hssm-section-id='manager-home-test'] .hssm-my-list-button")
        small_heart.hover()
        page.wait_for_timeout(220)
        small_heart_hover_width = small_heart.evaluate("node => node.getBoundingClientRect().width")
        assert small_heart_hover_width > proportional_controls["smallHeart"] and small_heart_hover_width <= proportional_controls["mediumHeart"], {"before": proportional_controls["smallHeart"], "hover": small_heart_hover_width, "normal": proportional_controls["mediumHeart"]}
        assert page.locator("#homeTab [data-hssm-section-id='manager-home-top'] .hssm-rank-number").count() == 2
        assert page.locator("#homeTab [data-hssm-section-id='manager-home-top']").evaluate("node => node.classList.contains('hssm-top-ranked')")
        rank_geometry = page.locator("#homeTab [data-hssm-section-id='manager-home-top'] .hssm-rank-number").first.evaluate("node => { const box=node.getBoundingClientRect(), scalable=node.closest('.cardScalable').getBoundingClientRect(), style=getComputedStyle(node), glyph=getComputedStyle(node.querySelector('.hssm-rank-glyph')), image=getComputedStyle(node.closest('.cardScalable').querySelector(':scope > .cardImageContainer')); return {width:box.width,height:box.height,fontSize:parseFloat(style.fontSize),display:style.display,visibility:style.visibility,bottomDelta:Math.abs(box.bottom-scalable.bottom),rankZ:Number(style.zIndex),imageZ:Number(image.zIndex),backgroundImage:glyph.backgroundImage,textFill:glyph.webkitTextFillColor,filter:style.filter,shadow:getComputedStyle(node.closest('.hssm-client-section')).getPropertyValue('--hssm-rank-shadow').trim()}; }")
        assert rank_geometry["width"] > 20 and rank_geometry["height"] > 20 and rank_geometry["fontSize"] > 40 and rank_geometry["display"] != "none" and rank_geometry["visibility"] == "visible", rank_geometry
        assert rank_geometry["bottomDelta"] < 1 and rank_geometry["rankZ"] < rank_geometry["imageZ"], rank_geometry
        assert "linear-gradient" in rank_geometry["backgroundImage"] and "rgb(255, 0, 0)" in rank_geometry["backgroundImage"] and "rgb(0, 0, 255)" in rank_geometry["backgroundImage"] and rank_geometry["textFill"] in ("transparent", "rgba(0, 0, 0, 0)") and rank_geometry["shadow"] == "rgba(18, 52, 86, 0.55)", rank_geometry
        assert "drop-shadow" in rank_geometry["filter"] and "rgba(18, 52, 86, 0.55)" in rank_geometry["filter"], rank_geometry
        title_year_alignment = page.locator("#homeTab [data-hssm-section-id='manager-home-top'] .hssm-client-card").first.evaluate("card => { const title=card.querySelector('.hssm-card-title'), year=card.querySelector('.hssm-card-year'); return {title:title.getBoundingClientRect().left,year:year.getBoundingClientRect().left}; }")
        assert abs(title_year_alignment["title"] - title_year_alignment["year"]) < 1, title_year_alignment
        assert page.locator("#homeTab [data-hssm-section-id^='manager-movies-']").count() == 0
        page.wait_for_selector(".hssm-my-list-tab")
        page.wait_for_selector(".hssm-custom-page-tab[data-hssm-page-id='manager-page-movies']")
        page.wait_for_function("document.querySelector('.hssm-owned-media-bar').dataset.hssmAppliedImageType === 'primary'")
        page.wait_for_function("getComputedStyle(document.body).getPropertyValue('--hssm-top-row-height').trim().endsWith('px')")
        top_row_background = page.locator(".hssm-top-row").evaluate("row => ({image:getComputedStyle(row).backgroundImage,color:getComputedStyle(row).backgroundColor})")
        assert top_row_background["image"] == "none" and top_row_background["color"] == "rgba(0, 0, 0, 0)", top_row_background
        media_bar_fade = page.frame_locator("#homeTab > .hssm-owned-media-bar").locator("#backdrop").evaluate("node => ({mask:getComputedStyle(node).maskImage,webkitMask:getComputedStyle(node).webkitMaskImage,topClass:document.body.classList.contains('hssm-media-bar-top-gradient')})")
        active_mask = media_bar_fade["mask"] if media_bar_fade["mask"] != "none" else media_bar_fade["webkitMask"]
        assert media_bar_fade["topClass"] and "rgba(0, 0, 0, 0) 0%" in active_mask and "rgba(0, 0, 0, 0) 100%" in active_mask and "36%" in active_mask and "64%" in active_mask, media_bar_fade
        page.evaluate("window.scrollTo(0, 0)")
        page.wait_for_timeout(300)
        shifted_top_geometry = page.evaluate("""() => { const message=document.querySelector('.hssm-top-row-message').getBoundingClientRect(), row=document.querySelector('.hssm-top-row').getBoundingClientRect(), header=document.querySelector('.skinHeader').getBoundingClientRect(), index=document.querySelector('#indexPage'), media=document.querySelector('#homeTab > .hssm-owned-media-bar').getBoundingClientRect(); return {messageTop:message.top,messageBottom:message.bottom,rowTop:row.top,rowBottom:row.bottom,headerTop:header.top,rowHeight:row.height,messageHeight:message.height,pageShift:parseFloat(getComputedStyle(index).marginTop),mediaTop:media.top}; }""")
        assert abs(shifted_top_geometry["messageTop"]) < 1 and shifted_top_geometry["rowTop"] >= shifted_top_geometry["messageBottom"] - 1, shifted_top_geometry
        assert shifted_top_geometry["headerTop"] >= shifted_top_geometry["rowBottom"] - 1 and shifted_top_geometry["headerTop"] - shifted_top_geometry["rowBottom"] <= 4, shifted_top_geometry
        assert shifted_top_geometry["pageShift"] == 0, shifted_top_geometry
        assert shifted_top_geometry["mediaTop"] >= shifted_top_geometry["rowBottom"] - 1, shifted_top_geometry
        page.evaluate("window.scrollTo(0, document.querySelector('.hssm-top-row').getBoundingClientRect().height + document.querySelector('.hssm-top-row-message').getBoundingClientRect().height + 30)")
        page.wait_for_function("document.querySelector('.hssm-top-row').getBoundingClientRect().bottom <= 0 && document.querySelector('.hssm-top-row-message').getBoundingClientRect().bottom <= 0 && Math.abs(document.querySelector('.skinHeader').getBoundingClientRect().top) < 1")
        scrolled_top_row = page.evaluate("""() => ({rowBottom:document.querySelector('.hssm-top-row').getBoundingClientRect().bottom,headerTop:document.querySelector('.skinHeader').getBoundingClientRect().top})""")
        assert scrolled_top_row["rowBottom"] <= 0 and abs(scrolled_top_row["headerTop"]) < 1, scrolled_top_row
        page.evaluate("window.scrollTo(0, 0)")
        page.wait_for_function("document.querySelector('.skinHeader').getBoundingClientRect().top >= document.querySelector('.hssm-top-row').getBoundingClientRect().bottom - 1")

        result = page.evaluate(
            """
            () => ({
              originalSuppressed: getComputedStyle(document.querySelector('.featurediframe')).display === 'none',
              ownedHasNoAbyssIdentity: !document.querySelector('.hssm-owned-media-bar').classList.contains('featurediframe'),
              ownedVisible: getComputedStyle(document.querySelector('.hssm-owned-media-bar')).display === 'block',
              imageType: document.querySelector('.hssm-owned-media-bar').dataset.hssmAppliedImageType,
              slowZoom: document.querySelector('.hssm-owned-media-bar').dataset.hssmAppliedSlowZoom,
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
            "slowZoom": "true",
            "interval": "1",
            "myListPanelCount": 1,
            "myListTabCount": 1,
        }, result
        media_frame = page.frame_locator(".hssm-owned-media-bar")
        media_frame.locator("#title").wait_for(state="attached")
        page.wait_for_function("document.querySelector('.hssm-owned-media-bar').dataset.hssmAppliedSlowZoom === 'true'")
        page.wait_for_function("document.querySelector('.hssm-owned-media-bar').contentDocument.querySelector('#backdrop-img').getAnimations().length > 0")
        first_title = media_frame.locator("#title").text_content()
        page.wait_for_function("first => document.querySelector('.hssm-owned-media-bar').contentDocument.querySelector('#title').textContent !== first", arg=first_title, timeout=3500)
        second_title = media_frame.locator("#title").text_content()
        assert first_title != second_title, {"first": first_title, "second": second_title}
        assert any("/Items/resume-one/Images/Primary" in url for url in requests), requests

        page.evaluate(
            """() => document.querySelector('.hssm-owned-media-bar').contentWindow.postMessage({type:'home-screen-manager-media-bar',action:'configure',intervalSeconds:30,imageType:'primary',slowZoom:false,topGradient:true,items:[{Id:'song-one',Name:'A Song',Type:'Audio',Artists:['The Artist'],ImageTags:{Primary:'song-primary'},_hssmMusicArtists:'The Artist',_hssmArtistBackdropItemId:'artist-one',_hssmArtistBackdropImageTag:'artist-backdrop',_hssmArtistLogoItemId:'artist-one',_hssmArtistLogoImageTag:'artist-logo',_hssmMusicPrimaryItemId:'album-one',_hssmMusicPrimaryImageTag:'album-primary'}]}, location.origin)"""
        )
        media_frame.locator("body.hssm-music-slide").wait_for(state="attached")
        assert media_frame.locator("#episode-label").inner_text().strip() == "A Song by The Artist"
        media_frame.locator("#music-art").wait_for(state="visible")
        assert "/Items/album-one/Images/Primary" in media_frame.locator("#music-art").get_attribute("src")
        assert "/Items/artist-one/Images/Backdrop/0" in media_frame.locator("#backdrop-img").get_attribute("src")
        assert "/Items/artist-one/Images/Logo" in media_frame.locator("#logo").get_attribute("src")
        assert "rgba(0, 0, 0" in media_frame.locator("#music-art").evaluate("node => getComputedStyle(node).boxShadow")

        # Simulate Abyss creating/replacing its iframe after the plugin starts.
        page.evaluate("""() => { const f=document.createElement('iframe'); f.className='featurediframe'; f.src='about:blank'; document.querySelector('#homeTab').prepend(f); }""")
        page.wait_for_function("getComputedStyle(document.querySelector('#homeTab > .featurediframe')).display === 'none'")
        assert page.locator(".hssm-owned-media-bar").count() == 1

        page.locator(".hssm-my-list-tab").click()
        page.wait_for_function("document.querySelector('.hssm-top-row[data-hssm-top-row-id=\"main-top-row\"]') && !document.querySelector('.hssm-top-row-message')")
        page.wait_for_selector(".hssm-owned-my-list-page.is-active .hssm-client-card[data-id='liked-one']")
        page.wait_for_selector(".hssm-owned-my-list-page.is-active .hssm-section-media-bar[data-hssm-media-section-id='my-list-content']")
        my_list_frame = page.frame_locator(".hssm-owned-my-list-page.is-active .hssm-section-media-bar[data-hssm-media-section-id='my-list-content']")
        my_list_frame.locator("#logo").wait_for(state="visible")
        my_list_logo_url = my_list_frame.locator("#logo").get_attribute("src")
        assert "/Items/liked-one/Images/Logo" in my_list_logo_url
        assert all("/Images/Backdrop" not in url and "/Images/Primary" not in url and "/Images/Thumb" not in url and "/Images/Banner" not in url for url in [my_list_logo_url])
        assert not ({"maxWidth", "maxHeight", "quality"} & set(parse_qs(urlparse(my_list_logo_url).query)))
        page.wait_for_function("""() => {
          const panel = document.querySelector('.hssm-owned-my-list-page.is-active');
          const container = panel && panel.querySelector('.hssm-my-list-container');
          const bar = container && container.querySelector(':scope > .hssm-section-media-bar[data-hssm-media-section-id="my-list-content"]');
          const row = container && container.querySelector(':scope > [data-hssm-section-id="my-list-content"]');
          return bar && row && Array.from(container.children).indexOf(bar) + 1 === Array.from(container.children).indexOf(row) && getComputedStyle(row).display !== 'none';
        }""")
        my_list_frame.locator("#title").filter(has_text="Z Opaque Logo").wait_for(state="visible", timeout=4000)
        assert my_list_frame.locator("#logo").is_hidden()
        assert page.locator(".hssm-owned-my-list-page.is-active .hssm-section-media-bar[data-hssm-media-section-id='my-list-content']").is_visible()
        assert page.locator(".hssm-owned-my-list-page.is-active [data-hssm-section-id='my-list-content'] .hssm-client-card").count() == 2
        my_list_alignment = page.locator(".hssm-owned-my-list-page.is-active [data-hssm-section-id='my-list-content']").evaluate("section => { const scroller=section.querySelector('.hssm-client-scroller').getBoundingClientRect(), first=section.querySelector('.hssm-client-card').getBoundingClientRect(); return {delta:first.left-scroller.left, owned:section.querySelector('.hssm-owned-horizontal-scroll')!==null}; }")
        assert not my_list_alignment["owned"] and abs(my_list_alignment["delta"]) < 10, my_list_alignment
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
        my_list_title = page.locator(".hssm-owned-my-list-page [data-hssm-section-id='my-list-content'] .hssm-section-title-link")
        assert my_list_title.get_attribute("href") == "#/home"
        assert my_list_title.get_attribute("data-hssm-open-my-list") == "true"
        assert my_list_title.get_attribute("data-hssm-open-section") is None
        my_list_title.evaluate("node => node.click()")
        page.wait_for_function("document.querySelector('.hssm-owned-my-list-page').classList.contains('is-active')")
        assert page.locator(".hssm-my-list-tab").evaluate("button => button.classList.contains('emby-tab-button-active')")
        page.evaluate("document.querySelector('.emby-tab-button[data-index=\"0\"]').click()")
        page.wait_for_function("document.querySelector('#homeTab').classList.contains('is-active')")
        page.wait_for_selector("#indexPage > .hssm-top-row[data-hssm-top-row-id='main-top-row']")
        assert page.locator("#homeTab > .homeSectionsContainer").count() == 1
        assert page.locator("#homeTab .section0").count() == 1
        page.locator(".hssm-custom-page-tab[data-hssm-page-id='manager-page-movies']").click()
        page.wait_for_selector("#indexPage > .hssm-top-row[data-hssm-top-row-id='movies-page-top-row']")
        settings["TopRows"][1]["OverrideMainTopRow"] = False
        page.evaluate("window.HomeScreenManagerClient.invalidate(); window.HomeScreenManagerClient.refresh();")
        page.wait_for_selector("#indexPage > .hssm-top-row[data-hssm-top-row-id='main-top-row']")
        settings["TopRows"][1]["OverrideMainTopRow"] = True
        page.evaluate("window.HomeScreenManagerClient.invalidate(); window.HomeScreenManagerClient.refresh();")
        page.wait_for_selector("#indexPage > .hssm-top-row[data-hssm-top-row-id='movies-page-top-row']")
        page.wait_for_selector(".hssm-owned-custom-page.is-active [data-hssm-section-id='manager-movies-one'] .hssm-client-card")
        page.wait_for_selector(".hssm-owned-custom-page.is-active .hssm-section-media-bar[data-hssm-media-section-id='manager-movies-two']")
        page.wait_for_selector(".hssm-owned-custom-page.is-active [data-hssm-section-id='manager-watch-again'] .hssm-client-card[data-id='watched-movie']")
        page.wait_for_selector(".hssm-owned-custom-page.is-active [data-hssm-section-id='manager-watch-again'] .hssm-client-card[data-id='watched-episode-two']")
        page.wait_for_selector(".hssm-owned-custom-page.is-active .hssm-section-media-bar[data-hssm-media-section-id='manager-watch-again']")
        page.wait_for_function("document.querySelectorAll('.hssm-owned-custom-page.is-active .hssm-section-media-bar').length === 3")
        mixed_title = page.locator(".hssm-owned-custom-page.is-active [data-hssm-section-id='manager-movies-two'] .hssm-section-title-link")
        assert mixed_title.get_attribute("data-hssm-open-section") == "manager-movies-two"
        mixed_title.click()
        page.wait_for_selector(".hssm-section-listing-page .hssm-section-listing-grid .hssm-client-card[data-id='resume-two']")
        assert page.locator(".hssm-section-listing-page h1").inner_text().strip() == "More Movies"
        assert page.locator(".hssm-section-listing-page [data-hssm-section-filter]").count() == 1
        assert page.locator(".hssm-section-listing-page [data-hssm-section-type-filter]").count() == 1
        assert page.locator(".hssm-section-listing-page [data-hssm-section-image-type]").count() == 1
        assert page.locator(".hssm-section-listing-page [data-hssm-section-sort]").count() == 1
        listing_card_width = page.locator(".hssm-section-listing-page .hssm-client-card").first.evaluate("node => node.getBoundingClientRect().width")
        assert 140 <= listing_card_width <= 180, listing_card_width
        page.locator(".hssm-section-listing-page [data-hssm-section-image-type]").select_option("backdrop")
        assert page.locator(".hssm-section-listing-page").evaluate("node => node.classList.contains('hssm-shape-wide')")
        page.locator(".hssm-section-listing-back").click()
        page.wait_for_function("!document.querySelector('.hssm-section-listing-page')")
        custom_media_bars = page.evaluate("""() => { const row=document.querySelector('.hssm-top-row').getBoundingClientRect(); const bars=Array.from(document.querySelectorAll('.hssm-owned-custom-page.is-active .hssm-section-media-bar')); return {firstTop:bars[0].getBoundingClientRect().top,rowBottom:row.bottom,allSymmetric:bars.every(frame=>frame.contentDocument.body.classList.contains('hssm-media-bar-top-gradient') && getComputedStyle(frame.contentDocument.querySelector('#backdrop')).maskImage.includes('36%') && getComputedStyle(frame.contentDocument.querySelector('#backdrop')).maskImage.includes('64%'))}; }""")
        assert custom_media_bars["firstTop"] >= custom_media_bars["rowBottom"] - 1 and custom_media_bars["allSymmetric"], custom_media_bars
        assert page.locator(".hssm-owned-custom-page.is-active [data-hssm-section-id='manager-watch-again'] .hssm-client-card").first.get_attribute("data-id") == "watched-episode-two"
        assert page.locator(".hssm-owned-custom-page.is-active [data-hssm-section-id='manager-watch-again'] .hssm-client-card[data-type='Episode']").count() == 1
        watch_again_episode = page.locator(".hssm-owned-custom-page.is-active [data-hssm-section-id='manager-watch-again'] .hssm-client-card[data-id='watched-episode-two']")
        assert watch_again_episode.locator(".hssm-card-title").inner_text().strip() == "A Completed Episode With A Deliberately Very Long Title For Marquee Testing S01E02 Completed Series"
        assert "/Items/watched-series/Images/Primary" in watch_again_episode.locator(".cardContent").get_attribute("style")
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
        assert {key: value for key, value in custom_page_state.items() if key != "topPadding"} == {"titleAbsent": True, "visibleSections": 6, "hiddenSectionAbsent": True, "mediaBars": 3, "lowerBarMarked": True}, custom_page_state
        assert custom_page_state["topPadding"] >= 60, custom_page_state
        book_card = page.locator(".hssm-owned-custom-page.is-active [data-hssm-section-id='manager-books'] .hssm-client-card[data-id='audio-book-one']")
        assert book_card.locator(".hssm-card-title").inner_text().strip() == "The Long Book"
        assert book_card.locator(".hssm-card-author").inner_text().strip() == "Excellent Author"
        book_art = book_card.locator(".cardContent").evaluate("node => ({fit:getComputedStyle(node).backgroundSize,ratio:node.closest('.cardScalable').getBoundingClientRect().height/node.closest('.cardScalable').getBoundingClientRect().width})")
        assert book_art["fit"] == "contain" and 1.45 <= book_art["ratio"] <= 1.55, book_art
        page.wait_for_selector(".hssm-owned-custom-page.is-active [data-hssm-section-id='manager-recent-songs'] .hssm-client-card[data-id='recent-song-one']")
        assert any("/HomeScreenSectionsManager/recent-listening" in url for url in requests), requests
        page.wait_for_selector(".hssm-owned-custom-page.is-active [data-hssm-section-id='manager-library'] .hssm-client-card[data-id='actual-movie']")
        assert page.locator(".hssm-owned-custom-page.is-active [data-hssm-section-id='manager-library'] .hssm-client-card[data-id='year-folder']").count() == 0
        custom_logo = page.frame_locator(".hssm-section-media-bar[data-hssm-media-section-id='manager-movies-two']").locator("#logo")
        custom_logo.wait_for(state="visible")
        assert "/Items/series-two/Images/Logo" in custom_logo.get_attribute("src")
        page.frame_locator(".hssm-section-media-bar[data-hssm-media-section-id='manager-movies-two']").locator("body.hssm-media-bar-top-gradient").wait_for(state="attached")
        assert any("Filters=IsPlayed" in url and "IncludeItemTypes=Movie" in url for url in requests), requests
        assert any("IncludeItemTypes=Episode" in url and "Filters=IsPlayed" in url for url in requests), requests
        assert any("Ids=watched-series" in url for url in requests), requests
        assert any("Filters=IsPlayed" in url and "SortOrder=Descending" in url for url in requests), requests

        scroll_result = page.locator(".hssm-owned-custom-page.is-active [data-hssm-section-id='manager-watch-again']").evaluate("""section => {
          const scroller=section.querySelector('.hssm-client-scroller');
          section.querySelector('.hssm-client-items').style.width='3600px';
          window.dispatchEvent(new Event('resize'));
          return new Promise(resolve=>setTimeout(()=>{
            const button=section.querySelector('[data-hssm-scroll-direction="right"]');
            const rightWasEnabled=!button.disabled;
            button.click();
            setTimeout(()=>{
              const afterArrow=Number(scroller.dataset.hssmOwnedOffset||0);
              scroller.dispatchEvent(new WheelEvent('wheel',{deltaY:240,bubbles:true,cancelable:true}));
              setTimeout(()=>resolve({afterArrow,afterWheel:Number(scroller.dataset.hssmOwnedOffset||0),transform:getComputedStyle(section.querySelector('.hssm-client-items')).transform,owned:scroller.classList.contains('hssm-owned-horizontal-scroll'),rightWasEnabled}),80);
            },450);
          },180));
        }""")
        assert scroll_result["owned"] and scroll_result["rightWasEnabled"] and scroll_result["afterArrow"] > 0 and scroll_result["afterWheel"] > scroll_result["afterArrow"] and scroll_result["transform"] != "none", scroll_result
        page.locator(".hssm-owned-custom-page.is-active [data-hssm-section-id='manager-watch-again'] .hssm-client-scroller").evaluate("scroller => scroller._hssmSetOwnedOffset(0)")

        custom_card = page.locator(".hssm-owned-custom-page.is-active [data-hssm-section-id='manager-watch-again'] .hssm-client-card[data-id='watched-episode-two']")
        page.wait_for_function("node => node.querySelector('.hssm-card-title bdi').classList.contains('hssm-marquee-title')", arg=custom_card.element_handle())
        marquee_state = custom_card.locator(".hssm-card-title bdi").evaluate("node => ({enabled:document.body.classList.contains('hssm-title-marquee-enabled'),distance:node.style.getPropertyValue('--hssm-marquee-distance'),host:node.closest('.cardText').classList.contains('hssm-marquee-title-host')})")
        assert marquee_state["enabled"] and marquee_state["distance"].startswith("-") and marquee_state["host"], marquee_state
        custom_card.hover()
        page.wait_for_timeout(1200)
        moving_state = custom_card.locator(".hssm-card-title bdi").evaluate("node => ({transform:getComputedStyle(node).transform,transition:getComputedStyle(node).transition,hover:node.closest('.card').matches(':hover'),distance:node.style.getPropertyValue('--hssm-marquee-distance')})")
        assert moving_state["transform"] not in ("none", "matrix(1, 0, 0, 1, 0, 0)"), moving_state
        page.mouse.move(1, 1)
        page.wait_for_function("node => ['none','matrix(1, 0, 0, 1, 0, 0)'].includes(getComputedStyle(node).transform)", arg=custom_card.locator(".hssm-card-title bdi").element_handle())
        custom_card.hover()
        custom_card.locator(".cardOverlayContainer").wait_for(state="visible")
        page.wait_for_function("node => Number(getComputedStyle(node).opacity) > .99", arg=custom_card.locator(".cardOverlayContainer").element_handle())
        custom_card.locator("[data-action='resume']").click()
        assert page.evaluate("window.__playedIds.includes('watched-episode-two')")

        page.locator(".hssm-header-logo-link").click()
        page.wait_for_function("document.querySelector('#homeTab').classList.contains('is-active')")
        assert page.locator(".emby-tab-button[data-index='0']").evaluate("button => button.classList.contains('emby-tab-button-active')")
        assert not page.locator(".hssm-owned-custom-page[data-hssm-page-id='manager-page-movies']").evaluate("panel => panel.classList.contains('is-active')")
        settings["EnableMediaBarSlowZoom"] = False
        settings["Sections"][1]["ShowRankNumbers"] = False
        page.evaluate("window.HomeScreenManagerClient.invalidate(); window.HomeScreenManagerClient.refresh();")
        try:
            page.wait_for_function("document.querySelector('#homeTab > .hssm-owned-media-bar').dataset.hssmAppliedSlowZoom === 'false'", timeout=10000)
        except Exception as error:
            raise AssertionError({
                "message": str(error),
                "errors": page_errors,
                "status": page.evaluate("window.HomeScreenManagerClient.status()"),
                "media": page.locator("#homeTab > .hssm-owned-media-bar").evaluate("node => ({connected:node.isConnected,zoom:node.dataset.hssmAppliedSlowZoom,image:node.dataset.hssmAppliedImageType,display:getComputedStyle(node).display})") if page.locator("#homeTab > .hssm-owned-media-bar").count() else None,
                "recentRequests": requests[-20:],
            }) from error
        page.wait_for_function("document.querySelector('#homeTab > .hssm-owned-media-bar').contentDocument.querySelector('#backdrop-img').getAnimations().length === 0")
        page.wait_for_function("!document.querySelector('#homeTab [data-hssm-section-id=\"manager-home-top\"]').classList.contains('hssm-top-ranked')")
        assert page.locator("#homeTab [data-hssm-section-id='manager-home-top'] .hssm-rank-number").count() == 0
        settings["TopRowAlwaysShow"] = True
        settings["TopRowPersistent"] = True
        settings["TopRows"][0]["Persistent"] = True
        settings["TopRowMessageAlwaysShow"] = True
        settings["TopRowMessagePersistent"] = True
        page.evaluate("window.HomeScreenManagerClient.invalidate(); window.HomeScreenManagerClient.refresh();")
        page.wait_for_function("document.querySelector('.hssm-top-row').classList.contains('hssm-top-row-persistent') && document.querySelector('.hssm-top-row-message').classList.contains('hssm-top-row-message-persistent')")
        persistent_positions = page.evaluate("""() => ({row:getComputedStyle(document.querySelector('.hssm-top-row')).position,message:getComputedStyle(document.querySelector('.hssm-top-row-message')).position})""")
        assert persistent_positions == {"row": "fixed", "message": "fixed"}, persistent_positions
        assert page.locator(".hssm-top-row-message").evaluate("node => node.classList.contains('hssm-top-row-message-marquee')")
        marquee_message = page.locator(".hssm-top-row-message-text").evaluate("node => ({left:getComputedStyle(node).left,iterations:getComputedStyle(node).animationIterationCount,duration:getComputedStyle(node).animationDuration})")
        assert marquee_message["left"] != "auto" and marquee_message["iterations"] == "infinite" and marquee_message["duration"] == "12s", marquee_message
        page.evaluate("window.scrollTo(0, 700)")
        page.wait_for_timeout(100)
        persistent_scroll_geometry = page.evaluate("""() => { const message=document.querySelector('.hssm-top-row-message').getBoundingClientRect(), row=document.querySelector('.hssm-top-row').getBoundingClientRect(), header=document.querySelector('.skinHeader').getBoundingClientRect(); return {messageTop:message.top,messageBottom:message.bottom,rowTop:row.top,rowBottom:row.bottom,headerTop:header.top}; }""")
        assert abs(persistent_scroll_geometry["messageTop"]) < 1 and abs(persistent_scroll_geometry["rowTop"] - persistent_scroll_geometry["messageBottom"]) < 2 and persistent_scroll_geometry["headerTop"] >= persistent_scroll_geometry["rowBottom"] - 1, persistent_scroll_geometry
        page.evaluate("window.scrollTo(0, 0)")
        page.locator(".hssm-top-row").evaluate("node => node.dataset.hssmIdentityTest='retained'")
        page.evaluate("""() => {
          const detail=document.createElement('div');
          detail.id='itemDetailPage';
          detail.className='page libraryPage itemDetailPage';
          detail.style.cssText='box-sizing:border-box;min-height:1200px;padding-top:80px';
          detail.innerHTML='<div class="detailPageWrapperContainer"><div class="detailPagePrimaryContent" data-hssm-test-detail-content>Detail poster and metadata</div></div>';
          document.body.appendChild(detail);
          document.querySelector('#indexPage').classList.add('hide');
          window.__savedApiClient=window.ApiClient;
          window.ApiClient=null;
          location.hash='#/details?id=resume-one';
        }""")
        page.wait_for_function("document.querySelector('#itemDetailPage').classList.contains('hssm-top-chrome-content-offset')")
        assert page.locator(".hssm-top-row").get_attribute("data-hssm-identity-test") == "retained"
        detail_offset = page.evaluate("""() => { const page=document.querySelector('#itemDetailPage'), wrapper=page.querySelector('.detailPageWrapperContainer'), content=page.querySelector('[data-hssm-test-detail-content]'), message=document.querySelector('.hssm-top-row-message').getBoundingClientRect(), row=document.querySelector('.hssm-top-row').getBoundingClientRect(), header=document.querySelector('.skinHeader').getBoundingClientRect(); return {padding:parseFloat(getComputedStyle(page).paddingTop),pageTop:page.getBoundingClientRect().top,contentTop:content.getBoundingClientRect().top,wrapperTransform:getComputedStyle(wrapper).transform,chromeHeight:message.height+row.height,headerTop:header.top,rowBottom:row.bottom,hasSpacer:!!page.querySelector('.hssm-top-row-message-spacer,.hssm-top-row-row-spacer')}; }""")
        detail_clearance = detail_offset["contentTop"] - detail_offset["pageTop"] - detail_offset["padding"]
        assert abs(detail_offset["padding"] - 80) < 2 and 8 <= detail_clearance <= 14 and detail_clearance < detail_offset["chromeHeight"] and detail_offset["wrapperTransform"] != "none" and detail_offset["headerTop"] >= detail_offset["rowBottom"] - 1 and not detail_offset["hasSpacer"], detail_offset
        page.evaluate("window.ApiClient=window.__savedApiClient; delete window.__savedApiClient; window.HomeScreenManagerClient.refresh()")
        page.wait_for_selector(".hssm-top-row[data-hssm-top-row-id='movies-library-top-row']")
        assert page.locator(".hssm-top-row").get_attribute("data-hssm-identity-test") is None
        page.evaluate("""() => { const detail=document.querySelector('#itemDetailPage'); detail.innerHTML='<div class="detailPageWrapperContainer"><div class="detailPagePrimaryContent"><div id="castContent"><div class="card"><div class="cardText">Excellent Author</div><div class="cardText">Composer</div></div></div></div></div>'; location.hash='#/details?id=audio-book-one'; window.HomeScreenManagerClient.refresh(); }""")
        page.wait_for_function("document.querySelector('#castContent .cardText:nth-child(2)').textContent === 'Author'")
        genre_link = page.locator(".hssm-top-row[data-hssm-top-row-id='movies-library-top-row'] .hssm-top-row-card[data-id='genre-drama'] .itemAction")
        genre_link.wait_for(state="attached")
        assert "genreIds=genre-drama" in genre_link.get_attribute("href") and "topParentId=library-one" in genre_link.get_attribute("href")
        page.wait_for_function("document.querySelector('.hssm-top-row') && document.querySelector('.hssm-top-row-message')")
        page.evaluate("location.hash='#/video'")
        page.wait_for_function("!document.querySelector('.hssm-top-row') && !document.querySelector('.hssm-top-row-message')")
        page.evaluate("document.querySelector('#itemDetailPage').remove(); document.querySelector('#indexPage').classList.remove('hide'); location.hash='#/home'")
        page.wait_for_selector(".hssm-top-row[data-hssm-top-row-id='main-top-row']")
        page.wait_for_function("document.querySelector('.hssm-top-row-message')")
        settings["HideFavorites"] = True
        settings["EnableTitleMarquee"] = False
        settings["PageOrder"] = ["home", "hidden:favorites", "my-list", "manager-page-movies"]
        page.evaluate("window.HomeScreenManagerClient.invalidate(); window.HomeScreenManagerClient.refresh();")
        page.wait_for_function("document.querySelector('.emby-tab-button[data-index=\"1\"]').classList.contains('hssm-hidden-page-tab')")
        page.wait_for_function("!document.body.classList.contains('hssm-title-marquee-enabled') && !document.querySelector('.hssm-marquee-title')")
        assert any("Filters=Likes" in url and "ParentId=library-one" in url for url in requests), requests
        assert not page_errors, page_errors
        browser.close()


if __name__ == "__main__":
    run()
    print("browser contract passed")
