from __future__ import annotations

from pathlib import Path

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]
DASHBOARD = ROOT / "Home Screen Sections Manager" / "Configuration" / "configPage.html"


def run() -> None:
    page_errors: list[str] = []
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1440, "height": 1000})
        page.on("pageerror", lambda error: page_errors.append(str(error)))
        page.goto("about:blank")
        page.evaluate(
            r"""
            () => {
              window.__sectionSettings = {
                JellyfinSectionLabelColor:'#00a4dc', ManagerSectionLabelColor:'#aa5cc3', MediaBarSectionLabelColor:'#c78000',
                EnableMyList:true, HideFavorites:false,
                Pages:[{Id:'my-list',Name:'My List'},{Id:'manager-page-movies',Name:'Movies'}],
                PageOrder:['home','favorites','my-list','manager-page-movies'],
                Sections:[
                  {Id:'manager-one',Name:'Home Picks',PageId:'home',Type:'manual-content',ItemIds:['one'],SourceIds:[],IsApplied:true,IsVisible:true,IsMediaBar:false},
                  {Id:'manager-two',Name:'Movie Picks',PageId:'manager-page-movies',Type:'manual-content',ItemIds:['two'],SourceIds:[],IsApplied:true,IsVisible:true,IsMediaBar:true}
                ],
                SectionOrder:['jellyfin-0-resume','manager-one'],
                PageLayouts:[
                  {PageId:'home',SectionOrder:['jellyfin-0-resume','manager-one']},
                  {PageId:'manager-page-movies',SectionOrder:['manager-two']}
                ]
              };
              window.__mainSettings = {EnableMyList:true,HideFavorites:false,EnableRemoveContinueNextUp:false,EnableSeriesInfo:false,InfiniteScrollLibraryIds:[],EnableCollectionsOnDetailPage:false,EnableEnhancedSearch:false,EnableBreadcrumbs:false};
              window.__applyCalls = [];
              window.Dashboard = { alert(){}, showLoadingMsg(){}, hideLoadingMsg(){} };
              window.ApiClient = {
                getCurrentUserId:()=> 'user', serverId:()=> 'server',
                getUrl:(path)=>path,
                getJSON:(url)=> {
                  if(String(url).includes('section-settings')) return Promise.resolve(structuredClone(window.__sectionSettings));
                  if(String(url).includes('main-settings')) return Promise.resolve(structuredClone(window.__mainSettings));
                  if(String(url).includes('customization-settings')) return Promise.resolve({});
                  if(String(url).includes('DisplayPreferences')) return Promise.resolve({CustomPrefs:{homesection0:'resume'}});
                  if(String(url).includes('Users/user/Views')) return Promise.resolve({Items:[{Id:'library',Name:'Movies',CollectionType:'movies'}]});
                  if(String(url).includes('Plugins')) return Promise.resolve([{Name:'JavaScript Injector',Id:'injector'}]);
                  if(String(url).includes('Branding/Configuration')) return Promise.resolve({CustomCss:''});
                  return Promise.resolve({Items:[]});
                },
                ajax:(options)=> {
                  const body = options.data ? JSON.parse(options.data) : {};
                  const applyMatch = String(options.url).match(/sections\/([^/]+)\/apply/);
                  if(applyMatch) {
                    const id = decodeURIComponent(applyMatch[1]);
                    const section = window.__sectionSettings.Sections.find(item => item.Id === id);
                    if(section) Object.assign(section, body, {IsApplied:true});
                    window.__applyCalls.push({id, body});
                  }
                  if(String(options.url).includes('section-settings')) window.__sectionSettings = Object.assign({}, window.__sectionSettings, body);
                  if(String(options.url).includes('main-settings')) window.__mainSettings = Object.assign({}, window.__mainSettings, body);
                  return Promise.resolve(body);
                },
                getDisplayPreferences:()=>Promise.resolve({CustomPrefs:{homesection0:'resume'}}),
                getCurrentUser:()=>Promise.resolve({Configuration:{LatestItemsExcludes:[]}}),
                getUserViews:()=>Promise.resolve({Items:[{Id:'library',Name:'Movies',CollectionType:'movies'}]}),
                getPluginConfiguration:()=>Promise.resolve({CustomJavaScripts:[]}),
                updatePluginConfiguration:()=>Promise.resolve()
              };
              window.HomeScreenManagerClient = { version:'0.1.0.36', refresh(){} };
              window.CustomElements = { upgradeSubtree(){} };
            }
            """
        )
        page.set_content(DASHBOARD.read_text())
        page.wait_for_selector("#hssmPageList [data-page-id='home']", state="attached")
        page.wait_for_selector("#hssmSectionPageSelect option[value='manager-page-movies']", state="attached")

        assert page.locator("#hssmPageList [data-page-id='home'] [data-hssm-page-show]").count() == 0
        assert page.locator("#hssmPageList [data-page-id='home'] .hssm-drag-handle").text_content() == ""
        assert page.locator("#hssmPageList [data-page-id='my-list'] .hssm-badge-manager").count() == 1
        page.locator("[data-tab='create-pages']").click()
        favorites_show_x = page.locator("#hssmPageList [data-page-id='favorites'] .hssm-native-section-toggle").bounding_box()["x"]
        my_list_show_x = page.locator("#hssmPageList [data-page-id='my-list'] .hssm-native-section-toggle").bounding_box()["x"]
        assert abs(favorites_show_x - my_list_show_x) < 1

        page.locator("[data-tab='create-sections']").click()
        native_show_x = page.locator("#hssmSectionList [data-section-id^='jellyfin-'] .hssm-native-section-toggle").first.bounding_box()["x"]
        manager_show_x = page.locator("#hssmSectionList [data-section-id='manager-one'] .hssm-native-section-toggle").bounding_box()["x"]
        assert abs(native_show_x - manager_show_x) < 1

        page.locator("#hssmSectionPageSelect").select_option("my-list")
        page.wait_for_selector("#hssmSectionList [data-section-id='my-list-content']")
        assert page.locator("#hssmSectionList .hssm-section-row").first.get_attribute("data-section-id") == "my-list-content"
        assert page.locator("#hssmSectionList [data-section-id='my-list-content']").get_attribute("draggable") == "true"
        page.locator("#hssmSectionList [data-section-id='my-list-content']").click()
        assert page.locator("#hssmEditSectionButton").is_enabled()
        page.locator("#hssmEditSectionButton").click()
        page.wait_for_selector("input[name='hssmType'][value='my-list-content']:checked")
        page.locator("input[name='hssmMediaBarSection'][value='yes']").check()
        assert page.locator("#hssmSectionList [data-section-id='my-list-content'] .hssm-badge-media").count() == 1
        page.locator("#hssmFinishSectionButton").click()
        page.wait_for_selector("#hssmTypeSpecificSettings >> text=No content selection is required.")
        assert page.locator("#hssmTypeSpecificSettings [data-hssm-content]").count() == 0
        page.locator("#hssmTypeSpecificSettings [data-hssm-save-move]").click()
        page.wait_for_function("window.__sectionSettings.Sections.some(s => s.Id === 'my-list-content' && s.PageId === 'my-list' && s.IsMediaBar === true && s.ItemIds.length === 0)")
        assert page.locator("#hssmTypeSpecificSettings [data-hssm-apply-section]").text_content().strip() == "Refresh Section"
        my_list_count = page.evaluate("window.__sectionSettings.Sections.filter(s => s.Id === 'my-list-content').length")
        page.locator("#hssmTypeSpecificSettings [data-hssm-apply-section]").click()
        page.wait_for_function("window.__applyCalls.some(call => call.id === 'my-list-content' && call.body.IsMediaBar === true)")
        page.wait_for_function("document.querySelector('[data-hssm-apply-status]').textContent === 'Section refreshed.'")
        assert page.evaluate("window.__sectionSettings.Sections.filter(s => s.Id === 'my-list-content').length") == my_list_count
        assert page.evaluate("window.__sectionSettings.Sections.find(s => s.Id === 'my-list-content').IsApplied === true")

        page.locator("#hssmSectionPageSelect").select_option("home")
        page.wait_for_selector("#hssmSectionList [data-section-id='manager-one']")
        page.locator("#hssmSectionList [data-section-id='manager-one']").click()
        assert page.locator("#hssmMoveSectionButton").is_enabled()
        assert page.locator("#hssmCopySectionButton").is_enabled()
        page.locator("#hssmCopySectionButton").click()
        page.locator("#hssmCopySectionPage").select_option("manager-page-movies")
        page.locator("#hssmConfirmCopySectionButton").click()
        page.wait_for_function("window.__sectionSettings.Sections.filter(s => s.PageId === 'manager-page-movies').length === 2")
        assert page.evaluate("window.__sectionSettings.Sections.some(s => s.Id === 'manager-one' && s.PageId === 'home')")
        page.locator("#hssmMoveSectionButton").click()
        page.locator("#hssmMoveSectionPage").select_option("manager-page-movies")
        page.locator("#hssmConfirmMoveSectionButton").click()
        page.wait_for_function("window.__sectionSettings.Sections.find(s => s.Id === 'manager-one').PageId === 'manager-page-movies'")

        page.locator("#hssmSectionPageSelect").select_option("manager-page-movies")
        page.locator("#hssmAddSectionButton").click()
        draft_id = page.locator("#hssmSectionList [data-hssm-inline-section-name]").locator("xpath=ancestor::*[@data-section-id]").get_attribute("data-section-id")
        assert page.locator(f"#hssmSectionList [data-section-id='{draft_id}'] .hssm-badge-media").count() == 0
        page.locator("input[name='hssmMediaBarSection'][value='yes']").check()
        assert page.locator(f"#hssmSectionList [data-section-id='{draft_id}'] .hssm-badge-media").count() == 1
        page.locator("input[name='hssmMediaBarSection'][value='no']").check()
        assert page.locator(f"#hssmSectionList [data-section-id='{draft_id}'] .hssm-badge-media").count() == 0

        page.locator("[data-tab='create-pages']").click()
        page.locator("#hssmPageList [data-page-id='manager-page-movies']").click()
        page.locator("#hssmDeletePageButton").click()
        page.wait_for_function("!window.__sectionSettings.Pages.some(p => p.Id === 'manager-page-movies')")
        assert page.evaluate("!window.__sectionSettings.Sections.some(s => s.PageId === 'manager-page-movies')")
        page.locator("#hssmUndoDeletePageButton").click()
        page.wait_for_function("window.__sectionSettings.Pages.some(p => p.Id === 'manager-page-movies')")
        assert page.evaluate("window.__sectionSettings.Sections.filter(s => s.PageId === 'manager-page-movies').length === 3")
        page.locator("#hssmPageList [data-page-id='manager-page-movies']").click()
        page.locator("#hssmAddPageButton").click()
        page.locator("#hssmPageTitleInput").fill("Shows")
        page.locator("#hssmSavePageButton").click()
        page.wait_for_function("window.__sectionSettings.Pages.some(p => p.Name === 'Shows')")

        page.locator("[data-tab='create-sections']").click()
        page.locator("#hssmSectionPageSelect").select_option("manager-page-movies")
        page.wait_for_selector("#hssmSectionList [data-section-id='manager-two']")
        page.locator("#hssmAddSectionButton").click()
        created_id = page.locator("#hssmSectionList [data-hssm-inline-section-name]").locator("xpath=ancestor::*[@data-section-id]").get_attribute("data-section-id")
        page.locator("#hssmSectionList [data-hssm-inline-section-name]").fill("My List Spotlight")
        page.locator("input[name='hssmType'][value='my-list-content']").check()
        page.locator("#hssmFinishSectionButton").click()
        page.wait_for_selector("#hssmTypeSpecificSettings >> text=No content selection is required.")
        assert page.locator("#hssmTypeSpecificSettings [data-hssm-content]").count() == 0
        page.locator("#hssmTypeSpecificSettings [data-hssm-save-move]").click()
        page.wait_for_function("([id]) => window.__sectionSettings.Sections.some(s => s.Id === id && s.PageId === 'manager-page-movies' && s.ItemIds.length === 0)", arg=[created_id])
        assert not page.evaluate("([id]) => window.__sectionSettings.Sections.some(s => s.Id === id && s.PageId === 'home')", [created_id])
        assert page.locator("#hssmNewSectionSettings").is_visible()
        assert page.locator("input[name='hssmMediaBarSection'][value='yes']").count() == 1
        assert page.locator("#hssmSectionList .hssm-badge-media").count() == 1
        assert not page_errors, page_errors
        browser.close()


if __name__ == "__main__":
    run()
    print("dashboard contract passed")
