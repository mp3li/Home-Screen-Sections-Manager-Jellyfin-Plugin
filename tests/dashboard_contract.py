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
        page.set_default_timeout(8000)
        page.on("pageerror", lambda error: page_errors.append((error.stack or str(error))))
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
                  {Id:'manager-top',Name:'Top 20 in Foreign Collection',PageId:'home',Type:'top-10-50',ItemIds:['stale-one'],SourceIds:['collection|foreign'],Drafts:[{Id:'top-draft-manager-top',SourceType:'top',SourceId:'combined',Name:'Top 20'}],DisplayTopCount:20,ShowRankNumbers:true,IsApplied:true,IsVisible:true,IsMediaBar:false},
                  {Id:'manager-two',Name:'Movie Picks',PageId:'manager-page-movies',Type:'manual-content',ItemIds:['two'],SourceIds:[],IsApplied:true,IsVisible:true,IsMediaBar:true}
                ],
                SectionOrder:['jellyfin-0-resume','manager-one','manager-top'],
                PageLayouts:[
                  {PageId:'home',SectionOrder:['jellyfin-0-resume','manager-one','manager-top']},
                  {PageId:'manager-page-movies',SectionOrder:['manager-two']}
                ]
              };
              window.__mainSettings = {EnableMyList:true,HideFavorites:false,EnableRemoveContinueNextUp:false,EnableSeriesInfo:false,InfiniteScrollLibraryIds:[],EnableCollectionsOnDetailPage:false,EnableEnhancedSearch:false,EnableBreadcrumbs:false};
              window.__topRowSettings = {
                EnableTopRow:false,
                TopRowPageIds:['home'],
                TopRowSection:{Id:'top-row',Name:'Top Row',PageId:'home',Type:'multiple-collections-in-a-row',SourceIds:[],ItemIds:[],ContentOrder:'manual',ArtSize:'extra-small',ArtType:'automatic',ArtShape:'wide',ShowText:false,ShowSectionName:false,IsVisible:true,IsMediaBar:false,IsApplied:false}
              };
              window.__customizationSettings = {};
              window.__applyCalls = [];
              window.__brandingWrites = [];
              window.Dashboard = { alert(){}, showLoadingMsg(){}, hideLoadingMsg(){} };
              window.ApiClient = {
                getCurrentUserId:()=> 'user', serverId:()=> 'server',
                getUrl:(path)=>path,
                getJSON:(url)=> {
                  if(String(url).includes('top-row-settings')) return Promise.resolve(structuredClone(window.__topRowSettings));
                  if(String(url).includes('section-settings')) return Promise.resolve(structuredClone(window.__sectionSettings));
                  if(String(url).includes('main-settings')) return Promise.resolve(structuredClone(window.__mainSettings));
                  if(String(url).includes('customization-settings')) return Promise.resolve(structuredClone(window.__customizationSettings));
                  if(String(url).includes('DisplayPreferences')) return Promise.resolve({CustomPrefs:{homesection0:'resume'}});
                  if(String(url).includes('Users/user/Views')) return Promise.resolve({Items:[{Id:'library',Name:'Movies',CollectionType:'movies'}]});
                  if(String(url).includes('CollectionManager/settings/main')) return Promise.resolve({Configuration:{},Libraries:[{ItemId:'library',Name:'Movies'}]});
                  if(String(url).includes('CollectionManager/art/collections')) return Promise.resolve([{Id:'foreign',Name:'Foreign Collection',MediaItems:20}]);
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
                    if(section) {
                      const applied = Object.assign({}, body);
                      if(applied.ItemIds === null) delete applied.ItemIds;
                      Object.assign(section, applied, {IsApplied:true});
                      if(section.Type === 'top-10-50' && section.Drafts && section.Drafts.length && body.Name) section.Drafts[0].Name = body.Name;
                    }
                    window.__applyCalls.push({id, body});
                  }
                  if(String(options.url).includes('section-settings')) window.__sectionSettings = Object.assign({}, window.__sectionSettings, body);
                  if(String(options.url).includes('top-row-settings')) window.__topRowSettings = Object.assign({}, window.__topRowSettings, body);
                  if(String(options.url).includes('main-settings')) window.__mainSettings = Object.assign({}, window.__mainSettings, body);
                  if(String(options.url).includes('customization-settings')) window.__customizationSettings = Object.assign({}, window.__customizationSettings, body);
                  if(String(options.url).includes('System/Configuration/Branding')) window.__brandingWrites.push(body);
                  return Promise.resolve(body);
                },
                getDisplayPreferences:()=>Promise.resolve({CustomPrefs:{homesection0:'resume'}}),
                getCurrentUser:()=>Promise.resolve({Configuration:{LatestItemsExcludes:[]}}),
                getUserViews:()=>Promise.resolve({Items:[{Id:'library',Name:'Movies',CollectionType:'movies'}]}),
                getPluginConfiguration:()=>Promise.resolve({CustomJavaScripts:[]}),
                updatePluginConfiguration:()=>Promise.resolve()
              };
              window.HomeScreenManagerClient = { version:'0.1.0.48', refresh(){} };
              window.CustomElements = { upgradeSubtree(){} };
            }
            """
        )
        page.set_content(DASHBOARD.read_text())
        page.wait_for_selector("#hssmPageList [data-page-id='home']", state="attached")
        page.wait_for_selector("#hssmSectionPageSelect option[value='manager-page-movies']", state="attached")

        assert page.get_by_text("Marquee Effect on Titles Settings", exact=True).count() == 1
        assert page.get_by_text("Select your preference for turning on and off the marquee feature when you hover on media items. Meaning, the title will slowly scroll instead of being truncated/cut off if its too long.", exact=True).count() == 1
        assert page.locator("#hssmEnableTitleMarquee").is_checked()
        assert not page.locator("#hssmDisableTitleMarquee").is_checked()
        assert page.locator("#hssmTitleMarqueeSpeed").input_value() == "normal"
        assert page.locator("#hssmTitleMarqueeSpeed option").all_text_contents() == ["Extra Slow", "Slow", "Normal Speed", "Fast", "Faster"]
        page.locator("#hssmTitleMarqueeSpeed").select_option("fast")
        page.locator("#hssmDisableTitleMarquee").check()
        assert not page.locator("#hssmEnableTitleMarquee").is_checked()
        page.locator("#hssmSaveMainSettingsButton").click()
        page.wait_for_function("window.__mainSettings.EnableTitleMarquee === false")
        assert page.evaluate("window.__mainSettings.TitleMarqueeSpeed") == "fast"

        page.locator("[data-tab='top-row-settings']").click()
        assert page.get_by_text("Enable or Disable Top Row Settings", exact=True).count() == 1
        assert page.get_by_text("Select if you want to enable or disable the Top Row section.", exact=True).count() == 1
        assert page.locator("#hssmDisableTopRow").is_checked()
        assert not page.locator("#hssmEnableTopRow").is_checked()
        assert page.locator("#hssmTopRowPagePicker [data-hssm-top-row-page]").count() == 4
        assert page.locator("#hssmTopRowPagePicker [data-hssm-top-row-page='home']").is_checked()
        assert not page.locator("#hssmTopRowPagePicker [data-hssm-top-row-page='favorites']").is_checked()
        assert page.locator("#hssmTopRowTypePicker .hssm-type-option .checkboxContainer span").all_text_contents() == ["Collections in a Row", "Libraries in a Row"]
        type_spacing = page.locator("#hssmTopRowTypePicker .hssm-type-option").first.evaluate("node => { const label=node.querySelector('.checkboxContainer').getBoundingClientRect(), description=node.querySelector('.fieldDescription').getBoundingClientRect(); return {display:getComputedStyle(node.querySelector('.fieldDescription')).display,gap:description.top-label.bottom}; }")
        assert type_spacing["display"] == "block" and type_spacing["gap"] >= 0, type_spacing
        picker_spacing = page.locator("#hssmTopRowSourcePicker").evaluate("node => { const group=node.closest('.hssm-top-row-picker-group').getBoundingClientRect(), previous=node.closest('.hssm-top-row-picker-group').previousElementSibling.getBoundingClientRect(), order=node.closest('.hssm-top-row-picker-group').nextElementSibling.getBoundingClientRect(); return {afterTypes:group.top-previous.bottom,beforeOrder:order.top-group.bottom}; }")
        assert picker_spacing["afterTypes"] >= 15 and picker_spacing["beforeOrder"] >= 15, picker_spacing
        assert page.locator("#hssmTopRowArtSize").input_value() == "extra-small"
        assert page.locator("#hssmTopRowArtSize").is_disabled()
        assert "Poster / Tall Rectangle" not in page.locator("#hssmTopRowArtShape option").all_text_contents()
        assert page.locator("#hssmTopRowSettingsPanel [data-hssm-show-text]").count() == 0
        assert page.locator("#hssmTopRowSettingsPanel [data-hssm-show-section-name]").count() == 0
        assert not page.locator("#hssmTopRowDisplayLogosOnly").is_checked()
        logo_description_link = page.get_by_text("Collection Manager", exact=True)
        assert logo_description_link.get_attribute("href") == "https://github.com/mp3li/Collection-Manager-Jellyfin-Plugin"
        page.locator("#hssmEnableTopRow").check()
        page.locator("#hssmTopRowPagePicker [data-hssm-top-row-page='manager-page-movies']").check()
        page.locator("#hssmTopRowSourcePicker [data-hssm-top-row-source='foreign']").check()
        page.locator("#hssmTopRowArtType").select_option("thumb")
        page.locator("#hssmTopRowArtShape").select_option("circle")
        page.locator("#hssmTopRowDisplayLogosOnly").check()
        page.locator("#hssmSaveTopRowButton").click()
        page.wait_for_function("window.__topRowSettings.EnableTopRow === true && window.__topRowSettings.TopRowSection.SourceIds[0] === 'foreign'")
        assert page.evaluate("window.__topRowSettings.TopRowPageIds") == ["home", "manager-page-movies"]
        assert page.evaluate("window.__topRowSettings.TopRowSection.ArtSize") == "extra-small"
        assert page.evaluate("window.__topRowSettings.TopRowSection.ShowText") is False
        assert page.evaluate("window.__topRowSettings.TopRowSection.ShowSectionName") is False
        assert page.evaluate("window.__topRowSettings.TopRowSection.IsMediaBar") is False
        assert page.evaluate("window.__topRowSettings.TopRowSection.DisplayLogosOnly") is True
        assert page.locator("#hssmSaveTopRowButton").text_content().strip() == "Refresh Top Row"

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

        page.locator("#hssmSectionList [data-section-id^='jellyfin-']").first.click()
        assert page.locator("#hssmEditSectionButton").is_enabled()
        page.locator("#hssmEditSectionButton").click()
        page.get_by_text("Only its art appearance can be edited.", exact=False).wait_for()
        assert page.locator("#hssmNewSectionSettings").is_visible()
        assert page.locator("#hssmNewSectionSettings").evaluate("node => node.classList.contains('hssm-native-only')")
        assert page.locator("#hssmNewSectionSettings > .hssm-conditional-section").first.is_hidden()
        assert page.locator("#hssmTypeSpecificSettings [data-hssm-content-order]").count() == 0
        page.locator("#hssmTypeSpecificSettings [data-hssm-art-size]").select_option("large")
        page.locator("#hssmTypeSpecificSettings [data-hssm-art-shape]").select_option("circle")
        page.locator("#hssmTypeSpecificSettings [data-hssm-show-text]").uncheck()
        assert page.locator("#hssmTypeSpecificSettings [data-hssm-show-section-name]").is_checked()
        page.locator("#hssmTypeSpecificSettings [data-hssm-show-section-name]").uncheck()
        page.locator("#hssmTypeSpecificSettings [data-hssm-apply-section]").click()
        page.wait_for_function("window.__sectionSettings.Sections.some(s => String(s.Id).startsWith('jellyfin-') && s.ArtSize === 'large' && s.ArtShape === 'circle' && s.ShowText === false && s.ShowSectionName === false)")

        page.locator("#hssmSectionList [data-section-id='manager-top']").click()
        page.locator("#hssmEditSectionButton").click()
        page.wait_for_selector("input[name='hssmType'][value='top-10-50']:checked")
        assert page.locator("#hssmSectionList [data-section-id='manager-top'] [data-hssm-inline-section-name]").evaluate("input => input.selectionStart === input.value.length && input.selectionEnd === input.value.length")
        inline_top_name = "Top 20 Inline Title Works"
        page.locator("#hssmSectionList [data-section-id='manager-top'] [data-hssm-inline-section-name]").fill(inline_top_name)
        page.wait_for_function("name => { const section=window.__sectionSettings.Sections.find(s => s.Id === 'manager-top'); return section.Name === name && section.Drafts[0].Name === name; }", arg=inline_top_name)
        page.locator("#hssmFinishSectionButton").click()
        page.wait_for_function("!document.querySelector('#hssmTypeSpecificSettings [data-hssm-save-move]').disabled")
        assert page.locator("#hssmTypeSpecificSettings [data-hssm-content-order]").input_value() == "rating-descending"
        revised_top_name = "Top 20 in Foreign Collection - My Picks"
        page.locator("#hssmTypeSpecificSettings [data-hssm-top-draft-name]").fill(revised_top_name)
        page.wait_for_function("name => { const section=window.__sectionSettings.Sections.find(s => s.Id === 'manager-top'); return section.Name === name && section.Drafts[0].Name === name; }", arg=revised_top_name)
        page.locator("#hssmTypeSpecificSettings [data-hssm-display-top]").select_option("30")
        assert page.locator("#hssmTypeSpecificSettings [data-hssm-top-draft-name]").input_value() == revised_top_name
        page.evaluate("document.querySelector('#hssmTypeSpecificSettings [data-hssm-art-settings]').hidden = false")
        page.locator("#hssmTypeSpecificSettings [data-hssm-rank-numbers][value='yes']").check()
        page.locator("#hssmTypeSpecificSettings [data-hssm-rank-color-mode]").select_option("horizontal-gradient")
        page.locator("#hssmTypeSpecificSettings [data-hssm-rank-color-one]").fill("#112233")
        page.locator("#hssmTypeSpecificSettings [data-hssm-rank-color-two]").fill("#445566")
        page.locator("#hssmTypeSpecificSettings [data-hssm-rank-shadow-color]").fill("#778899")
        page.locator("#hssmTypeSpecificSettings [data-hssm-apply-section]").click()
        page.wait_for_function("window.__applyCalls.some(call => call.id === 'manager-top')")
        assert page.evaluate("window.__applyCalls.find(call => call.id === 'manager-top').body.ItemIds === null")
        assert page.evaluate("window.__applyCalls.find(call => call.id === 'manager-top').body.ContentOrder") == "rating-descending"
        assert page.evaluate("window.__applyCalls.find(call => call.id === 'manager-top').body.ShowRankNumbers") is True
        assert page.evaluate("window.__applyCalls.find(call => call.id === 'manager-top').body.RankNumberColorMode") == "horizontal-gradient"
        assert page.evaluate("window.__applyCalls.find(call => call.id === 'manager-top').body.RankNumberShadowColor") == "#778899"
        assert page.evaluate("window.__applyCalls.find(call => call.id === 'manager-top').body.Name") == revised_top_name
        assert page.evaluate("window.__sectionSettings.Sections.find(s => s.Id === 'manager-top').ItemIds[0]") == "stale-one"
        assert page.evaluate("window.__sectionSettings.Sections.find(s => s.Id === 'manager-top').Name") == revised_top_name
        assert page.evaluate("window.__sectionSettings.Sections.find(s => s.Id === 'manager-top').Drafts[0].Name") == revised_top_name

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
        page.wait_for_function("([id]) => window.__sectionSettings.Sections.some(s => s.Id === id && s.PageId === 'manager-page-movies' && s.ItemIds.length === 0 && s.ShowSectionName === true)", arg=[created_id])
        assert page.locator("#hssmTypeSpecificSettings [data-hssm-show-section-name]").is_checked()
        assert not page.evaluate("([id]) => window.__sectionSettings.Sections.some(s => s.Id === id && s.PageId === 'home')", [created_id])
        assert page.locator("#hssmNewSectionSettings").is_visible()
        assert page.locator("input[name='hssmMediaBarSection'][value='yes']").count() == 1
        assert page.locator("#hssmSectionList .hssm-badge-media").count() == 1

        page.locator("#hssmAddSectionButton").click()
        watch_again_id = page.locator("#hssmSectionList [data-hssm-inline-section-name]").locator("xpath=ancestor::*[@data-section-id]").get_attribute("data-section-id")
        page.locator("#hssmSectionList [data-hssm-inline-section-name]").fill("Watch Again")
        page.locator("input[name='hssmType'][value='watch-again']").check()
        assert page.locator("#hssmFinishSectionButton").text_content().strip() == "Continue to Section Settings"
        page.locator("#hssmFinishSectionButton").click()
        page.get_by_text("No content selection is required. This section automatically loads completed movies plus only the most recently completed episode from each series in the signed-in user’s own Jellyfin watch history.", exact=True).wait_for()
        assert page.locator("#hssmTypeSpecificSettings [data-hssm-content]").count() == 0
        order_labels = page.locator("#hssmTypeSpecificSettings [data-hssm-content-order] option").all_text_contents()
        assert "Most Recently Completed" in order_labels
        assert "Least Recently Completed" in order_labels
        page.locator("#hssmTypeSpecificSettings [data-hssm-save-move]").click()
        page.wait_for_function(
            "([id]) => window.__sectionSettings.Sections.some(s => s.Id === id && s.Type === 'watch-again' && s.PageId === 'manager-page-movies' && s.ContentOrder === 'completed-descending' && s.ItemIds.length === 0 && s.SourceIds.length === 0)",
            arg=[watch_again_id],
        )
        page.locator("#hssmTypeSpecificSettings [data-hssm-content-order]").select_option("completed-ascending")
        page.locator("#hssmTypeSpecificSettings [data-hssm-apply-section]").click()
        page.wait_for_function("([id]) => window.__sectionSettings.Sections.some(s => s.Id === id && s.ContentOrder === 'completed-ascending')", arg=[watch_again_id])

        page.locator("#hssmAddSectionButton").click()
        page.locator("#hssmSectionList [data-hssm-inline-section-name]").fill("Top 20 in Foreign Collection")
        page.locator("input[name='hssmType'][value='top-10-50']").check()
        page.locator("#hssmFinishSectionButton").click()
        page.wait_for_selector("#hssmTypeSpecificSettings [data-hssm-top-draft-name]")
        assert page.locator("#hssmTypeSpecificSettings [data-hssm-top-draft-name]").input_value() == "Top 20 in Foreign Collection"
        page.locator("#hssmTypeSpecificSettings [data-hssm-display-top]").select_option("20")
        assert page.locator("#hssmTypeSpecificSettings [data-hssm-top-draft-name]").input_value() == "Top 20 in Foreign Collection"

        page.locator("[data-tab='customization-settings']").click()
        assert page.get_by_text("Media Bar Slow Zoom Settings", exact=True).count() == 1
        assert page.locator("#hssmEnableMediaBarSlowZoom").is_checked()
        page.locator("#hssmDisableMediaBarSlowZoom").check()
        page.locator("#hssmAbyssAccentColor").fill("#12ab34")
        page.locator("#hssmSidebarIconColorMode").select_option("horizontal-gradient")
        page.locator("#hssmSidebarIconColorOne").fill("#112233")
        page.locator("#hssmSidebarIconColorTwo").fill("#445566")
        page.locator("#hssmSaveCustomizationButton").click()
        page.wait_for_function("window.__brandingWrites.length > 0")
        assert page.evaluate("window.__customizationSettings.EnableMediaBarSlowZoom") is False
        generated_css = page.evaluate("window.__brandingWrites.at(-1).CustomCss || window.__brandingWrites.at(-1).customCss")
        assert "background: linear-gradient(to right, #112233, #445566)" in generated_css
        assert "-webkit-text-fill-color: #12ab34" in generated_css
        assert not page_errors, page_errors
        browser.close()


if __name__ == "__main__":
    run()
    print("dashboard contract passed")
