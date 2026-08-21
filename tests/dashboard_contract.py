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
                  {Id:'manager-top',Name:'Top 20 in Foreign Collection',PageId:'home',Type:'top-10-50',ItemIds:['stale-one'],SourceIds:['collection|foreign'],Drafts:[{Id:'top-draft-manager-top',SourceType:'top',SourceId:'combined',Name:'Top 20'}],DisplayTopCount:20,ShowRankNumbers:true,RankNumberColorMode:'horizontal-gradient',RankNumberColorOne:'#123456',RankNumberColorTwo:'#abcdef',RankNumberShadowColor:'#222222',ArtSize:'small',ArtType:'primary',ArtShape:'wide',ShowText:false,ShowSectionName:true,IsApplied:true,IsVisible:true,IsMediaBar:false},
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
              window.__displayPrefs = {CustomPrefs:{homesection0:'resume'}};
              window.__applyCalls = [];
              window.__brandingWrites = [];
              window.__collectionManagerCatalogCalls = 0;
              window.__itemIdBatchSizes = [];
              window.__oversizedItemIdRequests = 0;
              window.Dashboard = { alert(){}, showLoadingMsg(){}, hideLoadingMsg(){} };
              window.ApiClient = {
                getCurrentUserId:()=> 'user', serverId:()=> 'server',
                getUrl:(path,params)=> {
                  if(params && params.Ids) window.__itemIdBatchSizes.push(String(params.Ids).split(',').filter(Boolean).length);
                  const query = params ? new URLSearchParams(Object.entries(params).map(([key,value]) => [key,String(value)])).toString() : '';
                  return path + (query ? '?' + query : '');
                },
                getJSON:(url)=> {
                  if(String(url).includes('top-row-settings')) return Promise.resolve(structuredClone(window.__topRowSettings));
                  if(String(url).includes('section-settings')) return Promise.resolve(structuredClone(window.__sectionSettings));
                  if(String(url).includes('main-settings')) return Promise.resolve(structuredClone(window.__mainSettings));
                  if(String(url).includes('customization-settings')) return Promise.resolve(structuredClone(window.__customizationSettings));
                  if(String(url).includes('DisplayPreferences')) return Promise.resolve({CustomPrefs:{homesection0:'resume'}});
                  if(String(url).includes('Users/user/Views')) return Promise.resolve({Items:[{Id:'library',Name:'Movies',CollectionType:'movies'}]});
                  if(String(url).includes('Users/user/Items?IncludeItemTypes=BoxSet')) return Promise.resolve({Items:[{Id:'foreign',Name:'Foreign Collection',ChildCount:20}]});
                  if(String(url).includes('Users/user/Items?Ids=')) {
                    const ids = new URL(String(url), 'https://jellyfin.test/').searchParams.get('Ids').split(',');
                    if(ids.length > 16) { window.__oversizedItemIdRequests += 1; return Promise.reject({status:400,statusText:'Bad Request'}); }
                    return Promise.resolve({Items:ids.map(id => ({Id:id,Name:'Item ' + id,Type:'Movie',ImageTags:{Primary:'image'}})),TotalRecordCount:ids.length});
                  }
                  if(String(url).includes('Genres')) return Promise.resolve({Items:[{Id:'genre-drama',Name:'Drama',Type:'Genre'},{Id:'genre-comedy',Name:'Comedy',Type:'Genre'}]});
                  if(String(url).includes('CollectionManager/settings/main') || String(url).includes('CollectionManager/art/collections')) { window.__collectionManagerCatalogCalls += 1; return new Promise(()=>{}); }
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
                getDisplayPreferences:()=>Promise.resolve(structuredClone(window.__displayPrefs)),
                getCurrentUser:()=>Promise.resolve({Configuration:{LatestItemsExcludes:[]}}),
                getUserViews:()=>Promise.resolve({Items:[{Id:'library',Name:'Movies',CollectionType:'movies'}]}),
                getPluginConfiguration:()=>Promise.resolve({CustomJavaScripts:[]}),
                updatePluginConfiguration:()=>Promise.resolve()
              };
              window.HomeScreenManagerClient = { version:'0.1.0.64', refresh(){} };
              window.CustomElements = { upgradeSubtree(){} };
            }
            """
        )
        page.set_content(DASHBOARD.read_text())
        page.wait_for_selector("#hssmPageList [data-page-id='home']", state="attached")
        page.wait_for_selector("#hssmSectionPageSelect option[value='manager-page-movies']", state="attached")
        page.evaluate("window.__displayPrefs={CustomPrefs:{homesection0:'resumeaudio',homesection1:'resume'}}; window.HSSMReloadSectionEditor()")
        page.wait_for_selector("#hssmSectionList [data-section-id='jellyfin-0-resumeaudio']", state="attached")
        page.wait_for_function("window.__sectionSettings.PageLayouts.find(p => p.PageId === 'home').SectionOrder[0] === 'jellyfin-0-resumeaudio'")
        native_order = page.locator("#hssmSectionList [data-section-id^='jellyfin-']").evaluate_all("nodes => nodes.map(node => node.dataset.sectionId)")
        assert native_order[:2] == ["jellyfin-0-resumeaudio", "jellyfin-1-resume"], native_order
        page.evaluate("window.__displayPrefs={CustomPrefs:{homesection0:'resume'}}; window.HSSMReloadSectionEditor()")
        page.wait_for_selector("#hssmSectionList [data-section-id='jellyfin-0-resume']", state="attached")

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

        page.evaluate(
            """() => {
              window.__delayTopRowCatalog=true;
              window.__topRowCatalogResolvers=[];
              const baseGetJSON=ApiClient.getJSON;
              ApiClient.getJSON=url => window.__delayTopRowCatalog && String(url).includes('Users/user/Items?IncludeItemTypes=BoxSet')
                ? new Promise(resolve => window.__topRowCatalogResolvers.push(() => resolve({Items:[{Id:'foreign',Name:'Foreign Collection',ChildCount:20}]})))
                : baseGetJSON(url);
              ApiClient.getUserViews=() => window.__delayTopRowCatalog
                ? new Promise(resolve => window.__topRowCatalogResolvers.push(() => resolve({Items:[{Id:'library',Name:'Movies',CollectionType:'movies'}]})))
                : Promise.resolve({Items:[{Id:'library',Name:'Movies',CollectionType:'movies'}]});
            }"""
        )
        page.locator("[data-tab='top-row-settings']").click()
        assert page.locator("[data-tab='top-row-settings']").inner_text().strip() == "Create and Manage Top Rows"
        page.wait_for_selector("#hssmTopRowList [data-hssm-top-row-id='main-top-row']")
        assert page.evaluate("window.__collectionManagerCatalogCalls") == 0
        main_top_row = page.locator("#hssmTopRowList [data-hssm-top-row-id='main-top-row']")
        assert main_top_row.get_attribute("draggable") is None
        assert "Main Top Row · Everywhere" in main_top_row.inner_text()
        assert "Fallback" not in main_top_row.inner_text()
        main_top_row.click()
        assert page.locator("#hssmEditTopRowButton").is_enabled()
        assert not page.locator("#hssmDeleteTopRowButton").is_enabled()
        assert page.locator("#hssmCopyTopRowButton").is_enabled()
        page.locator("#hssmEditTopRowButton").click()
        assert page.locator("#hssmTopRowEditor").is_visible()
        assert "editor opened" in page.locator("#hssmTopRowStatus").inner_text()
        page.evaluate("window.__delayTopRowCatalog=false; window.__topRowCatalogResolvers.splice(0).forEach(resolve => resolve())")
        page.wait_for_selector("#hssmTopRowSourcePicker [data-hssm-top-row-source='foreign']")
        assert page.locator("#hssmTopRowName").input_value() == "Main Top Row"
        assert page.locator("#hssmTopRowName").is_disabled()
        assert page.locator("#hssmMainTopRowApplication").is_visible()
        assert page.locator("#hssmTargetedTopRowApplication").is_hidden()
        assert page.get_by_text("Enable or Disable Top Row Settings", exact=True).count() == 1
        assert page.get_by_text("Select if you want to enable or disable the Top Row section.", exact=True).count() == 1
        assert page.locator("#hssmDisableTopRow").is_checked()
        assert not page.locator("#hssmEnableTopRow").is_checked()
        assert page.locator("#hssmTopRowTypePicker .hssm-type-option .checkboxContainer span").all_text_contents() == ["Collections in a Row", "Libraries in a Row", "Genres in a Row"]
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
        assert page.locator('[data-tab="marquee-message"]', has_text="Marquee Message Settings").count() == 1
        assert not page.locator('[data-panel="marquee-message"] h2', has_text="Marquee Message Settings").is_visible()
        page.locator("[data-tab='marquee-message']").click()
        assert page.locator("[data-tab='marquee-message']").inner_text().strip() == "Marquee Message Settings"
        assert page.locator('[data-panel="marquee-message"] h2', has_text="Marquee Message Settings").is_visible()
        assert page.locator("#hssmDisableTopRowMessage").is_checked()
        assert page.locator("#hssmTopRowMessagePagePicker [data-hssm-top-row-message-page='home']").is_checked()
        appearance_gaps = page.locator(".hssm-message-appearance-grid").evaluate("node => ({gap:parseFloat(getComputedStyle(node).rowGap),groups:node.querySelectorAll('.hssm-message-appearance-group').length})")
        assert appearance_gaps["groups"] == 3 and appearance_gaps["gap"] >= 15, appearance_gaps
        page.locator("#hssmTopRowMessageMarqueeSpeed").select_option("faster")
        page.locator("#hssmSaveTopRowMessageButton").click()
        page.locator("#hssmTopRowMessageStatus").get_by_text("Marquee Message settings saved.", exact=True).wait_for()
        assert page.locator("#hssmSaveTopRowMessageButton").is_enabled()
        assert page.evaluate("window.__topRowSettings.TopRowMessageMarqueeSpeed") == "faster"
        page.locator("[data-tab='top-row-settings']").click()
        assert page.locator("#hssmTopRowScrolls").is_checked()
        assert page.locator("#hssmTopRowLogoShadowColor").input_value() == "#ffffff"
        logo_shadow_size = page.locator("#hssmTopRowLogoShadowColor").evaluate("node => { const box=node.getBoundingClientRect(); return {width:box.width,height:box.height}; }")
        assert abs(logo_shadow_size["width"] - logo_shadow_size["height"]) < 2 and 44 <= logo_shadow_size["width"] <= 64, logo_shadow_size
        assert page.locator("#hssmTopRowLogoShadowColor").evaluate("node => node.closest('.hssm-single-color') !== null")
        logo_description_link = page.get_by_text("Collection Manager", exact=True)
        assert logo_description_link.get_attribute("href") == "https://github.com/mp3li/Collection-Manager-Jellyfin-Plugin"
        page.locator("#hssmEnableTopRow").check()
        page.locator("#hssmTopRowSourcePicker [data-hssm-top-row-source='foreign']").check()
        page.locator("#hssmTopRowArtType").select_option("thumb")
        page.locator("#hssmTopRowArtShape").select_option("circle")
        page.locator("#hssmTopRowDisplayLogosOnly").check()
        page.locator("#hssmSaveTopRowButton").click()
        page.wait_for_function("window.__topRowSettings.TopRows && window.__topRowSettings.TopRows[0].EnableTopRow === true && window.__topRowSettings.TopRows[0].Section.SourceIds[0] === 'foreign'")
        assert page.locator("#hssmTopRowStatus").inner_text().strip() == "Top Row refreshed."
        assert page.locator("#hssmTopRowEditor").is_visible()
        assert page.evaluate("window.__topRowSettings.TopRows[0].IsMain") is True
        assert page.evaluate("window.__topRowSettings.TopRows[0].Section.ArtSize") == "extra-small"
        assert page.evaluate("window.__topRowSettings.TopRows[0].Section.ShowText") is False
        assert page.evaluate("window.__topRowSettings.TopRows[0].Section.ShowSectionName") is False
        assert page.evaluate("window.__topRowSettings.TopRows[0].Section.IsMediaBar") is False
        assert page.evaluate("window.__topRowSettings.TopRows[0].Section.DisplayLogosOnly") is True

        page.locator("#hssmCreateTopRowButton").click()
        assert page.locator("#hssmTopRowName").input_value() == "New Top Row"
        page.locator("#hssmTopRowName").fill("Movies Library Top Row")
        page.locator("#hssmTopRowTargetType").select_option("library")
        assert page.locator("#hssmTopRowTargetId option").all_text_contents() == ["Select an area", "Movies"]
        page.locator("#hssmTopRowTargetId").select_option("library")
        page.locator("#hssmTopRowOverrideOn").check()
        page.locator("#hssmTopRowSourcePicker [data-hssm-top-row-source='foreign']").check()
        page.locator("#hssmSaveTopRowButton").click()
        page.wait_for_function("window.__topRowSettings.TopRows && window.__topRowSettings.TopRows.length === 2")
        assert page.evaluate("window.__topRowSettings.TopRows[1].TargetType") == "library"
        assert page.evaluate("window.__topRowSettings.TopRows[1].TargetId") == "library"
        assert page.evaluate("window.__topRowSettings.TopRows[1].OverrideMainTopRow") is True
        targeted_row = page.locator("#hssmTopRowList [data-hssm-top-row-id]:not([data-hssm-top-row-id='main-top-row'])")
        assert "Movies Library" in targeted_row.inner_text()
        assert "Override On" in targeted_row.inner_text()
        targeted_row.click()
        page.locator("#hssmEditTopRowButton").click()
        page.locator("input[name='hssmTopRowType'][value='genres-in-a-row']").check()
        page.wait_for_selector("#hssmTopRowSourcePicker [data-hssm-top-row-source='genre-drama']")
        page.locator("#hssmTopRowSourcePicker [data-hssm-top-row-source='genre-drama']").check()
        page.locator("#hssmSaveTopRowButton").click()
        page.wait_for_function("window.__topRowSettings.TopRows[1].Section.Type === 'genres-in-a-row' && window.__topRowSettings.TopRows[1].Section.ItemIds[0] === 'genre-drama'")
        targeted_row = page.locator("#hssmTopRowList [data-hssm-top-row-id]:not([data-hssm-top-row-id='main-top-row'])")
        targeted_row.click()
        page.locator("#hssmCopyTopRowButton").click()
        assert page.locator("#hssmTopRowTargetId").input_value() == ""
        assert page.locator("#hssmTopRowOverrideOff").is_checked()

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
        page.get_by_text("Choose the maximum number of media items", exact=False).wait_for()
        assert page.locator("#hssmNewSectionSettings").is_visible()
        assert page.locator("#hssmNewSectionSettings").evaluate("node => node.classList.contains('hssm-native-only')")
        assert page.locator("#hssmNewSectionSettings > .hssm-conditional-section").first.is_hidden()
        assert page.locator("#hssmTypeSpecificSettings [data-hssm-content-order]").count() == 0
        assert page.locator("#hssmTypeSpecificSettings [data-hssm-max-items]").get_attribute("type") == "number"
        assert page.locator("#hssmTypeSpecificSettings [data-hssm-max-items]").get_attribute("placeholder") == "Jellyfin Default"
        assert "Jellyfin’s own loaded-item limit" in page.locator("#hssmTypeSpecificSettings").inner_text()
        page.locator("#hssmTypeSpecificSettings [data-hssm-max-items]").fill("30")
        page.locator("#hssmTypeSpecificSettings [data-hssm-art-size]").select_option("large")
        page.locator("#hssmTypeSpecificSettings [data-hssm-art-shape]").select_option("circle")
        page.locator("#hssmTypeSpecificSettings [data-hssm-show-text]").uncheck()
        assert page.locator("#hssmTypeSpecificSettings [data-hssm-show-section-name]").is_checked()
        page.locator("#hssmTypeSpecificSettings [data-hssm-show-section-name]").uncheck()
        page.locator("#hssmTypeSpecificSettings [data-hssm-apply-section]").click()
        page.wait_for_function("window.__sectionSettings.Sections.some(s => String(s.Id).startsWith('jellyfin-') && s.ArtSize === 'large' && s.ArtShape === 'circle' && s.ShowText === false && s.ShowSectionName === false)")
        assert page.evaluate("window.__sectionSettings.Sections.find(s => String(s.Id).startsWith('jellyfin-')).MaxItems") == 30

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
        saved_art_size = page.locator("#hssmTypeSpecificSettings [data-hssm-art-size]").input_value()
        assert saved_art_size == "small", saved_art_size
        assert page.locator("#hssmTypeSpecificSettings [data-hssm-art-type]").input_value() == "primary"
        assert page.locator("#hssmTypeSpecificSettings [data-hssm-art-shape]").input_value() == "wide"
        assert page.locator("#hssmTypeSpecificSettings [data-hssm-show-text]").is_checked() is False
        assert page.locator("#hssmTypeSpecificSettings [data-hssm-rank-color-mode]").input_value() == "horizontal-gradient"
        assert page.locator("#hssmTypeSpecificSettings [data-hssm-rank-color-one]").input_value() == "#123456"
        assert "Loading source" not in page.locator("#hssmTypeSpecificSettings").inner_text()
        assert page.get_by_text("Top 5-100 Settings", exact=True).count() == 1
        assert page.locator("#hssmTypeSpecificSettings [data-hssm-display-top] option[value='5']").count() == 1
        revised_top_name = "Top 20 in Foreign Collection - My Picks"
        page.locator("#hssmTypeSpecificSettings [data-hssm-top-draft-name]").fill(revised_top_name)
        page.wait_for_function("name => { const section=window.__sectionSettings.Sections.find(s => s.Id === 'manager-top'); return section.Name === name && section.Drafts[0].Name === name; }", arg=revised_top_name)
        page.locator("#hssmTypeSpecificSettings [data-hssm-display-top]").select_option("5")
        assert page.locator("#hssmTypeSpecificSettings [data-hssm-display-top]").input_value() == "5"
        page.locator("#hssmTypeSpecificSettings [data-hssm-display-top]").select_option("30")
        assert page.locator("#hssmTypeSpecificSettings [data-hssm-top-draft-name]").input_value() == revised_top_name
        page.evaluate("document.querySelector('#hssmTypeSpecificSettings [data-hssm-art-settings]').hidden = false")
        page.locator("#hssmTypeSpecificSettings [data-hssm-rank-numbers][value='yes']").check()
        page.locator("#hssmTypeSpecificSettings [data-hssm-rank-color-mode]").select_option("horizontal-gradient")
        page.locator("#hssmTypeSpecificSettings [data-hssm-rank-color-one]").fill("#112233")
        page.locator("#hssmTypeSpecificSettings [data-hssm-rank-color-two]").fill("#445566")
        page.locator("#hssmTypeSpecificSettings [data-hssm-rank-shadow-color]").fill("#778899")
        page.locator("#hssmTypeSpecificSettings [data-hssm-apply-section]").click()
        page.locator("#hssmTopCountWarningDialog:not([hidden])").wait_for()
        assert "You have chosen Top 30" in page.locator("#hssmTopCountWarningMessage").text_content()
        assert page.locator("#hssmConfirmTopCountWarningButton").text_content().strip() == "Refresh Section Anyways"
        page.locator("#hssmConfirmTopCountWarningButton").click()
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
        page.locator("#hssmSectionList [data-section-id='manager-one']").click()
        page.locator("#hssmSectionList [data-section-id='manager-top']").click()
        page.locator("#hssmEditSectionButton").click()
        page.locator("#hssmFinishSectionButton").click()
        page.wait_for_selector("#hssmTypeSpecificSettings [data-hssm-rank-color-one]", state="attached")
        assert page.locator("#hssmTypeSpecificSettings [data-hssm-rank-color-one]").input_value() == "#112233"
        assert page.locator("#hssmTypeSpecificSettings [data-hssm-rank-color-two]").input_value() == "#445566"
        assert page.locator("#hssmTypeSpecificSettings [data-hssm-rank-shadow-color]").input_value() == "#778899"

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
        assert page.locator("#hssmRefreshSectionButton").is_enabled()
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
        for section_type in ["continue-watching", "continue-listening", "continue-reading", "continue-watching-listening", "continue-reading-listening", "recently-added-library", "recently-listened-songs", "recently-listened-artists", "recently-listened-albums"]:
            assert page.locator(f"input[name='hssmType'][value='{section_type}']").count() == 1
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
        assert "Book / Audiobook" in page.locator("#hssmTypeSpecificSettings [data-hssm-art-shape] option").all_text_contents()

        page.locator("#hssmAddSectionButton").click()
        page.locator("#hssmSectionList [data-hssm-inline-section-name]").fill("Continue Watching and Listening")
        page.locator("input[name='hssmType'][value='continue-watching-listening']").check()
        page.locator("#hssmFinishSectionButton").click()
        page.locator("#hssmTypeSpecificSettings").get_by_text("Choose which Jellyfin libraries can supply resumable content. Existing sections default to every library.", exact=True).wait_for()
        page.wait_for_selector("#hssmTypeSpecificSettings [data-hssm-continue-library]")
        assert all(page.locator("#hssmTypeSpecificSettings [data-hssm-continue-library]").evaluate_all("nodes => nodes.map(node => node.checked)"))
        assert "Loading section settings…" not in page.locator("#hssmTypeSpecificSettings").inner_text()

        page.locator("#hssmAddSectionButton").click()
        page.locator("#hssmSectionList [data-hssm-inline-section-name]").fill("Songs Recently Listened To")
        page.locator("input[name='hssmType'][value='recently-listened-songs']").check()
        page.locator("#hssmFinishSectionButton").click()
        page.locator("#hssmTypeSpecificSettings").get_by_text("Create a user-specific section of songs listened to for at least 10 seconds. No content selection is required.", exact=True).wait_for()
        assert "Loading section settings…" not in page.locator("#hssmTypeSpecificSettings").inner_text()

        page.locator("#hssmAddSectionButton").click()
        page.locator("#hssmSectionList [data-hssm-inline-section-name]").fill("Top 20 in Foreign Collection")
        page.locator("input[name='hssmType'][value='top-10-50']").check()
        page.evaluate("""() => { window.__savedDashboardGetJSON=ApiClient.getJSON; ApiClient.getJSON=url => String(url).includes('CollectionManager/') ? Promise.reject(new Error('Collection Manager unavailable')) : window.__savedDashboardGetJSON(url); }""")
        page.locator("#hssmFinishSectionButton").click()
        page.wait_for_selector("#hssmTypeSpecificSettings [data-hssm-top-draft-name]")
        page.evaluate("ApiClient.getJSON=window.__savedDashboardGetJSON; delete window.__savedDashboardGetJSON")
        assert "Collection Manager must be installed" not in page.locator("#hssmTypeSpecificSettings").inner_text()
        assert page.locator("#hssmTypeSpecificSettings [data-hssm-top-draft-name]").input_value() == "Top 20 in Foreign Collection"
        page.locator("#hssmTypeSpecificSettings [data-hssm-display-top]").select_option("20")
        assert page.locator("#hssmTypeSpecificSettings [data-hssm-top-draft-name]").input_value() == "Top 20 in Foreign Collection"

        library_item_ids = page.evaluate(
            """
            async () => {
              const originalGetJSON = ApiClient.getJSON;
              ApiClient.getJSON = url => String(url).includes('Users/user/Items')
                ? Promise.resolve({Items:[
                    {Id:'year-folder',Name:'2010 - 2015',Type:'Folder'},
                    {Id:'actual-movie',Name:'Actual Movie',Type:'Movie'}
                  ],TotalRecordCount:2})
                : originalGetJSON(url);
              try {
                const result = await window.HSSMRefreshSectionDefinition({
                  Id:'manager-library-test',Name:'Library Test',PageId:'home',Type:'library-content',
                  SourceIds:['library'],ItemIds:[],ContentOrder:'title-ascending',IsApplied:true
                });
                return result.definition.ItemIds;
              } finally {
                ApiClient.getJSON = originalGetJSON;
              }
            }
            """
        )
        assert library_item_ids == ["actual-movie"], library_item_ids

        page.locator("[data-tab='customization-settings']").click()
        assert page.get_by_text("Media Bar Slow Zoom Settings", exact=True).count() == 1
        assert page.locator("#hssmEnableMediaBarSlowZoom").is_checked()
        assert page.locator("#hssmHeaderTabsColorTwo").evaluate("node => node.closest('.inputContainer').hidden")
        page.locator("#hssmDisableMediaBarSlowZoom").check()
        page.locator("#hssmAbyssAccentColor").fill("#12ab34")
        page.locator("#hssmSidebarIconColorMode").select_option("horizontal-gradient")
        assert not page.locator("#hssmSidebarIconColorTwo").evaluate("node => node.closest('.inputContainer').hidden")
        page.locator("#hssmSidebarIconColorOne").fill("#112233")
        page.locator("#hssmSidebarIconColorTwo").fill("#445566")
        page.locator("#hssmSaveCustomizationButton").click()
        page.wait_for_function("window.__brandingWrites.length > 0")
        assert page.evaluate("window.__customizationSettings.EnableMediaBarSlowZoom") is False
        generated_css = page.evaluate("window.__brandingWrites.at(-1).CustomCss || window.__brandingWrites.at(-1).customCss")
        assert "background: linear-gradient(to right, #112233, #445566)" in generated_css
        assert "-webkit-text-fill-color: #12ab34" in generated_css

        page.evaluate(
            """() => {
              window.__sectionSettings.Sections.find(section => section.Id === 'manager-one').ItemIds = Array.from({length:40}, (_,index) => 'large-' + String(index + 1).padStart(2,'0'));
              window.__itemIdBatchSizes = [];
              window.__savedGetUserViews = ApiClient.getUserViews;
              ApiClient.getUserViews = () => new Promise(() => {});
              window.HSSMReloadSectionEditor();
            }"""
        )
        page.locator("[data-tab='create-sections']").click()
        manager_one_page = page.evaluate("window.__sectionSettings.Sections.find(section => section.Id === 'manager-one').PageId")
        page.locator("#hssmSectionPageSelect").select_option(manager_one_page)
        page.wait_for_selector("#hssmSectionList [data-section-id='manager-one']")
        page.locator("#hssmSectionList [data-section-id='manager-one']").click()
        page.locator("#hssmEditSectionButton").click()
        page.locator("#hssmFinishSectionButton").click()
        page.get_by_text("Select Media", exact=True).wait_for(timeout=500)
        page.wait_for_function("window.__itemIdBatchSizes.length >= 1")
        assert page.evaluate("Math.max(...window.__itemIdBatchSizes)") <= 16
        assert page.evaluate("window.__oversizedItemIdRequests") == 0
        assert "40 selected media items" in page.locator("#hssmTypeSpecificSettings [data-hssm-content]").inner_text()
        page.locator("#hssmTypeSpecificSettings [data-hssm-content-page='2']").click()
        page.wait_for_function("window.__itemIdBatchSizes.length >= 2")
        assert page.evaluate("window.__itemIdBatchSizes.slice(0,2)") == [16, 16]
        page.locator("#hssmTypeSpecificSettings [data-hssm-save-move]").click()
        page.wait_for_function("window.__sectionSettings.Sections.find(section => section.Id === 'manager-one').ItemIds.length === 40")
        page.evaluate("ApiClient.getUserViews = window.__savedGetUserViews")
        assert not page_errors, page_errors
        browser.close()


if __name__ == "__main__":
    run()
    print("dashboard contract passed")
