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
            """
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
                  if(String(url).includes('Plugins')) return Promise.resolve([]);
                  if(String(url).includes('Branding/Configuration')) return Promise.resolve({CustomCss:''});
                  return Promise.resolve({Items:[]});
                },
                ajax:(options)=> {
                  const body = options.data ? JSON.parse(options.data) : {};
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
              window.CustomElements = { upgradeSubtree(){} };
            }
            """
        )
        page.set_content(DASHBOARD.read_text())
        page.wait_for_selector("#hssmPageList [data-page-id='home']", state="attached")
        page.wait_for_selector("#hssmSectionPageSelect option[value='manager-page-movies']", state="attached")

        assert page.locator("#hssmPageList [data-page-id='home'] [data-hssm-page-show]").count() == 0
        assert page.locator("#hssmPageList [data-page-id='my-list'] .hssm-badge-manager").count() == 1

        page.locator("[data-tab='create-sections']").click()
        page.locator("#hssmSectionList [data-section-id='manager-one']").click()
        assert page.locator("#hssmMoveSectionButton").is_enabled()
        page.locator("#hssmMoveSectionButton").click()
        page.locator("#hssmMoveSectionPage").select_option("manager-page-movies")
        page.locator("#hssmConfirmMoveSectionButton").click()
        page.wait_for_function("window.__sectionSettings.Sections.find(s => s.Id === 'manager-one').PageId === 'manager-page-movies'")

        page.locator("[data-tab='create-pages']").click()
        page.locator("#hssmPageList [data-page-id='manager-page-movies']").click()
        page.locator("#hssmAddPageButton").click()
        page.locator("#hssmPageTitleInput").fill("Shows")
        page.locator("#hssmSavePageButton").click()
        page.wait_for_function("window.__sectionSettings.Pages.some(p => p.Name === 'Shows')")

        page.locator("[data-tab='create-sections']").click()
        page.locator("#hssmAddSectionButton").click()
        assert page.locator("#hssmNewSectionSettings").is_visible()
        assert page.locator("input[name='hssmMediaBarSection'][value='yes']").count() == 1
        assert not page_errors, page_errors
        browser.close()


if __name__ == "__main__":
    run()
    print("dashboard contract passed")
