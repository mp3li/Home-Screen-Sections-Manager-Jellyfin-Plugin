(function () {
    'use strict';

    var CLIENT_VERSION = "0.1.0.37";
    if (window.HomeScreenManagerClient) {
        if (window.HomeScreenManagerClient.version === CLIENT_VERSION) {
            window.HomeScreenManagerClient.refresh();
            return;
        }
        try {
            var reloadKey = "hssm-client-reload-version";
            if (window.sessionStorage.getItem(reloadKey) !== CLIENT_VERSION) {
                window.sessionStorage.setItem(reloadKey, CLIENT_VERSION);
                window.location.reload();
                return;
            }
        } catch (_) { /* Continue with the new client when session storage is unavailable. */ }
    }

    var homeRetryTimer = null;
    var lastContainer = null;
    var lastSignature = '';
    var lastError = '';
    var renderedSectionCount = 0;
    var defaultSections = ['smalllibrarytiles', 'resume', 'resumeaudio', 'resumebook', 'livetv', 'nextup', 'latestmedia'];
    var settingsCache = null;
    var settingsCacheAt = 0;
    var settingsRequest = null;
    var settingsReconcileQueued = false;
    var mediaBarTimer = null;
    var mediaBarSourceKey = '';
    var mediaBarPayload = null;
    var mediaBarMessageBound = false;
    var mediaBarLoadSequence = 0;
    var detailWorkKey = '';
    var collectionsWorkKey = '';
    var breadcrumbsWorkKey = '';
    var infiniteLoading = false;
    var infiniteLibraryKey = '';
    var myListRenderKey = '';
    var myListRevision = 0;
    var searchTimer = null;
    var searchMode = 'core';
    var originalHeaderHomeHtml = null;
    var runtimeGeneration = 0;
    var routeGeneration = 0;
    var heartStatusTimer = null;
    var pendingHeartIds = {};
    var sectionRuntime = {};
    var homeRequestLane = createLimiter(2);
    var heartRequestLane = createLimiter(1);
    var likedItemsById = {};
    var likedItemsLoaded = false;
    var likedItemsRequest = null;
    var clientReadyTimer = null;
    var clientReadyAttempts = 0;
    var routeEventTimer = null;
    var latestNativePreferences = {};
    var liveViewsCache = null;
    var liveViewsCacheAt = 0;
    var liveViewsRequest = null;
    var homeSettingsListenerContainer = null;
    var homeTabsListener = null;
    var viewShowHook = null;
    var lastFeatureScope = null;
    var lastFeatureRoute = '';
    var pageContextWorkKey = '';
    var ownedMyListTabIndex = 2;
    var mediaBarOwnerObserver = null;
    var mediaBarOwnerHomeTab = null;
    var initialHomeSelectionNormalized = false;

    function createLimiter(maximum) {
        var active = 0;
        var pending = [];
        function next() {
            if (active >= maximum || !pending.length) return;
            var task = pending.shift();
            active += 1;
            Promise.resolve().then(task.work).then(task.resolve, task.reject).finally(function () { active -= 1; next(); });
        }
        return function (work) {
            return new Promise(function (resolve, reject) { pending.push({ work: work, resolve: resolve, reject: reject }); next(); });
        };
    }

    function prop(value, pascal, camel, fallback) {
        if (!value) return fallback;
        if (value[pascal] !== undefined && value[pascal] !== null) return value[pascal];
        if (value[camel] !== undefined && value[camel] !== null) return value[camel];
        return fallback;
    }

    function escapeHtml(value) {
        var element = document.createElement('span');
        element.textContent = value === undefined || value === null ? '' : String(value);
        return element.innerHTML;
    }

    function currentUserId() {
        return window.ApiClient && typeof ApiClient.getCurrentUserId === 'function' ? ApiClient.getCurrentUserId() : '';
    }

    function isHomeRoute() {
        var hash = String(window.location.hash || '').toLowerCase();
        return !hash || /^#\/home(?:\.html)?(?:[/?]|$)/.test(hash);
    }

    function visibleIndexPage() {
        var indexPage = document.getElementById("indexPage");
        return indexPage && !indexPage.hidden && !indexPage.classList.contains("hide") ? indexPage : null;
    }

    function activeHomeContainer() {
        if (!isHomeRoute()) return null;
        var indexPage = visibleIndexPage();
        var homeTab = indexPage && indexPage.querySelector("#homeTab");
        if (!homeTab || homeTab.hidden || homeTab.classList.contains("hide") || !homeTab.classList.contains("is-active")) return null;
        return homeTab.querySelector(":scope > .homeSectionsContainer, :scope > .sections.homeSectionsContainer");
    }

    function myListPageMarker() {
        var indexPage = visibleIndexPage();
        return indexPage ? indexPage.querySelector(".hssm-my-list-page") : null;
    }

    function homeTabsElement() {
        if (!isHomeRoute() || !visibleIndexPage()) return null;
        return document.querySelector('.headerTabs:not(.hide) [is="emby-tabs"]');
    }

    function ensureOwnedMyListPage(settings) {
        var indexPage = visibleIndexPage();
        var pageOrder = prop(settings || {}, 'PageOrder', 'pageOrder', []).map(sectionOrderEntry);
        var myListOrder = pageOrder.find(function (entry) { return entry.id === 'my-list'; });
        var enabled = setting(settings || {}, 'EnableMyList', false) && !(myListOrder && myListOrder.hidden);
        var myListDefinition = prop(settings || {}, 'Pages', 'pages', []).find(function (page) { return String(prop(page, 'Id', 'id', '')) === 'my-list'; });
        var myListTitle = String(prop(myListDefinition, 'Name', 'name', 'My List') || 'My List');
        var tabs = homeTabsElement();
        var slider = tabs && tabs.querySelector('.emby-tabs-slider');
        if (indexPage && slider) {
            Array.from(indexPage.querySelectorAll('.hssm-my-list-page:not(.hssm-owned-my-list-page)')).forEach(function (legacy) {
                var legacyIndex = legacy.getAttribute('data-index');
                if (legacyIndex !== null) {
                    var legacyButton = slider.querySelector('.emby-tab-button[data-index="' + CSS.escape(legacyIndex) + '"]');
                    if (legacyButton) legacyButton.remove();
                }
                legacy.remove();
            });
        }
        var existing = indexPage && indexPage.querySelector('.hssm-owned-my-list-page');
        var tabButton = slider && slider.querySelector('.hssm-my-list-tab');
        if (!enabled || !indexPage || !tabs || !slider) {
            if (!enabled) {
                if (existing) existing.remove();
                if (tabButton) tabButton.remove();
            }
            return null;
        }
        var used = Array.from(indexPage.querySelectorAll(':scope > .pageTabContent[data-index]')).map(function (panel) { return Number(panel.dataset.index); }).filter(Number.isFinite);
        ownedMyListTabIndex = Math.max(2, used.length ? Math.max.apply(Math, used) + 1 : 2);
        if (existing) ownedMyListTabIndex = Number(existing.dataset.index || ownedMyListTabIndex);
        if (!existing) {
            existing = document.createElement('div');
            existing.className = 'tabContent pageTabContent hssm-my-list-page hssm-owned-my-list-page';
            existing.dataset.index = String(ownedMyListTabIndex);
            existing.innerHTML = '<div class="sections homeSectionsContainer hssm-my-list-container"></div>';
            indexPage.appendChild(existing);
        }
        if (!tabButton) {
            tabButton = document.createElement('button');
            tabButton.type = 'button';
            tabButton.setAttribute('is', 'emby-button');
            tabButton.className = 'emby-tab-button hssm-my-list-tab';
            tabButton.innerHTML = '<div class="emby-button-foreground"></div>';
            slider.appendChild(tabButton);
        }
        tabButton.querySelector('.emby-button-foreground').textContent = myListTitle;
        existing.dataset.hssmPageTitle = myListTitle;
        tabButton.dataset.index = String(ownedMyListTabIndex);
        if (tabButton.dataset.hssmOwnedBound !== 'true') {
            tabButton.dataset.hssmOwnedBound = 'true';
            tabButton.addEventListener('click', function (event) {
                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation();
                showOwnedHomePanel(ownedMyListTabIndex);
            }, true);
        }
        if (window.CustomElements && typeof window.CustomElements.upgradeSubtree === 'function') window.CustomElements.upgradeSubtree(tabs);
        if (typeof tabs.refresh === 'function') tabs.refresh();
        return existing;
    }

    function ensureOwnedPages(settings) {
        var indexPage = visibleIndexPage();
        var tabs = homeTabsElement();
        var slider = tabs && tabs.querySelector('.emby-tabs-slider');
        if (!indexPage || !tabs || !slider) return;
        var myList = ensureOwnedMyListPage(settings);
        var definitions = prop(settings, 'Pages', 'pages', []).filter(function (page) { return String(prop(page, 'Id', 'id', '')) !== 'my-list'; });
        var order = prop(settings, 'PageOrder', 'pageOrder', []).map(sectionOrderEntry);
        var hidden = {};
        order.forEach(function (entry) { hidden[entry.id] = entry.hidden; });
        hidden.favorites = hidden.favorites || setting(settings, 'HideFavorites', false);
        Array.from(indexPage.querySelectorAll(':scope > .hssm-owned-custom-page')).forEach(function (panel) {
            var id = panel.dataset.hssmPageId;
            if (!definitions.some(function (definition) { return String(prop(definition, 'Id', 'id', '')) === id; })) panel.remove();
        });
        Array.from(slider.querySelectorAll('.hssm-custom-page-tab')).forEach(function (button) {
            if (!definitions.some(function (definition) { return String(prop(definition, 'Id', 'id', '')) === button.dataset.hssmPageId; })) button.remove();
        });
        var used = Array.from(indexPage.querySelectorAll(':scope > .pageTabContent[data-index]')).map(function (panel) { return Number(panel.dataset.index); }).filter(Number.isFinite);
        var nextIndex = Math.max(2, used.length ? Math.max.apply(Math, used) + 1 : 2);
        definitions.forEach(function (definition) {
            var id = String(prop(definition, 'Id', 'id', ''));
            var name = String(prop(definition, 'Name', 'name', 'Page'));
            var panel = indexPage.querySelector(':scope > .hssm-owned-custom-page[data-hssm-page-id="' + CSS.escape(id) + '"]');
            var button = slider.querySelector('.hssm-custom-page-tab[data-hssm-page-id="' + CSS.escape(id) + '"]');
            if (!id || hidden[id]) { if(panel)panel.remove(); if(button)button.remove(); return; }
            var index = panel ? Number(panel.dataset.index) : nextIndex++;
            if (!panel) {
                panel = document.createElement('div');
                panel.className = 'tabContent pageTabContent hssm-owned-custom-page';
                panel.dataset.index = String(index);
                panel.dataset.hssmPageId = id;
                panel.innerHTML = '<div class="sections homeSectionsContainer hssm-custom-page-container"></div>';
                indexPage.appendChild(panel);
            }
            panel.dataset.hssmPageTitle = name;
            if (!button) {
                button = document.createElement('button');
                button.type = 'button';
                button.setAttribute('is', 'emby-button');
                button.className = 'emby-tab-button hssm-custom-page-tab';
                button.dataset.hssmPageId = id;
                button.innerHTML = '<div class="emby-button-foreground"></div>';
                slider.appendChild(button);
            }
            button.dataset.index = String(index);
            button.querySelector('.emby-button-foreground').textContent = name;
            if (button.dataset.hssmOwnedBound !== 'true') {
                button.dataset.hssmOwnedBound = 'true';
                button.addEventListener('click', function (event) { event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation(); showOwnedHomePanel(index); }, true);
            }
        });
        var favoritesButton = slider.querySelector('.emby-tab-button[data-index="1"]');
        var favoritesPanel = indexPage.querySelector('#favoritesTab, :scope > .pageTabContent[data-index="1"]');
        if (favoritesButton) {
            favoritesButton.hidden = !!hidden.favorites;
            favoritesButton.classList.toggle('hssm-hidden-page-tab', !!hidden.favorites);
        }
        if (favoritesPanel) favoritesPanel.dataset.hssmPageHidden = hidden.favorites ? 'true' : 'false';
        if (hidden.favorites && favoritesPanel && favoritesPanel.classList.contains('is-active')) showOwnedHomePanel(0);
        if (myList) {
            Array.from(slider.querySelectorAll('.emby-tab-button')).filter(function (button) {
                return button !== slider.querySelector('.hssm-my-list-tab') && String(button.textContent || '').trim().toLowerCase() === 'my list';
            }).forEach(function (button) {
                var index = button.dataset.index;
                button.remove();
                var panel = indexPage.querySelector(':scope > .pageTabContent[data-index="' + CSS.escape(String(index || '')) + '"]');
                if (panel && !panel.classList.contains('hssm-owned-my-list-page')) panel.remove();
            });
        }
        var buttonById = { home:slider.querySelector('.emby-tab-button[data-index="0"]'), favorites:favoritesButton, 'my-list':slider.querySelector('.hssm-my-list-tab') };
        definitions.forEach(function (definition) { var id=String(prop(definition,'Id','id','')); buttonById[id]=slider.querySelector('.hssm-custom-page-tab[data-hssm-page-id="' + CSS.escape(id) + '"]'); });
        order.forEach(function (entry) { var button=buttonById[entry.id]; if(button && !entry.hidden) slider.appendChild(button); });
        Object.keys(buttonById).forEach(function (id) { var button=buttonById[id]; if(button && !button.hidden && !order.some(function(entry){return entry.id===id;})) slider.appendChild(button); });
        if (buttonById.home) slider.insertBefore(buttonById.home, slider.firstChild);
        if (buttonById.home && buttonById.home.dataset.hssmHomeBound !== 'true') {
            buttonById.home.dataset.hssmHomeBound = 'true';
            buttonById.home.addEventListener('click', function () { showOwnedHomePanel(0); }, true);
        }
        if (window.CustomElements && typeof window.CustomElements.upgradeSubtree === 'function') window.CustomElements.upgradeSubtree(tabs);
        if (typeof tabs.refresh === 'function') tabs.refresh();
    }

    function showOwnedHomePanel(index) {
        var indexPage = visibleIndexPage();
        var tabs = homeTabsElement();
        if (!indexPage || !tabs) return;
        Array.from(indexPage.querySelectorAll(':scope > .pageTabContent[data-index]')).forEach(function (panel) {
            panel.classList.toggle('is-active', Number(panel.dataset.index) === Number(index));
        });
        Array.from(tabs.querySelectorAll('.emby-tab-button[data-index]')).forEach(function (button) {
            button.classList.toggle('emby-tab-button-active', Number(button.dataset.index) === Number(index));
        });
        tabs.setAttribute('data-index', String(index));
        syncOwnedMediaBarVisibility();
        lastFeatureScope = null;
        lastFeatureRoute = '';
        queueRouteRefresh(true);
    }

    function normalizeInitialHomeSelection() {
        if (initialHomeSelectionNormalized || !isHomeRoute()) return false;
        var indexPage = visibleIndexPage();
        var tabs = homeTabsElement();
        var homePanel = indexPage && indexPage.querySelector(':scope > .pageTabContent[data-index="0"]');
        var homeButton = tabs && tabs.querySelector('.emby-tab-button[data-index="0"]');
        if (!indexPage || !tabs || !homePanel || !homeButton) return false;
        initialHomeSelectionNormalized = true;
        showOwnedHomePanel(0);
        return true;
    }

    function activeMyListContainer() {
        var marker = myListPageMarker();
        if (!marker) return null;
        var panel = marker.closest(".pageTabContent") || marker;
        var panelIndex = panel.getAttribute("data-index");
        var activeButton = panelIndex === null ? null : document.querySelector('.headerTabs .emby-tab-button-active[data-index="' + CSS.escape(panelIndex) + '"], #indexPage .emby-tab-button-active[data-index="' + CSS.escape(panelIndex) + '"]');
        if (!panel.classList.contains("is-active") && !activeButton) return null;
        var container = marker.querySelector(".hssm-my-list-container");
        if (!container) {
            container = document.createElement("div");
            container.className = "sections homeSectionsContainer hssm-my-list-container";
            marker.appendChild(container);
        }
        container.classList.add("homeSectionsContainer");
        return container;
    }

    function activeFavoritesPanel() {
        var indexPage = visibleIndexPage();
        var favoritesTab = indexPage && indexPage.querySelector("#favoritesTab");
        return favoritesTab && favoritesTab.classList.contains("is-active") ? favoritesTab : null;
    }

    function activeCustomPagePanel() {
        var indexPage = visibleIndexPage();
        return indexPage ? indexPage.querySelector(':scope > .hssm-owned-custom-page.is-active') : null;
    }

    function activeCustomPageContainer() {
        var panel = activeCustomPagePanel();
        return panel ? panel.querySelector(':scope > .hssm-custom-page-container') : null;
    }

    function pageSectionsContainer(panel, pageId) {
        if (!panel) return null;
        var container = panel.querySelector(':scope > .hssm-page-sections-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'sections homeSectionsContainer hssm-page-sections-container';
            container.dataset.hssmPageId = pageId;
            panel.appendChild(container);
        }
        return container;
    }

    function activeManagedSectionContainer() {
        var custom = activeCustomPageContainer();
        if (custom) return custom;
        var myList = myListPageMarker();
        if (myList && (myList.classList.contains('is-active') || activeMyListContainer())) return activeMyListContainer();
        var favorites = activeFavoritesPanel();
        if (favorites) return pageSectionsContainer(favorites, 'favorites');
        return activeHomeContainer();
    }

    function pageIdForContainer(container) {
        if (!container) return '';
        var custom = container.closest('.hssm-owned-custom-page');
        if (custom) return custom.dataset.hssmPageId || '';
        if (container.closest('.hssm-my-list-page')) return 'my-list';
        if (container.closest('#favoritesTab')) return 'favorites';
        return 'home';
    }

    function pageLayoutOrder(settings, pageId) {
        var layouts = prop(settings, 'PageLayouts', 'pageLayouts', []);
        var layout = layouts.find(function (candidate) { return String(prop(candidate, 'PageId', 'pageId', 'home')) === pageId; });
        var order = layout ? prop(layout, 'SectionOrder', 'sectionOrder', []).slice() : pageId === 'home' ? prop(settings, 'SectionOrder', 'sectionOrder', []).slice() : [];
        if (pageId === 'my-list' && !order.some(function (value) { return sectionOrderEntry(value).id === 'my-list-content'; })) order.unshift('my-list-content');
        return order;
    }

    function settingsForPage(settings, pageId) {
        var scoped = Object.assign({}, settings);
        scoped.SectionOrder = pageLayoutOrder(settings, pageId);
        scoped.sectionOrder = scoped.SectionOrder;
        return scoped;
    }

    function defaultMyListSection() {
        return {
            Id:'my-list-content', Name:'Added to My List', PageId:'my-list', Type:'my-list-content',
            SourceIds:[], ItemIds:[], ContentOrder:'title-ascending', ArtSize:'medium', ArtType:'automatic',
            ArtShape:'poster', ShowText:true, IsVisible:true, IsMediaBar:false, IsApplied:true
        };
    }

    function sectionsForPage(settings, pageId) {
        var allSections = prop(settings, 'Sections', 'sections', []);
        var sections = allSections.filter(function (section) {
            return String(prop(section, 'PageId', 'pageId', 'home') || 'home') === pageId && prop(section, 'IsVisible', 'isVisible', true) !== false;
        });
        if (pageId === 'my-list' && setting(settings, 'EnableMyList', false) && !allSections.some(function (section) { return String(prop(section, 'Id', 'id', '')) === 'my-list-content'; })) sections.unshift(defaultMyListSection());
        return sections;
    }

    function getJson(path, parameters) {
        return ApiClient.getJSON(ApiClient.getUrl(path, parameters));
    }

    function queryItems(parameters) {
        var userId = currentUserId();
        if (!userId) return Promise.resolve([]);
        var options = Object.assign({
            Fields: 'PrimaryImageAspectRatio,DateCreated,PremiereDate,ProductionYear,CommunityRating,SortName,Tags,Overview,RunTimeTicks,ChildCount,RecursiveItemCount,ParentId,SeriesId,SeriesName,SeriesPrimaryImageTag,ParentLogoImageTag,ParentLogoItemId,UserData',
            ImageTypeLimit: 1,
            EnableImageTypes: 'Primary,Art,Backdrop,Banner,Logo,Thumb,Disc,Box,BoxRear,Screenshot,Menu,Chapter'
        }, parameters || {});
        return getJson('Users/' + encodeURIComponent(userId) + '/Items', options).then(function (result) {
            return prop(result, 'Items', 'items', []);
        });
    }

    function queryIds(ids) {
        var usable = (ids || []).map(String).filter(Boolean);
        var chunks = [];
        for (var index = 0; index < usable.length; index += 100) chunks.push(usable.slice(index, index + 100));
        return chunks.reduce(function (work, chunk) {
            return work.then(function (groups) {
                return queryItems({ Ids: chunk.join(',') }).then(function (items) {
                    groups.push(items);
                    return groups;
                });
            });
        }, Promise.resolve([])).then(function (groups) {
            var byId = {};
            groups.forEach(function (items) {
                items.forEach(function (item) { byId[String(prop(item, 'Id', 'id', ''))] = item; });
            });
            return usable.map(function (id) { return byId[id]; }).filter(Boolean);
        });
    }

    function loadWatchAgainItems(start, limit) {
        return queryItems({
            Filters:'IsPlayed',
            IncludeItemTypes:'Movie,Series',
            Recursive:true,
            SortBy:'DatePlayed,SortName',
            SortOrder:'Descending',
            StartIndex:Math.max(0, Number(start) || 0),
            Limit:Math.max(1, Math.min(100, Number(limit) || 40)),
            EnableTotalRecordCount:false
        });
    }

    function cacheContext() {
        var server = window.ApiClient && typeof ApiClient.serverId === 'function' ? ApiClient.serverId() : 'server';
        return String(server || 'server') + ':' + String(currentUserId() || 'anonymous');
    }

    function cacheRead(name, maximumAge) {
        try {
            var stored = JSON.parse(localStorage.getItem('hssm-v3:' + cacheContext() + ':' + name) || 'null');
            if (!stored || Date.now() - Number(stored.savedAt || 0) > maximumAge) return null;
            return stored.value;
        } catch (_) { return null; }
    }

    function cacheWrite(name, value) {
        try { localStorage.setItem('hssm-v3:' + cacheContext() + ':' + name, JSON.stringify({ savedAt:Date.now(), value:value })); } catch (_) {}
    }

    function cacheRemove(name) {
        try { localStorage.removeItem('hssm-v3:' + cacheContext() + ':' + name); } catch (_) {}
    }

    function clearSectionCaches() {
        try {
            var prefix = 'hssm-v3:' + cacheContext() + ':section:';
            Object.keys(localStorage).filter(function (key) { return key.indexOf(prefix) === 0; }).forEach(function (key) { localStorage.removeItem(key); });
        } catch (_) {}
    }

    function sectionSignature(section) {
        var ids = prop(section, 'ItemIds', 'itemIds', []).map(String);
        return JSON.stringify([String(prop(section, 'Id', 'id', '')), ids.length, ids.slice(0, 5), ids.slice(-5)]);
    }

    function sectionCache(section) {
        var id = String(prop(section, 'Id', 'id', ''));
        var cached = cacheRead('section:' + id, 24 * 60 * 60 * 1000);
        return cached && cached.signature === sectionSignature(section) && Array.isArray(cached.items) ? cached : null;
    }

    function saveSectionCache(section, items, cursor) {
        var id = String(prop(section, 'Id', 'id', ''));
        cacheWrite('section:' + id, { signature:sectionSignature(section), items:items, cursor:cursor });
    }

    function uniqueItems(items) {
        var seen = {};
        return (items || []).filter(function (item) {
            var id = String(prop(item, 'Id', 'id', ''));
            if (!id || seen[id]) return false;
            seen[id] = true;
            return true;
        });
    }

    function postJson(path, body) {
        return ApiClient.ajax({
            type: 'POST',
            url: ApiClient.getUrl(path),
            data: JSON.stringify(body),
            contentType: 'application/json',
            dataType: 'json'
        });
    }

    function tagSource(value, sectionName) {
        var pieces = String(value || '').split('|');
        return {
            SourceLibraryId: resolvedLibraryId(pieces.shift() || ''),
            MetadataType: pieces.shift() || '',
            MetadataValue: pieces.join('|'),
            AdditionalLibraryIds: [],
            CollectionTitle: sectionName || '',
            Overview: '',
            ExistingCollectionAction: '',
            ArtPreference: 'JellyfinDefault'
        };
    }

    function activeSectionDraft(section) {
        var type = String(prop(section, 'Type', 'type', ''));
        var drafts = prop(section, 'Drafts', 'drafts', []) || [];
        if (!drafts.length) return null;
        if (type === 'rotating-sections') {
            var interval = Math.max(1, Number(prop(section, 'RotationIntervalMinutes', 'rotationIntervalMinutes', 1440)) || 1440);
            var start = Math.max(0, Number(prop(section, 'RotationStartUnixMilliseconds', 'rotationStartUnixMilliseconds', 0)) || 0);
            return drafts[Math.floor(Math.max(0, Date.now() - start) / (interval * 60000)) % drafts.length];
        }
        if (type === 'seasonal-sections') {
            var now = new Date();
            var today = (now.getMonth() + 1) * 100 + now.getDate();
            return drafts.find(function (draft) {
                var start = Math.max(1, Number(prop(draft, 'StartMonth', 'startMonth', 1))) * 100 + Math.max(1, Number(prop(draft, 'StartDay', 'startDay', 1)));
                var end = Math.max(1, Number(prop(draft, 'EndMonth', 'endMonth', 12))) * 100 + Math.max(1, Number(prop(draft, 'EndDay', 'endDay', 31)));
                return start <= end ? today >= start && today <= end : today >= start || today <= end;
            }) || null;
        }
        return null;
    }

    function imdbTaggedRating(item) {
        var tags = prop(item, 'Tags', 'tags', []);
        for (var index = 0; index < tags.length; index++) {
            var text = String(tags[index]);
            var match = text.match(/(?:^|\b)IMDb(?:\s+Rating)?[^0-9]{0,12}([0-9]+(?:\.[0-9]+)?)(?:\s*\/\s*10)?/i)
                || text.match(/(?:^|\b)(?:Community\s+)?Rating[^0-9]{0,12}([0-9]+(?:\.[0-9]+)?)(?:\s*\/\s*10)?/i);
            var tagged = match ? Number(match[1]) : NaN;
            if (Number.isFinite(tagged) && tagged > 0 && tagged <= 10) return tagged;
        }
        var nativeRating = Number(prop(item, 'CommunityRating', 'communityRating', NaN));
        return Number.isFinite(nativeRating) && nativeRating > 0 ? nativeRating : null;
    }

    function taggedRating(item) {
        var tags = prop(item, 'Tags', 'tags', []);
        for (var index = 0; index < tags.length; index++) {
            var match = String(tags[index]).match(/(?:community|tmdb|rating)\s*:\s*([0-9]+(?:\.[0-9]+)?)/i);
            if (match) return Number(match[1]);
        }
        return Number(prop(item, 'CommunityRating', 'communityRating', 0)) || 0;
    }

    function dateValue(item, field) {
        var value = field === 'release'
            ? prop(item, 'PremiereDate', 'premiereDate', '') || prop(item, 'ProductionYear', 'productionYear', 0)
            : prop(item, 'DateCreated', 'dateCreated', '');
        var parsed = typeof value === 'number' ? value : Date.parse(value);
        return Number.isFinite(parsed) ? parsed : 0;
    }

    function orderItems(items, section) {
        var order = String(prop(section, 'ContentOrder', 'contentOrder', 'title-ascending'));
        var manualIds = prop(section, 'ItemIds', 'itemIds', []).map(String);
        var sourceIds = prop(section, 'SourceIds', 'sourceIds', []).map(String);
        var ranks = {};
        (manualIds.length ? manualIds : sourceIds).forEach(function (id, index) { ranks[id] = index; });
        var sorted = items.slice();
        if (order === 'random') {
            if (!section._hssmRandomRanks) section._hssmRandomRanks = {};
            sorted.forEach(function (item) {
                var itemId = String(prop(item, 'Id', 'id', ''));
                if (section._hssmRandomRanks[itemId] === undefined) section._hssmRandomRanks[itemId] = Math.random();
            });
            return sorted.sort(function (left, right) {
                return section._hssmRandomRanks[String(prop(left, 'Id', 'id', ''))] - section._hssmRandomRanks[String(prop(right, 'Id', 'id', ''))];
            });
        }
        if (order === 'manual') {
            return sorted.sort(function (left, right) {
                return (ranks[String(prop(left, 'Id', 'id', ''))] ?? Number.MAX_SAFE_INTEGER) - (ranks[String(prop(right, 'Id', 'id', ''))] ?? Number.MAX_SAFE_INTEGER);
            });
        }
        if (order === 'title-descending') return sorted.sort(function (left, right) { return String(prop(right, 'SortName', 'sortName', prop(right, 'Name', 'name', ''))).localeCompare(String(prop(left, 'SortName', 'sortName', prop(left, 'Name', 'name', '')))); });
        if (order === 'release-date-ascending') return sorted.sort(function (left, right) { return dateValue(left, 'release') - dateValue(right, 'release'); });
        if (order === 'release-date-descending') return sorted.sort(function (left, right) { return dateValue(right, 'release') - dateValue(left, 'release'); });
        if (order === 'date-added-descending') return sorted.sort(function (left, right) { return dateValue(right, 'added') - dateValue(left, 'added'); });
        if (order === 'date-added-ascending') return sorted.sort(function (left, right) { return dateValue(left, 'added') - dateValue(right, 'added'); });
        if (order === 'rating-descending') return sorted.sort(function (left, right) { var leftRating = String(prop(section, 'Type', 'type', '')) === 'top-10-50' ? imdbTaggedRating(left) : taggedRating(left); var rightRating = String(prop(section, 'Type', 'type', '')) === 'top-10-50' ? imdbTaggedRating(right) : taggedRating(right); return (rightRating || 0) - (leftRating || 0); });
        return sorted.sort(function (left, right) { return String(prop(left, 'SortName', 'sortName', prop(left, 'Name', 'name', ''))).localeCompare(String(prop(right, 'SortName', 'sortName', prop(right, 'Name', 'name', '')))); });
    }

    function normalizedArtType(section) {
        var type = String(prop(section, 'ArtType', 'artType', 'automatic')).toLowerCase();
        var names = {
            poster: 'Primary',
            primary: 'Primary',
            art: 'Art',
            backdrop: 'Backdrop',
            banner: 'Banner',
            logo: 'Logo',
            thumb: 'Thumb',
            disc: 'Disc',
            box: 'Box',
            'box-rear': 'BoxRear',
            screenshot: 'Screenshot',
            menu: 'Menu',
            chapter: 'Chapter'
        };
        return names[type] || 'Automatic';
    }

    function imageCandidate(item, type) {
        var id = String(prop(item, 'Id', 'id', ''));
        var imageTags = prop(item, 'ImageTags', 'imageTags', {}) || {};
        if (type === 'Backdrop') {
            var backdrops = prop(item, 'BackdropImageTags', 'backdropImageTags', []) || [];
            if (backdrops.length) return { id: id, type: type };
            var parentBackdrops = prop(item, 'ParentBackdropImageTags', 'parentBackdropImageTags', []) || [];
            var parentBackdropId = prop(item, 'ParentBackdropItemId', 'parentBackdropItemId', '');
            if (parentBackdrops.length && parentBackdropId) return { id: String(parentBackdropId), type: type };
            return null;
        }
        if (type === 'Thumb') {
            if (imageTags.Thumb) return { id: id, type: type };
            var parentThumbTag = prop(item, 'ParentThumbImageTag', 'parentThumbImageTag', '');
            var parentThumbId = prop(item, 'ParentThumbItemId', 'parentThumbItemId', '');
            if (parentThumbTag && parentThumbId) return { id: String(parentThumbId), type: type };
            return null;
        }
        if (type === 'Primary') {
            if (imageTags.Primary) return { id: id, type: type };
            var seriesTag = prop(item, 'SeriesPrimaryImageTag', 'seriesPrimaryImageTag', '');
            var seriesId = prop(item, 'SeriesId', 'seriesId', '');
            if (seriesTag && seriesId) return { id: String(seriesId), type: type };
            var primaryTag = prop(item, 'PrimaryImageTag', 'primaryImageTag', '');
            var primaryId = prop(item, 'PrimaryImageItemId', 'primaryImageItemId', id);
            if (primaryTag) return { id: String(primaryId || id), type: type };
            return null;
        }
        return imageTags[type] ? { id: id, type: type } : null;
    }

    function cardImage(item, section) {
        var shape = String(prop(section, 'ArtShape', 'artShape', 'poster'));
        var selected = normalizedArtType(section);
        var preferred = selected === 'Automatic'
            ? (shape === 'wide' ? ['Backdrop', 'Thumb', 'Banner', 'Primary'] : ['Primary', 'Thumb', 'Backdrop'])
            : [selected, 'Primary', 'Thumb', 'Backdrop'];
        var candidate = null;
        preferred.some(function (type) {
            candidate = imageCandidate(item, type);
            return !!candidate;
        });
        if (!candidate) return '';
        var dimensions = shape === 'wide'
            ? { maxWidth: 640, maxHeight: 360, quality: 90 }
            : (shape === 'poster' ? { maxWidth: 360, maxHeight: 540, quality: 90 } : { maxWidth: 480, maxHeight: 480, quality: 90 });
        return ApiClient.getUrl('Items/' + encodeURIComponent(candidate.id) + '/Images/' + candidate.type, dimensions);
    }

    function cardShape(section) {
        var shape = String(prop(section, 'ArtShape', 'artShape', 'poster'));
        if (shape === 'wide') return { name: 'wide', card: 'overflowBackdropCard', padder: 'cardPadder-backdrop' };
        if (shape === 'square') return { name: 'square', card: 'overflowSquareCard', padder: 'cardPadder-square' };
        if (shape === 'circle') return { name: 'circle', card: 'overflowSquareCard', padder: 'cardPadder-square' };
        return { name: 'poster', card: 'overflowPortraitCard', padder: 'cardPadder-overflowPortrait' };
    }

    function card(item, section, rank) {
        var id = String(prop(item, 'Id', 'id', ''));
        var name = String(prop(item, 'Name', 'name', ''));
        var type = String(prop(item, 'Type', 'type', ''));
        var isMyList = String(prop(section, 'Id', 'id', '')) === 'my-list' || String(prop(section, 'Type', 'type', '')) === 'my-list-content';
        var seriesId = String(prop(item, 'SeriesId', 'seriesId', ''));
        var seriesName = String(prop(item, 'SeriesName', 'seriesName', ''));
        var year = prop(item, 'ProductionYear', 'productionYear', '');
        var serverId = typeof ApiClient.serverId === 'function' ? ApiClient.serverId() : '';
        var href = '#/details?id=' + encodeURIComponent(id) + (serverId ? '&serverId=' + encodeURIComponent(serverId) : '');
        var seriesHref = '#/details?id=' + encodeURIComponent(seriesId || id) + (serverId ? '&serverId=' + encodeURIComponent(serverId) : '');
        var shape = cardShape(section);
        var imageItem = isMyList && type === 'Episode' && seriesId ? Object.assign({}, item, { Id:seriesId, ImageTags:{ Primary:prop(item, 'SeriesPrimaryImageTag', 'seriesPrimaryImageTag', '') } }) : item;
        var imageUrl = cardImage(imageItem, section);
        var showText = prop(section, 'ShowText', 'showText', true) !== false;
        var imageStyle = imageUrl ? ' style="background-image:url(&quot;' + escapeHtml(imageUrl) + '&quot;)"' : '';
        var footer = '';
        var textClass = 'cardText hssm-card-text' + (shape.name === 'circle' ? ' cardTextCentered hssm-card-text-centered' : ' hssm-card-text-left');
        if (showText && isMyList && type === 'Episode') {
            footer = '<div class="' + textClass + ' cardText-first hssm-card-title"><bdi><a is="emby-linkbutton" href="' + escapeHtml(seriesHref) + '" class="itemAction textActionButton">' + escapeHtml(seriesName || 'Unknown Series') + '</a></bdi></div><div class="' + textClass + ' cardText-secondary hssm-card-year"><bdi><a is="emby-linkbutton" href="' + escapeHtml(href) + '" class="itemAction textActionButton">' + escapeHtml(name) + '</a></bdi></div>';
        } else if (showText) {
            footer = '<div class="' + textClass + ' cardText-first hssm-card-title"><bdi><a is="emby-linkbutton" href="' + escapeHtml(href) + '" class="itemAction textActionButton">' + escapeHtml(name) + '</a></bdi></div>' + (year ? '<div class="' + textClass + ' cardText-secondary hssm-card-year"><bdi>' + escapeHtml(year) + '</bdi></div>' : '');
        }
        var rankMarkup = rank && prop(section, 'ShowRankNumbers', 'showRankNumbers', true) !== false ? '<span class="hssm-rank-number" aria-hidden="true">' + rank + '</span>' : '';
        return '<div class="card ' + shape.card + ' card-hoverable card-withuserdata hssm-client-card" data-id="' + escapeHtml(id) + '">' + rankMarkup +
            '<div class="cardBox' + (showText ? ' cardBox-bottompadded' : '') + '"><div class="cardScalable"><div class="cardPadder ' + shape.padder + '"></div>' +
            '<a is="emby-linkbutton" href="' + escapeHtml(href) + '" class="cardImageContainer coveredImage cardContent itemAction" aria-label="' + escapeHtml(name) + '"' + imageStyle + '></a>' +
            '</div>' + footer + '</div></div>';
    }

    function sectionNode(section, items, loading) {
        var node = document.createElement('div');
        var id = String(prop(section, 'Id', 'id', ''));
        var name = String(prop(section, 'Name', 'name', ''));
        var artSize = String(prop(section, 'ArtSize', 'artSize', 'medium'));
        var artShape = cardShape(section).name;
        var artType = String(prop(section, 'ArtType', 'artType', 'automatic'));
        node.className = 'verticalSection emby-scroller-container hssm-client-section hssm-size-' + artSize + ' hssm-shape-' + artShape + ' hssm-art-' + artType + (String(prop(section, 'Type', 'type', '')) === 'top-10-50' ? ' hssm-top-ranked hssm-rank-' + String(prop(section, 'RankNumberColorMode', 'rankNumberColorMode', 'solid')) : '');
        node.style.setProperty('--hssm-rank-one', String(prop(section, 'RankNumberColorOne', 'rankNumberColorOne', '#f5f5f7')));
        node.style.setProperty('--hssm-rank-two', String(prop(section, 'RankNumberColorTwo', 'rankNumberColorTwo', '#f5f5f7')));
        var rankFont = String(prop(section, 'RankNumberFontDataUrl', 'rankNumberFontDataUrl', ''));
        if (rankFont && String(prop(section, 'Type', 'type', '')) === 'top-10-50') { var family = 'hssm-rank-' + id.replace(/[^a-z0-9_-]/gi, ''); var styleId = family + '-font'; var fontStyle = document.getElementById(styleId); if (!fontStyle) { fontStyle = document.createElement('style'); fontStyle.id = styleId; document.head.appendChild(fontStyle); } fontStyle.textContent = '@font-face{font-family:"' + family + '";src:url("' + rankFont.replace(/"/g, '') + '")}'; node.style.setProperty('--hssm-rank-font', '"' + family + '"'); }
        node.dataset.hssmSectionId = id;
        if (!items.length) {
            if (loading) {
                node.innerHTML = '<div class="sectionTitleContainer sectionTitleContainer-cards padded-left"><h2 class="sectionTitle sectionTitle-cards">' + escapeHtml(name) + '</h2></div><p class="hssm-section-loading padded-left">Loading section content…</p>';
                node.dataset.hssmLoading = 'true';
            } else if (String(prop(section, 'Type', 'type', '')) === 'my-list-content') {
                node.innerHTML = '<div class="sectionTitleContainer sectionTitleContainer-cards padded-left"><h2 class="sectionTitle sectionTitle-cards">' + escapeHtml(name) + '</h2></div><p class="hssm-empty-list padded-left">My List is empty.</p>';
            } else {
                node.hidden = true;
            }
            return node;
        }
        node.innerHTML = '<div class="sectionTitleContainer sectionTitleContainer-cards padded-left"><h2 class="sectionTitle sectionTitle-cards">' + escapeHtml(name) + '</h2></div>' +
            '<div is="emby-scroller" class="hssm-client-scroller padded-top-focusscale padded-bottom-focusscale" data-horizontal="true" data-centerfocus="true"><div is="emby-itemscontainer" class="focuscontainer-x itemsContainer scrollSlider animatedScrollX hssm-client-items">' +
            items.map(function (item, index) { return card(item, section, String(prop(section, 'Type', 'type', '')) === 'top-10-50' ? index + 1 : 0); }).join('') + '</div></div>';
        return node;
    }

    function upgradeSectionControls(node) {
        if (!node) return;
        if (window.CustomElements && typeof window.CustomElements.upgradeSubtree === 'function') {
            window.CustomElements.upgradeSubtree(node);
        }
    }

    function nativePreferences() {
        var userId = currentUserId();
        if (!userId || typeof ApiClient.getDisplayPreferences !== 'function') return Promise.resolve({});
        return ApiClient.getDisplayPreferences('usersettings', userId, 'emby').then(function (result) {
            var preferences = prop(result, 'CustomPrefs', 'customPrefs', {});
            cacheWrite('native-home-preferences', preferences);
            return preferences;
        }, function () { return {}; });
    }

    function nativeTypes(preferences) {
        var values = [];
        for (var index = 0; index < 10; index++) values.push(preferences['homesection' + index] || defaultSections[index] || 'none');
        return values;
    }

    function sectionOrderEntry(value) {
        var raw = String(value || '');
        var hidden = raw.indexOf('hidden:') === 0;
        return { id:hidden ? raw.slice(7) : raw, hidden:hidden };
    }

    function latestLibraryId(row) {
        if (!row) return '';
        if (row.dataset.hssmLatestLibraryId) return row.dataset.hssmLatestLibraryId;
        var link = row.querySelector('.sectionTitleTextButton[href], .sectionTitleContainer a[href], a.more[href]');
        var href = link ? String(link.getAttribute('href') || '') : '';
        var match = href.match(/[?&](?:topParentId|parentId|id)=([^&#]+)/i);
        if (!match) return '';
        try { return decodeURIComponent(match[1]); } catch (_) { return match[1]; }
    }

    function prepareNativeLatestRows(container, settings, preferences) {
        if (!container) return [];
        var latestIndex = nativeTypes(preferences).indexOf('latestmedia');
        var wrapper = latestIndex >= 0 ? container.querySelector(':scope > .section' + latestIndex) : null;
        var latestRows = [];
        if (wrapper) {
            wrapper.dataset.hssmLatestWrapper = 'true';
            latestRows = Array.from(wrapper.querySelectorAll(':scope > .verticalSection'));
            latestRows.forEach(function (row) {
                var id = latestLibraryId(row);
                if (!id) return;
                row.dataset.hssmLatestLibraryId = id;
                row.dataset.hssmLatestOrderId = 'jellyfin-latest-' + id;
            });
        }
        Array.from(container.querySelectorAll(':scope > [data-hssm-latest-wrapper="true"]')).forEach(function (candidate) {
            if (candidate !== wrapper) delete candidate.dataset.hssmLatestWrapper;
        });
        var hidden = {};
        prop(settings, 'SectionOrder', 'sectionOrder', []).forEach(function (value) {
            var entry = sectionOrderEntry(value);
            if (entry.hidden) hidden[entry.id] = true;
        });
        latestRows.forEach(function (row) {
            row.hidden = !!hidden[row.dataset.hssmLatestOrderId];
        });
        return latestRows;
    }

    function mediaBarTokenEligible(token) {
        return ['smalllibrarytiles', 'librarybuttons', 'latestmedia'].indexOf(String(token || '')) < 0;
    }

    function mediaBarNodeEligible(node, preferences) {
        if (!node || node.hidden) return false;
        if (node.dataset.hssmSectionId) return true;
        return mediaBarTokenEligible(nativeTokenForNode(node, preferences));
    }

    function nodesInOrder(container, settings, preferences) {
        var latestRows = prepareNativeLatestRows(container, settings, preferences);
        var sectionOrder = prop(settings, 'SectionOrder', 'sectionOrder', []).map(sectionOrderEntry);
        var native = nativeTypes(preferences);
        var desired = [];
        var used = new Set();
        function add(node) {
            if (node && !used.has(node)) {
                used.add(node);
                desired.push(node);
            }
        }
        sectionOrder.forEach(function (entry) {
            var id = entry.id;
            if (id.indexOf('jellyfin-latest-') === 0) {
                var latest = latestRows.find(function (row) { return row.dataset.hssmLatestOrderId === id; });
                if (latest) { latest.hidden = entry.hidden; add(latest); }
                return;
            }
            var manager = container.querySelector('[data-hssm-section-id="' + CSS.escape(id) + '"]');
            if (manager) {
                manager.hidden = entry.hidden;
                var mediaBar = container.querySelector(':scope > .hssm-section-media-bar[data-hssm-media-section-id="' + CSS.escape(id) + '"]');
                if (mediaBar) { mediaBar.hidden = entry.hidden; add(mediaBar); }
                add(manager);
                return;
            }
            var match = id.match(/^jellyfin-(\d+)-(.+)$/);
            if (match) {
                var currentIndex = native.indexOf(match[2]);
                if (currentIndex >= 0) {
                    var nativeNode = container.querySelector('.section' + currentIndex);
                    if (nativeNode) nativeNode.hidden = entry.hidden;
                    add(nativeNode);
                }
            }
        });
        Array.from(container.children).forEach(function (node) {
            if (node.dataset.hssmLatestWrapper === 'true') { latestRows.forEach(add); return; }
            add(node);
        });
        return desired;
    }

    function applyHybridOrder(container, settings, preferences) {
        var desired = nodesInOrder(container, settings, preferences);
        Array.from(container.children).forEach(function (node) {
            if (node.dataset.hssmLatestWrapper !== 'true') node.style.order = '';
        });
        var nextOrder = 1;
        desired.forEach(function (node) {
            if (node.parentNode !== container && !node.dataset.hssmLatestOrderId) return;
            node.style.order = String(nextOrder++);
        });
    }

    function setting(settings, name, fallback) {
        return prop(settings, name, name.charAt(0).toLowerCase() + name.slice(1), fallback);
    }

    function requestClientSettings() {
        if (settingsRequest) return settingsRequest;
        settingsRequest = getJson('HomeScreenSectionsManager/client-settings', { _:Date.now() }).then(function (settings) {
            settingsCache = settings || {};
            settingsCacheAt = Date.now();
            cacheWrite('client-settings', settingsCache);
            return settingsCache;
        }).finally(function () { settingsRequest = null; });
        return settingsRequest;
    }

    function reconcileClientSettings(cached) {
        if (settingsReconcileQueued) return;
        settingsReconcileQueued = true;
        requestClientSettings().then(function (live) {
            settingsReconcileQueued = false;
            if (JSON.stringify(live) !== JSON.stringify(cached) && !isDashboardScreen() && !isPlaybackScreen()) routeRefresh(true);
        }, function () { settingsReconcileQueued = false; });
    }

    function getClientSettings(force) {
        if (force) return requestClientSettings();
        if (settingsCache && Date.now() - settingsCacheAt < 60000) return Promise.resolve(settingsCache);
        if (!settingsCache) {
            var cached = cacheRead('client-settings', 24 * 60 * 60 * 1000);
            if (cached) {
                settingsCache = cached;
                settingsCacheAt = Date.now();
                reconcileClientSettings(cached);
                return Promise.resolve(cached);
            }
        }
        return requestClientSettings();
    }

    function currentItemId() {
        var match = window.location.hash.match(/[?&]id=([^&]+)/i);
        return match ? decodeURIComponent(match[1]) : '';
    }

    function currentTopParentId() {
        var match = window.location.hash.match(/[?&](?:topParentId|parentId)=([^&]+)/i);
        return match ? decodeURIComponent(match[1]) : '';
    }

    function activePage() {
        var pages = Array.from(document.querySelectorAll('.libraryPage:not(.hide), .page:not(.hide)'));
        return pages.find(function (page) { return page.id === 'indexPage' && isHomeRoute(); })
            || pages.find(function (page) { return !page.classList.contains('dashboardPage') && !page.closest('.dashboardPage'); })
            || pages[0]
            || null;
    }

    function isPlaybackScreen() {
        var hash = String(window.location.hash || '').toLowerCase();
        if (/^#\/(?:video|audio|nowplaying|livetvplayer)(?:[/?]|$)/.test(hash)) return true;
        return !!document.querySelector('#videoOsdPage:not(.hide), .videoOsdPage:not(.hide), #nowPlayingPage:not(.hide), .nowPlayingPage:not(.hide)');
    }

    function isDashboardScreen() {
        var hash = String(window.location.hash || '').toLowerCase();
        if (hash === "#/home" || hash === "#/home.html" || hash.indexOf("#/home?") === 0 || hash.indexOf("#/home.html?") === 0 || hash.indexOf("#/home/") === 0 || hash.indexOf("#/home.html/") === 0) return false;
        if (/(?:dashboard|configurationpage|plugins|scheduledtasks|serveractivity|networking|branding|users|libraries|metadata|transcoding)/.test(hash)) return true;
        var page = activePage();
        return !!(page && (page.closest('.dashboardPage') || page.classList.contains('dashboardPage') || page.querySelector('.dashboardSection')));
    }

    function isHomeScreen() {
        return !!activeHomeContainer() && !isDashboardScreen() && !isPlaybackScreen();
    }

    function isMediaView() {
        return !isDashboardScreen() && !isPlaybackScreen() && !!activePage();
    }

    function disconnectViewObserver() {
        window.clearTimeout(heartStatusTimer);
        heartStatusTimer = null;
        pendingHeartIds = {};
    }

    function applyLogo(settings) {
        var dataUrl = String(setting(settings, 'LogoImageDataUrl', '') || '');
        var header = document.querySelector('.skinHeader .headerLeft, .headerLeft');
        var homeButton = document.querySelector('.skinHeader .headerHomeButton, .headerHomeButton');
        var logoLink = document.querySelector('.hssm-header-logo-link');
        var shouldShow = !!dataUrl && !!header && !isPlaybackScreen();

        if (!shouldShow) {
            if (logoLink) logoLink.remove();
            if (homeButton) homeButton.classList.remove('hssm-native-home-hidden');
            return;
        }

        if (homeButton) homeButton.classList.add('hssm-native-home-hidden');
        if (!logoLink || logoLink.parentNode !== header) {
            if (logoLink) logoLink.remove();
            logoLink = document.createElement('a');
            logoLink.className = 'hssm-header-logo-link';
            logoLink.href = '#/home';
            logoLink.setAttribute('aria-label', 'Home');
            logoLink.innerHTML = '<img class="hssm-header-logo" alt="Home" />';
            logoLink.addEventListener('click', function (event) {
                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation();
                if (isHomeRoute() && visibleIndexPage() && homeTabsElement()) {
                    showOwnedHomePanel(0);
                } else {
                    initialHomeSelectionNormalized = false;
                    window.location.hash = '#/home';
                    queueRouteRefresh(true);
                }
            }, true);
            var drawer = header.querySelector('.mainDrawerButton');
            if (drawer && drawer.nextSibling) header.insertBefore(logoLink, drawer.nextSibling);
            else header.prepend(logoLink);
        }
        var image = logoLink.querySelector('img');
        if (image && image.src !== dataUrl) image.src = dataUrl;
    }

    function responseItems(response) {
        return prop(response, 'Items', 'items', []);
    }

    function libraryViewSnapshot(view) {
        return {
            Id:String(prop(view, 'Id', 'id', '')),
            Name:String(prop(view, 'Name', 'name', '')).trim(),
            CollectionType:String(prop(view, 'CollectionType', 'collectionType', '')).toLowerCase()
        };
    }

    function libraryAliases() {
        var value = cacheRead('library-id-aliases', 10 * 365 * 24 * 60 * 60 * 1000);
        return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    }

    function rememberLibraryAlias(oldId, newId) {
        oldId = String(oldId || '');
        newId = String(newId || '');
        if (!oldId || !newId || oldId === newId) return;
        var aliases = libraryAliases();
        aliases[oldId] = newId;
        cacheWrite('library-id-aliases', aliases);
    }

    function resolvedLibraryId(id) {
        var current = String(id || '');
        var aliases = libraryAliases();
        var visited = {};
        for (var index = 0; index < 8 && aliases[current] && !visited[current]; index++) {
            visited[current] = true;
            current = String(aliases[current]);
        }
        return current;
    }

    function reconcileLibraryViewSnapshots(views) {
        var current = (views || []).map(libraryViewSnapshot).filter(function (view) { return !!view.Id; });
        var previous = cacheRead('library-view-snapshots', 10 * 365 * 24 * 60 * 60 * 1000) || [];
        var currentIds = {};
        current.forEach(function (view) { currentIds[view.Id] = true; });
        previous.forEach(function (oldView) {
            oldView = libraryViewSnapshot(oldView);
            if (!oldView.Id || currentIds[oldView.Id]) return;
            var matches = current.filter(function (view) {
                return view.Name.toLowerCase() === oldView.Name.toLowerCase() && view.CollectionType === oldView.CollectionType;
            });
            if (matches.length === 1) rememberLibraryAlias(oldView.Id, matches[0].Id);
        });
        cacheWrite('library-view-snapshots', current);
    }

    function liveUserViews(force) {
        if (!force && liveViewsCache && Date.now() - liveViewsCacheAt < 60000) return Promise.resolve(liveViewsCache);
        if (liveViewsRequest) return liveViewsRequest;
        var userId = currentUserId();
        if (!userId) return Promise.resolve([]);
        var request = typeof ApiClient.getUserViews === 'function'
            ? ApiClient.getUserViews({}, userId)
            : getJson('Users/' + encodeURIComponent(userId) + '/Views');
        liveViewsRequest = Promise.resolve(request).then(function (result) {
            liveViewsCache = responseItems(result);
            liveViewsCacheAt = Date.now();
            reconcileLibraryViewSnapshots(liveViewsCache);
            return liveViewsCache;
        }).catch(function () { return liveViewsCache || []; }).finally(function () { liveViewsRequest = null; });
        return liveViewsRequest;
    }

    function nativeSectionItems(token, preferences, container) {
        var native = nativeTypes(preferences);
        var index = native.indexOf(token);
        var row = index >= 0 ? container.querySelector('.section' + index) : null;
        var ids = row ? Array.from(row.querySelectorAll('.card[data-id], [data-id].card')).map(function (node) { return node.getAttribute('data-id'); }).filter(Boolean) : [];
        if (ids.length) return queryIds(ids.slice(0, 30)).then(function (items) {
            return items.map(function (item) { return Object.assign({}, item, { _source: token === 'resume' ? 'resume' : token }); });
        });
        var userId = currentUserId();
        if (token === 'resume' || token === 'resumeaudio' || token === 'resumebook') {
            var resumeOptions = { Limit: 30, Recursive: true, Fields: 'Overview,PrimaryImageAspectRatio,DateCreated,PremiereDate,ProductionYear,OfficialRating,CommunityRating,SortName,Tags,RunTimeTicks,UserData,SeriesName,SeriesId,ParentIndexNumber,IndexNumber,ParentLogoImageTag,ParentLogoItemId', ImageTypeLimit:1, EnableImageTypes:'Primary,Backdrop,Banner,Thumb,Logo' };
            if (token === 'resumeaudio') resumeOptions.MediaTypes = 'Audio';
            if (token === 'resumebook') resumeOptions.IncludeItemTypes = 'Book,AudioBook';
            return getJson('Users/' + encodeURIComponent(userId) + '/Items/Resume', resumeOptions).then(responseItems).then(function (items) {
                return items.map(function (item) { return Object.assign({}, item, { _source: 'resume' }); });
            });
        }
        if (token === 'nextup') return getJson('Shows/NextUp', { UserId: userId, Limit: 30, Fields: 'Overview,PrimaryImageAspectRatio,DateCreated,Path,MediaSourceCount,PremiereDate,ProductionYear,OfficialRating,CommunityRating,RunTimeTicks,UserData,SeriesName,SeriesId,ParentIndexNumber,IndexNumber,ParentLogoImageTag,ParentLogoItemId', ImageTypeLimit:1, EnableImageTypes:'Primary,Backdrop,Banner,Thumb,Logo', EnableTotalRecordCount:false, DisableFirstEpisode:false, EnableResumable:false }).then(responseItems).then(function (items) {
            return items.map(function (item) { return Object.assign({}, item, { _source: 'nextup' }); });
        });
        if (token === 'latestmedia') return queryItems({ Recursive: true, SortBy: 'DateCreated', SortOrder: 'Descending', Limit: 30 });
        if (token === 'livetv') return getJson('LiveTv/Channels', { UserId: userId, Limit: 30, Fields: 'Overview,PrimaryImageAspectRatio,OfficialRating,CommunityRating' }).then(responseItems);
        if (token === 'smalllibrarytiles' || token === 'librarybuttons') {
            return liveUserViews(false);
        }
        return Promise.resolve([]);
    }

    function nativeTokenForNode(node, preferences) {
        if (!node) return '';
        if (node.dataset.hssmLatestLibraryId) return 'latestmedia';
        var types = nativeTypes(preferences);
        for (var index = 0; index < types.length; index++) {
            if (node.classList.contains('section' + index)) return types[index];
        }
        return '';
    }

    function mediaBarSectionItems(section) {
        var type = String(prop(section, 'Type', 'type', ''));
        if (type === 'watch-again') {
            return loadWatchAgainItems(0, 30).then(function (items) {
                return orderItems(uniqueItems(items), section).slice(0, 30);
            });
        }
        if (type === 'my-list-content') {
            return loadLikedItems(false).then(function (items) {
                items = orderItems(uniqueItems(items), section).slice(0, 30);
                var ids = items.map(function (item) { return String(prop(item, 'Id', 'id', '')); }).filter(Boolean);
                if (!ids.length) return [];
                return queryIds(ids).then(function (fresh) {
                    var freshById = {};
                    fresh.forEach(function (item) { freshById[String(prop(item, 'Id', 'id', ''))] = item; });
                    return items.map(function (item) { return freshById[String(prop(item, 'Id', 'id', ''))] || item; });
                }, function () { return items; });
            });
        }
        var ids = prop(section, 'ItemIds', 'itemIds', []).map(String).slice(0, 30);
        var cached = sectionCache(section);
        if (!ids.length) return Promise.resolve([]);
        return queryIds(ids).then(function (items) { return orderItems(uniqueItems(items), section).slice(0, 30); }, function () {
            if (!cached || !cached.items.length) return [];
            var allowed = {}; ids.forEach(function (id) { allowed[id] = true; });
            return orderItems(uniqueItems(cached.items.filter(function (item) { return allowed[String(prop(item, 'Id', 'id', ''))]; })), section).slice(0, 30);
        });
    }

    function resolveMediaBarLogos(items) {
        items = uniqueItems(items || []);
        var seriesIds = [];
        items.forEach(function (item) {
            var tags = prop(item, 'ImageTags', 'imageTags', {}) || {};
            var parentTag = String(prop(item, 'ParentLogoImageTag', 'parentLogoImageTag', '') || '');
            var seriesId = String(prop(item, 'SeriesId', 'seriesId', '') || '');
            if (!tags.Logo && !tags.logo && !parentTag && seriesId && seriesIds.indexOf(seriesId) < 0) seriesIds.push(seriesId);
        });
        if (!seriesIds.length) return Promise.resolve(items);
        return queryIds(seriesIds).then(function (seriesItems) {
            var logos = {};
            seriesItems.forEach(function (series) {
                var id = String(prop(series, 'Id', 'id', '') || '');
                var tags = prop(series, 'ImageTags', 'imageTags', {}) || {};
                var tag = String(tags.Logo || tags.logo || '');
                if (id && tag) logos[id] = tag;
            });
            return items.map(function (item) {
                var tags = prop(item, 'ImageTags', 'imageTags', {}) || {};
                var parentTag = String(prop(item, 'ParentLogoImageTag', 'parentLogoImageTag', '') || '');
                var seriesId = String(prop(item, 'SeriesId', 'seriesId', '') || '');
                if (tags.Logo || tags.logo || parentTag || !logos[seriesId]) return item;
                return Object.assign({}, item, { ParentLogoImageTag:logos[seriesId], ParentLogoItemId:seriesId });
            });
        }, function () { return items; });
    }

    function mediaBarSource(settings, preferences, container, sections) {
        var sectionOrder = prop(settings, 'SectionOrder', 'sectionOrder', []).map(sectionOrderEntry).filter(function (entry) { return !entry.hidden; }).map(function (entry) { return entry.id; });
        var native = nativeTypes(preferences);
        var orderedSource = null;
        sectionOrder.some(function (id) {
            var definition = (sections || []).find(function (section) { return String(prop(section, 'Id', 'id', '')) === id; });
            if (definition) { orderedSource = { managerId:id, definition:definition }; return true; }
            var match = id.match(/^jellyfin-\d+-(.+)$/);
            var token = match && native.indexOf(match[1]) >= 0 ? match[1] : '';
            if (token && mediaBarTokenEligible(token)) { orderedSource = { token:token }; return true; }
            return false;
        });
        if (orderedSource && orderedSource.managerId) return { key:orderedSource.managerId, items:mediaBarSectionItems(orderedSource.definition) };
        if (orderedSource && orderedSource.token) return { key:'jellyfin-' + orderedSource.token, items:nativeSectionItems(orderedSource.token, preferences, container) };
        var topNode = nodesInOrder(container, settings, preferences).find(function (node) { return mediaBarNodeEligible(node, preferences); }) || null;
        if (!topNode) return { key:'none', items:Promise.resolve([]) };
        var managerId = topNode.dataset.hssmSectionId || '';
        if (managerId) {
            var fallbackDefinition = (sections || []).find(function (section) { return String(prop(section, 'Id', 'id', '')) === managerId; });
            return { key:managerId, items:fallbackDefinition ? mediaBarSectionItems(fallbackDefinition) : Promise.resolve([]) };
        }
        var token = nativeTokenForNode(topNode, preferences);
        return { key:'jellyfin-' + token, items:nativeSectionItems(token, preferences, container) };
    }

    function configuredMediaBarKey(settings, preferences) {
        var sections = prop(settings, 'Sections', 'sections', []);
        var native = nativeTypes(preferences || {});
        var key = '';
        prop(settings, 'SectionOrder', 'sectionOrder', []).map(sectionOrderEntry).some(function (entry) {
            if (entry.hidden) return false;
            var id = entry.id;
            if (id.indexOf('jellyfin-latest-') === 0) return false;
            if (sections.some(function (section) { return String(prop(section, 'Id', 'id', '')) === id; })) {
                key = id;
                return true;
            }
            var match = id.match(/^jellyfin-\d+-(.+)$/);
            var token = match && native.indexOf(match[1]) >= 0 ? match[1] : '';
            if (!token || !mediaBarTokenEligible(token)) return false;
            key = 'jellyfin-' + token;
            return true;
        });
        return key;
    }

    function mediaBarUrls(frame, settings) {
        var cssUrl = new URL('ui/spotlight.css', document.baseURI).href;
        return { plugin:ApiClient.getUrl("HomeScreenSectionsManager/media-bar.html", { v:CLIENT_VERSION, abyssCss:cssUrl, intervalSeconds:Math.max(1, Math.min(300, Number(setting(settings || {}, 'MediaBarIntervalSeconds', 5)) || 5)), imageType:String(setting(settings || {}, 'MediaBarImageType', 'abyss-original')) }), css:cssUrl };
    }

    function mediaBarFrameForContainer(container) {
        var homeTab = container && container.closest('#homeTab');
        return homeTab ? homeTab.querySelector(':scope > .hssm-owned-media-bar') : null;
    }

    function suppressAbyssMediaBar(homeTab) {
        if (!homeTab) return;
        Array.from(homeTab.querySelectorAll(':scope > .featurediframe')).forEach(function (frame) {
            frame.dataset.hssmSuppressedAbyssSpotlight = 'true';
            frame.hidden = true;
            frame.style.setProperty('display', 'none', 'important');
            try { frame.contentWindow.postMessage({ type:'abyss-spotlight', action:'pause' }, window.location.origin); } catch (_) {}
        });
    }

    function observeAbyssMediaBar(homeTab) {
        if (!homeTab || (mediaBarOwnerHomeTab === homeTab && mediaBarOwnerObserver)) return;
        if (mediaBarOwnerObserver) mediaBarOwnerObserver.disconnect();
        mediaBarOwnerHomeTab = homeTab;
        mediaBarOwnerObserver = new MutationObserver(function (records) {
            if (records.some(function (record) { return Array.from(record.addedNodes || []).some(function (node) { return node.nodeType === 1 && node.classList && node.classList.contains('featurediframe'); }); })) {
                suppressAbyssMediaBar(homeTab);
            }
        });
        mediaBarOwnerObserver.observe(homeTab, { childList:true });
    }

    function ownedMediaBarIsActive(frame) {
        var indexPage = visibleIndexPage();
        var panel = frame && frame.closest('.pageTabContent');
        return !!(indexPage && panel && panel.classList.contains('is-active') && !document.hidden && isHomeRoute());
    }

    function syncOwnedMediaBarVisibility() {
        Array.from(document.querySelectorAll('.hssm-owned-media-bar')).forEach(function (frame) {
            var active = ownedMediaBarIsActive(frame);
            frame.hidden = !active;
            frame.style.display = active ? 'block' : 'none';
            try { frame.contentWindow.postMessage({ type:'abyss-spotlight', action:active ? 'resume' : 'pause' }, window.location.origin); } catch (_) {}
        });
    }

    function mediaBarPayloadKey(payload) {
        if (!payload) return '';
        return JSON.stringify([
            payload.intervalSeconds,
            payload.imageType,
            (payload.items || []).map(function (item) {
                return [
                    String(prop(item, 'Id', 'id', '')),
                    prop(item, 'ImageTags', 'imageTags', {}),
                    prop(item, 'BackdropImageTags', 'backdropImageTags', []),
                    String(prop(item, 'ParentLogoImageTag', 'parentLogoImageTag', '')),
                    String(prop(item, 'ParentLogoItemId', 'parentLogoItemId', ''))
                ];
            })
        ]);
    }

    function sendMediaBarPayload(frame, force, payload) {
        payload = payload || (frame && frame._hssmPayload) || mediaBarPayload;
        if (!frame || !frame.contentWindow || !payload) return;
        var key = mediaBarPayloadKey(payload) + ':' + String(payload.topGradient === true);
        if (!force && frame.dataset.hssmPayloadSignature === key) return;
        frame.dataset.hssmPayloadSignature = key;
        frame.contentWindow.postMessage(payload, window.location.origin);
    }

    function bindMediaBarMessages() {
        if (mediaBarMessageBound) return;
        mediaBarMessageBound = true;
        window.addEventListener('message', function (event) {
            if (event.origin !== window.location.origin || !event.data || event.data.type !== 'home-screen-manager-media-bar') return;
            var frame = Array.from(document.querySelectorAll('.hssm-owned-media-bar[data-hssm-media-bar="true"]')).find(function (candidate) {
                return event.source === candidate.contentWindow;
            });
            if (!frame || event.source !== frame.contentWindow) return;
            if (event.data.action === 'ready') sendMediaBarPayload(frame, true);
            if (event.data.action === "rendered") {
                frame.dataset.hssmMediaBarReady = "true";
                frame.dataset.hssmAppliedIntervalSeconds = String(event.data.intervalSeconds || '');
                frame.dataset.hssmAppliedImageType = String(event.data.imageType || '');
                delete frame.dataset.hssmMediaBarPending;
            }
        });
    }

    function primeCachedMediaBar() {
        var container = activeHomeContainer();
        if (!container) return false;
        try {
            var cached = cacheRead('media-bar', 24 * 60 * 60 * 1000);
            var cachedSettings = cacheRead('client-settings', 24 * 60 * 60 * 1000);
            var cachedPreferences = cacheRead('native-home-preferences', 24 * 60 * 60 * 1000) || {};
            var expectedKey = cachedSettings ? configuredMediaBarKey(cachedSettings, cachedPreferences) : '';
            var expectedInterval = cachedSettings ? Math.max(1, Math.min(300, Number(setting(cachedSettings, 'MediaBarIntervalSeconds', 5)) || 5)) : 0;
            var expectedImageType = cachedSettings ? String(setting(cachedSettings, 'MediaBarImageType', 'abyss-original')) : '';
            if (!cached || !expectedKey || cached.key !== expectedKey || cached.intervalSeconds !== expectedInterval || cached.imageType !== expectedImageType || !Array.isArray(cached.items) || !cached.items.length) return false;
            mediaBarPayload = {
                type:'home-screen-manager-media-bar',
                action:'configure',
                items:cached.items,
                intervalSeconds:expectedInterval,
                imageType:expectedImageType
            };
            sendMediaBarPayload(ensureMediaBarFrame(container, cachedSettings));
            return true;
        } catch (_) {
            return false;
        }
    }

    function ensureMediaBarFrame(container, settings) {
        var homeTab = container && container.closest('#homeTab');
        suppressAbyssMediaBar(homeTab);
        observeAbyssMediaBar(homeTab);
        var frame = mediaBarFrameForContainer(container);
        if (!frame) {
            frame = document.createElement('iframe');
            frame.className = 'hssm-owned-media-bar';
            frame.title = 'Home Screen Manager Abyss media bar';
            (homeTab || container.parentNode).insertBefore(frame, container);
        }
        frame.dataset.hssmMediaBar = "true";
        frame.dataset.hssmClientVersion = CLIENT_VERSION;
        bindMediaBarMessages();
        var urls = mediaBarUrls(frame, settings);
        if (frame.src !== urls.plugin) {
            frame.addEventListener('load', function handleLoad() {
                frame.removeEventListener('load', handleLoad);
                sendMediaBarPayload(frame, true);
            });
            frame.src = urls.plugin;
        }
        syncOwnedMediaBarVisibility();
        return frame;
    }

    function clearMediaBar(container) {
        window.clearInterval(mediaBarTimer);
        mediaBarTimer = null;
        mediaBarSourceKey = '';
        mediaBarPayload = null;
        Array.from(document.querySelectorAll('.hssm-media-bar')).forEach(function (node) { node.remove(); });
        Array.from(document.querySelectorAll('.hssm-owned-media-bar')).forEach(function (node) { node.remove(); });
        if (mediaBarOwnerObserver) mediaBarOwnerObserver.disconnect();
        mediaBarOwnerObserver = null;
        mediaBarOwnerHomeTab = null;
        var homeTab = container && container.closest('#homeTab');
        if (homeTab) Array.from(homeTab.querySelectorAll(':scope > .featurediframe[data-hssm-suppressed-abyss-spotlight="true"]')).forEach(function (frame) { frame.hidden = false; frame.style.removeProperty('display'); });
        if (container) Array.from(container.children).forEach(function (node) { node.classList.remove('hssm-media-source-section'); });
    }

    function renderMediaBar(settings, preferences, container, sections, sectionItemPromises) {
        var panel = container && container.closest('.pageTabContent');
        var loadSequence = ++mediaBarLoadSequence;
        var source = mediaBarSource(settings, preferences, container, sections, sectionItemPromises);
        var interval = Math.max(1, Math.min(300, Number(setting(settings, 'MediaBarIntervalSeconds', 5)) || 5));
        var requestedImage = String(setting(settings, 'MediaBarImageType', 'abyss-original'));
        var frame = ensureMediaBarFrame(container, settings);
        var matchingCachedPayload = null;
        try {
            var cached = cacheRead('media-bar', 24 * 60 * 60 * 1000);
            if (cached && cached.key === source.key && cached.intervalSeconds === interval && cached.imageType === requestedImage && Array.isArray(cached.items) && cached.items.length) {
                matchingCachedPayload = { type:'home-screen-manager-media-bar', action:'configure', items:cached.items, intervalSeconds:interval, imageType:requestedImage };
                mediaBarPayload = matchingCachedPayload;
                frame._hssmPayload = matchingCachedPayload;
                mediaBarSourceKey = JSON.stringify([source.key, interval, requestedImage, cached.items]);
            }
        } catch (_) {}
        if (matchingCachedPayload) sendMediaBarPayload(frame);
        else {
            mediaBarPayload = null;
            frame._hssmPayload = null;
            mediaBarSourceKey = '';
            frame.dataset.hssmMediaBarPending = 'true';
        }
        return source.items.then(resolveMediaBarLogos).then(function (items) {
            if (loadSequence !== mediaBarLoadSequence || container !== activeHomeContainer()) return;
            var key = JSON.stringify([source.key, interval, requestedImage, items]);
            mediaBarPayload = {
                type: 'home-screen-manager-media-bar',
                action: 'configure',
                items: items,
                intervalSeconds: interval,
                imageType: requestedImage
            };
            frame._hssmPayload = mediaBarPayload;
            cacheWrite('media-bar', { key:source.key, intervalSeconds:interval, imageType:requestedImage, items:items });
            if (key !== mediaBarSourceKey) {
                mediaBarSourceKey = key;
                sendMediaBarPayload(frame);
            }
        }).catch(function (error) {
            if (loadSequence !== mediaBarLoadSequence || container !== activeHomeContainer()) return;
            console.warn('[Home Screen Manager] Could not load the selected media-bar source.', error);
            mediaBarPayload = { type: 'home-screen-manager-media-bar', action: 'configure', items: [], intervalSeconds: 5, imageType: 'backdrop' };
            frame._hssmPayload = mediaBarPayload;
            sendMediaBarPayload(frame);
        });
    }

    function explicitMediaBarSections(sections) {
        return (sections || []).filter(function (section) { return prop(section, 'IsMediaBar', 'isMediaBar', false) === true && prop(section, 'IsVisible', 'isVisible', true) !== false; });
    }

    function ensureSectionMediaBarFrame(container, settings, section, sourceNode, firstOnPage) {
        var id = String(prop(section, 'Id', 'id', ''));
        var panel = container && container.closest('.pageTabContent');
        if (!container || !panel || !id) return null;
        var frame = panel.querySelector('.hssm-section-media-bar[data-hssm-media-section-id="' + CSS.escape(id) + '"]');
        if (!frame) {
            frame = document.createElement('iframe');
            frame.className = 'hssm-owned-media-bar hssm-section-media-bar';
            frame.title = 'Home Screen Manager media bar for ' + String(prop(section, 'Name', 'name', 'section'));
            frame.dataset.hssmMediaSectionId = id;
        }
        frame.classList.toggle('hssm-media-bar-not-first', !firstOnPage);
        frame.style.order = !firstOnPage && sourceNode ? sourceNode.style.order : '';
        frame.dataset.hssmMediaBar = 'true';
        frame.dataset.hssmClientVersion = CLIENT_VERSION;
        if (sourceNode && sourceNode.parentNode === container) container.insertBefore(frame, sourceNode);
        else container.appendChild(frame);
        bindMediaBarMessages();
        var urls = mediaBarUrls(frame, settings);
        if (frame.src !== urls.plugin) {
            frame.addEventListener('load', function handleLoad() { frame.removeEventListener('load', handleLoad); sendMediaBarPayload(frame, true); });
            frame.src = urls.plugin;
        }
        syncOwnedMediaBarVisibility();
        return frame;
    }

    function renderExplicitMediaBars(settings, container, sections, preferences) {
        var configured = explicitMediaBarSections(sections);
        var panel = container && container.closest('.pageTabContent');
        if (!panel) return;
        if (pageIdForContainer(container) === 'home') {
            var defaultKey = configuredMediaBarKey(settingsForPage(settings, 'home'), preferences || latestNativePreferences || {});
            configured = configured.filter(function (section) { return String(prop(section, 'Id', 'id', '')) !== defaultKey; });
        }
        Array.from(panel.querySelectorAll('.hssm-section-media-bar')).forEach(function (frame) {
            if (!configured.some(function (section) { return String(prop(section, 'Id', 'id', '')) === frame.dataset.hssmMediaSectionId; })) frame.remove();
        });
        if (!configured.length) return;
        if (pageIdForContainer(container) === 'home') {
            suppressAbyssMediaBar(panel);
            observeAbyssMediaBar(panel);
        }
        var scoped = settingsForPage(settings, pageIdForContainer(container));
        var visibleOrder = prop(scoped, 'SectionOrder', 'sectionOrder', []).map(sectionOrderEntry).filter(function (entry) { return !entry.hidden; }).map(function (entry) { return entry.id; });
        configured.forEach(function (section) {
            var id = String(prop(section, 'Id', 'id', ''));
            var sourceNode = container.querySelector(':scope > [data-hssm-section-id="' + CSS.escape(id) + '"]');
            var firstOnPage = visibleOrder.length ? visibleOrder[0] === id : configured[0] === section;
            var frame = ensureSectionMediaBarFrame(container, settings, section, sourceNode, firstOnPage);
            if (!frame) return;
            var payload = { type:'home-screen-manager-media-bar', action:'configure', items:[], intervalSeconds:Math.max(1,Math.min(300,Number(setting(settings,'MediaBarIntervalSeconds',5))||5)), imageType:String(setting(settings,'MediaBarImageType','abyss-original')), topGradient:!firstOnPage };
            frame._hssmPayload = payload;
            mediaBarSectionItems(section).then(resolveMediaBarLogos).then(function (items) { if(!frame.isConnected)return; payload.items=items; frame._hssmPayload=payload; sendMediaBarPayload(frame,true,payload); }, function () { sendMediaBarPayload(frame,true,payload); });
        });
        applyHybridOrder(container, scoped, preferences || {});
    }

    function userDataPath(itemId) {
        return 'UserItems/' + encodeURIComponent(itemId) + '/UserData';
    }

    function dismissedNextUpKey() {
        var server = typeof ApiClient.serverId === 'function' ? ApiClient.serverId() : 'server';
        return 'hssm-dismissed-nextup-' + server + '-' + currentUserId();
    }

    function dismissedNextUp() {
        try { return JSON.parse(localStorage.getItem(dismissedNextUpKey()) || '[]'); } catch (_) { return []; }
    }

    function applyRemoveButtons(settings, scope, preferences) {
        scope = scope || activeHomeContainer();
        Array.from(document.querySelectorAll('.hssm-remove-row-button')).forEach(function (button) { if (!setting(settings, 'EnableRemoveContinueNextUp', false) || !scope || !scope.contains(button)) button.remove(); });
        if (!setting(settings, 'EnableRemoveContinueNextUp', false)) return;
        var dismissed = dismissedNextUp();
        if (!scope) return;
        Array.from(scope.querySelectorAll('.verticalSection, .section')).forEach(function (row) {
            var token = nativeTokenForNode(row, preferences || latestNativePreferences);
            var heading = row.querySelector('.sectionTitle, h2');
            var title = heading ? heading.textContent.trim().toLowerCase() : '';
            var isContinue = ['resume', 'resumeaudio', 'resumebook'].indexOf(token) >= 0 || title.indexOf('continue watching') >= 0;
            var isNext = token === 'nextup' || title.indexOf('next up') >= 0;
            if (!isContinue && !isNext) return;
            Array.from(row.querySelectorAll('.card[data-id]')).forEach(function (cardNode) {
                var id = cardNode.getAttribute('data-id');
                if (!id) return;
                if (isNext && dismissed.indexOf(id) >= 0) { cardNode.remove(); return; }
                if (cardNode.querySelector('.hssm-remove-row-button')) return;
                var holder = cardNode.querySelector('.cardScalable, .cardOverlayContainer') || cardNode;
                var button = document.createElement('button');
                button.type = 'button';
                button.className = 'hssm-remove-row-button emby-button';
                button.title = isNext ? 'Remove from Next Up' : 'Remove from Continue Watching';
                button.innerHTML = '<span class="material-icons close" aria-hidden="true"></span>';
                button.addEventListener('click', function (event) {
                    event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation(); button.disabled = true;
                    if (isNext && !cardNode.hasAttribute('data-positionticks')) {
                        var hidden = dismissedNextUp(); if (hidden.indexOf(id) < 0) hidden.push(id);
                        localStorage.setItem(dismissedNextUpKey(), JSON.stringify(hidden)); cardNode.remove(); return;
                    }
                    getJson(userDataPath(id)).then(function (userData) {
                        userData.PlayedPercentage = 0; userData.PlaybackPositionTicks = 0;
                        return postJson(userDataPath(id), userData);
                    }).then(function () { cardNode.remove(); }, function () { button.disabled = false; });
                });
                holder.appendChild(button);
            });
        });
    }

    function setMyListIcon(button, liked) {
        var icon = button.querySelector('.material-icons');
        if (!icon) return;
        icon.className = 'material-icons ' + (liked ? 'favorite' : 'favorite_border');
        icon.textContent = '';
    }

    function setMyListButtonState(button, liked) {
        button.dataset.liked = liked ? 'true' : 'false';
        button.title = liked ? 'Remove from My List' : 'Add to My List';
        setMyListIcon(button, liked);
    }

    function saveLikedItems(items) {
        likedItemsById = {};
        uniqueItems(items).forEach(function (item) { likedItemsById[String(prop(item, 'Id', 'id', ''))] = item; });
        likedItemsLoaded = true;
        cacheWrite('my-list', Object.keys(likedItemsById).map(function (id) { return likedItemsById[id]; }));
        Array.from(document.querySelectorAll('.libraryPage:not(.hide) .hssm-my-list-button, .page:not(.hide) .hssm-my-list-button')).forEach(function (button) {
            if (button.dataset.touched !== 'true') setMyListButtonState(button, !!likedItemsById[String(button.dataset.itemId || '')]);
        });
    }

    function loadLikedItems(force) {
        if (!force && likedItemsLoaded) return Promise.resolve(Object.keys(likedItemsById).map(function (id) { return likedItemsById[id]; }));
        if (likedItemsRequest) return likedItemsRequest;
        if (!likedItemsLoaded) {
            var cached = cacheRead('my-list', 24 * 60 * 60 * 1000);
            if (Array.isArray(cached)) saveLikedItems(cached);
        }
        // Jellyfin's Likes filter is reliable when scoped to a live user view.
        // Resolve those stable view IDs at read time so library renames and
        // delete/recreate operations never leave My List with stale parents.
        likedItemsRequest = liveUserViews(true).then(function (views) {
            return (views || []).filter(function (view) {
                var collectionType = String(prop(view, 'CollectionType', 'collectionType', '') || '').toLowerCase();
                return collectionType !== 'livetv' && collectionType !== 'channels';
            }).reduce(function (work, view) {
                return work.then(function (items) {
                    var parentId = String(prop(view, 'Id', 'id', ''));
                    if (!parentId) return items;
                    var options = {
                        ParentId: parentId,
                        Filters: 'Likes',
                        IncludeItemTypes: 'Movie,Series,Season,Episode,Video,BoxSet,Playlist,Audio,MusicAlbum,MusicArtist,Book,AudioBook',
                        Recursive: true,
                        Fields: 'PrimaryImageAspectRatio,DateCreated,PremiereDate,ProductionYear,CommunityRating,SortName,Tags,Overview,RunTimeTicks,ChildCount,RecursiveItemCount,ParentId,SeriesId,SeriesName,SeriesPrimaryImageTag,ParentLogoImageTag,ParentLogoItemId,UserData',
                        ImageTypeLimit: 1,
                        EnableImageTypes: 'Primary,Backdrop,Banner,Logo,Thumb',
                        EnableTotalRecordCount: false
                    };
                    return ApiClient.getItems(currentUserId(), options).then(function (result) {
                        return items.concat(responseItems(result));
                    }, function (error) {
                        console.warn('[Home Screen Manager] Could not read My List items from one current library.', error);
                        return items;
                    });
                });
            }, Promise.resolve([]));
        }).then(function (items) {
            saveLikedItems(items);
            return items;
        }).finally(function () { likedItemsRequest = null; });
        return likedItemsRequest;
    }

    function queueVisibleHeartStatus(scope) {
        if (!scope) return;
        Array.from(scope.querySelectorAll('.hssm-my-list-button')).forEach(function (button) {
            var id = String(button.dataset.itemId || '');
            if (id) pendingHeartIds[id] = true;
        });
        window.clearTimeout(heartStatusTimer);
        heartStatusTimer = window.setTimeout(function () {
            var ids = Object.keys(pendingHeartIds).slice(0, 100);
            ids.forEach(function (id) { delete pendingHeartIds[id]; });
            if (!ids.length || isDashboardScreen() || isPlaybackScreen()) return;
            heartRequestLane(function () { return queryIds(ids); }).then(function (items) {
                var returned = {};
                items.forEach(function (item) {
                    var id = String(prop(item, 'Id', 'id', ''));
                    returned[id] = true;
                    var liked = !!prop(prop(item, 'UserData', 'userData', {}), 'Likes', 'likes', false);
                    if (liked) likedItemsById[id] = item;
                    else delete likedItemsById[id];
                });
                Array.from(scope.querySelectorAll('.hssm-my-list-button')).forEach(function (button) {
                    var id = String(button.dataset.itemId || '');
                    if (returned[id] && button.dataset.touched !== 'true') setMyListButtonState(button, !!likedItemsById[id]);
                });
            }).catch(function () {});
        }, 150);
    }

    function addMyListButton(cardNode) {
        if (!cardNode || cardNode.querySelector('.hssm-my-list-button')) return;
        var id = String(cardNode.getAttribute('data-id') || '');
        if (!id) return;
        var holder = cardNode.querySelector('.cardScalable, .cardOverlayContainer') || cardNode;
        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'hssm-my-list-button emby-button';
        button.dataset.itemId = id;
        button.setAttribute('data-action', 'none');
        button.innerHTML = '<span class="material-icons favorite_border" aria-hidden="true"></span>';
        setMyListButtonState(button, !!likedItemsById[id]);
        button.addEventListener('click', function (event) {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            if (button.disabled) return;
            var previous = button.dataset.liked === 'true';
            var next = !previous;
            button.dataset.touched = 'true';
            setMyListButtonState(button, next);
            button.disabled = true;
            ApiClient.updateUserItemRating(currentUserId(), id, next).then(function () {
                return next ? ApiClient.getItem(currentUserId(), id).catch(function () { return null; }) : null;
            }).then(function (item) {
                if (next) likedItemsById[id] = item || likedItemsById[id] || { Id:id };
                else delete likedItemsById[id];
                cacheWrite('my-list', Object.keys(likedItemsById).map(function (itemId) { return likedItemsById[itemId]; }));
                myListRenderKey = '';
                myListRevision += 1;
                if (!next && cardNode.closest('.hssm-my-list-container')) cardNode.remove();
            }).catch(function (error) {
                setMyListButtonState(button, previous);
                console.warn('[Home Screen Manager] Could not update My List.', error);
            }).finally(function () {
                button.disabled = false;
                delete button.dataset.touched;
            });
        });
        holder.appendChild(button);
    }

    function paintMyList(container, items) {
        if (!container) return;
        items = uniqueItems(items);
        var definition = { Id: 'my-list', Name: 'Added to My List', ArtSize: 'medium', ArtType: 'automatic', ArtShape: 'poster', ShowText: true };
        var section = sectionNode(definition, items);
        section.hidden = false;
        container.innerHTML = '';
        if (items.length) {
            container.appendChild(section);
            upgradeSectionControls(section);
        }
        else {
            section.innerHTML = '<div class="sectionTitleContainer sectionTitleContainer-cards padded-left"><h2 class="sectionTitle sectionTitle-cards">Added to My List</h2></div><p class="hssm-empty-list padded-left">My List is empty.</p>';
            container.appendChild(section);
        }
        Array.from(container.querySelectorAll('.card[data-id]')).forEach(addMyListButton);
    }

    function renderMyList(container) {
        var key = currentUserId() + ':' + String(myListRevision);
        myListRenderKey = key;
        var cached = cacheRead('my-list', 24 * 60 * 60 * 1000);
        var hasCachedItems = Array.isArray(cached);
        container.dataset.hssmMyListState = 'loading';
        if (hasCachedItems) paintMyList(container, cached);
        else container.innerHTML = '<p class="hssm-loading">Loading My List…</p>';
        return loadLikedItems(true).then(function (items) {
            if (myListRenderKey === key && container.isConnected) {
                paintMyList(container, items);
                container.dataset.hssmMyListRevision = String(myListRevision);
                container.dataset.hssmMyListState = 'ready';
            }
        }).catch(function (error) {
            if (myListRenderKey !== key || !container.isConnected) return;
            container.dataset.hssmMyListState = hasCachedItems ? 'ready' : 'error';
            if (!hasCachedItems) container.innerHTML = '<p class="hssm-empty-list">My List could not be loaded. Please try opening it again.</p>';
            console.warn('[Home Screen Manager] Could not load My List.', error);
        });
    }

    function validHeartColor(value, fallback) {
        value = String(value || '');
        return /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
    }

    function applyMyListHeartColor(settings) {
        var style = document.getElementById('hssm-my-list-heart-style');
        if (!style) {
            style = document.createElement('style');
            style.id = 'hssm-my-list-heart-style';
            document.head.appendChild(style);
        }
        var mode = String(setting(settings, 'MyListHeartColorMode', 'solid'));
        var first = validHeartColor(setting(settings, 'MyListHeartColorOne', '#f5f5f7'), '#f5f5f7');
        var second = validHeartColor(setting(settings, 'MyListHeartColorTwo', first), first);
        var selector = 'body .hssm-my-list-button > .material-icons';
        if (mode === 'solid') {
            style.textContent = selector + ' { background-image:none !important; color:' + first + ' !important; -webkit-text-fill-color:' + first + ' !important; }';
            return;
        }
        var paint = mode === 'vertical-gradient' ? 'linear-gradient(to bottom,' + first + ',' + second + ')' : mode === 'horizontal-gradient' ? 'linear-gradient(to right,' + first + ',' + second + ')' : 'radial-gradient(circle at center,' + first + ' 0%,' + second + ' 100%)';
        style.textContent = selector + ' { background-color:transparent !important; background-image:' + paint + ' !important; background-clip:text !important; -webkit-background-clip:text !important; color:transparent !important; -webkit-text-fill-color:transparent !important; }';
    }

    function syncMyListView(settings) {
        var marker = myListPageMarker();
        var container = activeMyListContainer();
        if (!marker || !container) return;
        applyPageContextTitle(marker, marker.dataset.hssmPageTitle || 'My List');
        var revision = String(myListRevision);
        var state = String(container.dataset.hssmMyListState || '');
        if (container.dataset.hssmMyListRevision !== revision || (state !== 'loading' && state !== 'ready')) {
            renderMyList(container);
        }
    }

    function applyMyList(settings, scope) {
        var enabled = setting(settings, 'EnableMyList', false);
        scope = scope || activePage();
        Array.from(document.querySelectorAll('.hssm-my-list-button')).forEach(function (node) {
            if (!enabled || !scope || !scope.contains(node)) node.remove();
        });
        if (!enabled) {
            Array.from(document.querySelectorAll('.hssm-my-list-detail-button')).forEach(function (node) { node.remove(); });
            return;
        }
        if (scope && !scope.classList.contains('hssm-my-list-page')) Array.from(scope.querySelectorAll('.card[data-id]')).forEach(addMyListButton);
        queueVisibleHeartStatus(scope);
        var detailId = currentItemId();
        if (scope && detailId && !scope.querySelector('.hssm-my-list-detail-button')) {
            var buttons = scope.querySelector('.mainDetailButtons');
            if (buttons) {
                var shell = document.createElement('div');
                shell.className = 'hssm-my-list-detail-button card';
                shell.dataset.id = detailId;
                buttons.appendChild(shell);
                addMyListButton(shell);
            }
        }
    }

    function formatEndTime(ticks) {
        if (!ticks || ticks <= 0) return '';
        var end = new Date(Date.now() + ticks / 10000);
        var time = end.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        var now = new Date();
        return now.toDateString() === end.toDateString() ? time : time + ' ' + end.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }

    function applySeriesInfo(settings) {
        if (!setting(settings, 'EnableSeriesInfo', false)) { Array.from(document.querySelectorAll('.hssm-series-info')).forEach(function (node) { node.remove(); }); return; }
        var id = currentItemId(); if (!id || window.location.hash.indexOf('/details') < 0) return;
        var page = activePage(); if (!page || page.querySelector('.hssm-series-info') || detailWorkKey === id) return;
        var misc = page.querySelector('.itemMiscInfo'); if (!misc) return;
        detailWorkKey = id;
        ApiClient.getItem(currentUserId(), id).then(function (item) {
            var type = String(prop(item, 'Type', 'type', ''));
            if (type !== 'Series' && type !== 'Season') return [];
            return type === 'Season' ? queryItems({ ParentId: id, Recursive: false, IncludeItemTypes: 'Episode', Limit: 1000 }).then(function (episodes) { return [item, episodes]; }) : [item, []];
        }).then(function (values) {
            if (!values.length || !misc.isConnected || misc.querySelector('.hssm-series-info')) return;
            var item = values[0], episodes = values[1], type = String(prop(item, 'Type', 'type', ''));
            var seasons = Number(prop(item, 'ChildCount', 'childCount', 0)) || 0;
            var episodeCount = type === 'Season' ? episodes.length : Number(prop(item, 'RecursiveItemCount', 'recursiveItemCount', 0)) || 0;
            var runtime = type === 'Season' ? episodes.reduce(function (sum, episode) { return sum + (Number(prop(episode, 'RunTimeTicks', 'runTimeTicks', 0)) || 0); }, 0) : (Number(prop(item, 'RunTimeTicks', 'runTimeTicks', 0)) || 0) * episodeCount;
            var parts = [];
            if (type === 'Series' && seasons) parts.push(seasons + (seasons === 1 ? ' Season' : ' Seasons'));
            if (episodeCount) parts.push(episodeCount + (episodeCount === 1 ? ' Episode' : ' Episodes'));
            var end = formatEndTime(runtime); if (end) parts.push('Ends at: ' + end);
            if (parts.length) { var node = document.createElement('div'); node.className = 'hssm-series-info'; node.innerHTML = parts.map(function (part) { return '<div class="mediaInfoItem">' + escapeHtml(part) + '</div>'; }).join(''); misc.appendChild(node); misc.classList.remove('hide'); }
        }).finally(function () { detailWorkKey = ''; });
    }

    function applyCollections(settings) {
        if (!setting(settings, 'EnableCollectionsOnDetailPage', false)) { Array.from(document.querySelectorAll('.hssm-detail-collections')).forEach(function (node) { node.remove(); }); return; }
        var id = currentItemId(); if (!id || window.location.hash.indexOf('/details') < 0) return;
        var page = activePage(); if (!page || page.querySelector('.hssm-detail-collections') || collectionsWorkKey === id) return;
        var content = page.querySelector('.detailPageContent'); if (!content) return;
        collectionsWorkKey = id;
        queryItems({ IncludeItemTypes: 'BoxSet', Recursive: true, Limit: 1000 }).then(function (collections) {
            return Promise.all(collections.map(function (collection) { return queryItems({ ParentId: prop(collection, 'Id', 'id', ''), Recursive: false, Limit: 1000 }).then(function (members) { return members.some(function (member) { return String(prop(member, 'Id', 'id', '')) === id; }) ? collection : null; }); }));
        }).then(function (collections) {
            collections = collections.filter(Boolean); if (!collections.length || !content.isConnected) return;
            var definition = { Id: 'detail-collections', Name: 'Also Part of These Collections', ArtSize: 'small', ArtType: 'primary', ArtShape: 'poster', ShowText: true };
            var node = sectionNode(definition, collections); node.classList.add('hssm-detail-collections'); node.hidden = false;
            var similar = content.querySelector('#similarCollapsible'); if (similar) content.insertBefore(node, similar); else content.appendChild(node);
            upgradeSectionControls(node);
        }).finally(function () { collectionsWorkKey = ''; });
    }

    function breadcrumbDetailHref(id) {
        var href = '#/details?id=' + encodeURIComponent(String(id || ''));
        var serverId = typeof ApiClient.serverId === 'function' ? ApiClient.serverId() : '';
        return serverId ? href + '&serverId=' + encodeURIComponent(serverId) : href;
    }

    function breadcrumbLibraryHref(route, topParentId) {
        var params = [];
        if (topParentId) params.push('topParentId=' + encodeURIComponent(topParentId));
        var serverId = typeof ApiClient.serverId === 'function' ? ApiClient.serverId() : '';
        if (serverId) params.push('serverId=' + encodeURIComponent(serverId));
        params.push('tab=0');
        return '#/' + route + '?' + params.join('&');
    }

    function breadcrumbTopParent(ancestors) {
        var folder = (ancestors || []).find(function (item) { return String(prop(item, 'Type', 'type', '')) === 'CollectionFolder'; });
        if (!folder) folder = (ancestors || []).find(function (item) { return String(prop(item, 'Type', 'type', '')) === 'UserRootFolder'; });
        return folder ? String(prop(folder, 'Id', 'id', '')) : '';
    }

    function breadcrumbItem(id) {
        return id ? ApiClient.getItem(currentUserId(), id).catch(function () { return null; }) : Promise.resolve(null);
    }

    function breadcrumbSiblingItems(options) {
        return queryItems(Object.assign({ Recursive: false, Limit: 500, SortBy: 'SortName', SortOrder: 'Ascending' }, options));
    }

    function closeBreadcrumbPopover() {
        var popover = document.querySelector('.hssm-breadcrumb-popover');
        if (popover) popover.remove();
    }

    function showBreadcrumbPopover(anchor, loadItems, currentId) {
        closeBreadcrumbPopover();
        var wrapper = anchor.closest('.hssm-breadcrumbs-wrapper');
        if (!wrapper) return;
        var popover = document.createElement('div');
        popover.className = 'hssm-breadcrumb-popover';
        popover.innerHTML = '<p>Loadingâ¦</p>';
        wrapper.appendChild(popover);
        loadItems().then(function (items) {
            if (!popover.isConnected) return;
            popover.innerHTML = items.length ? items.map(function (item) {
                var itemId = String(prop(item, 'Id', 'id', ''));
                var name = String(prop(item, 'Name', 'name', ''));
                return '<button type="button" data-hssm-breadcrumb-id="' + escapeHtml(itemId) + '"' + (itemId === String(currentId || '') ? ' class="selected"' : '') + '>' + escapeHtml(name) + '</button>';
            }).join('') : '<p>No related items are available.</p>';
            popover.addEventListener('click', function (event) {
                var itemButton = event.target.closest('[data-hssm-breadcrumb-id]');
                if (!itemButton) return;
                window.location.hash = breadcrumbDetailHref(itemButton.dataset.hssmBreadcrumbId).slice(1);
                closeBreadcrumbPopover();
            });
        }, function () {
            if (popover.isConnected) popover.innerHTML = '<p>Related items could not be loaded.</p>';
        });
    }

    function breadcrumbDefinitions(item, ancestors) {
        var type = String(prop(item, 'Type', 'type', ''));
        var itemId = String(prop(item, 'Id', 'id', ''));
        var parentId = String(prop(item, 'ParentId', 'parentId', ''));
        var seriesId = String(prop(item, 'SeriesId', 'seriesId', ''));
        var topParentId = breadcrumbTopParent(ancestors);
        var route = function (name) { return breadcrumbLibraryHref(name, topParentId); };
        var details = function (id) { return breadcrumbDetailHref(id); };
        var seasons = function (id) { return function () { return breadcrumbSiblingItems({ ParentId: id, IncludeItemTypes: 'Season' }); }; };
        var albums = function (artistId) { return function () { return breadcrumbSiblingItems({ ArtistIds: artistId, IncludeItemTypes: 'MusicAlbum', Recursive: true }); }; };
        var songs = function (albumId) { return function () { return breadcrumbSiblingItems({ ParentId: albumId, IncludeItemTypes: 'Audio' }); }; };
        if (type === 'Movie') return Promise.resolve([
            { text: 'Movies', href: route('movies') },
            { text: String(prop(item, 'Name', 'name', '')) }
        ]);
        if (type === 'Series') return Promise.resolve([
            { text: 'Shows', href: route('tv') },
            { text: String(prop(item, 'Name', 'name', '')) },
            { text: 'All Seasons', loadItems: seasons(itemId) }
        ]);
        if (type === 'Season') return breadcrumbItem(parentId).then(function (series) {
            return [
                { text: 'Shows', href: route('tv') },
                { text: series ? String(prop(series, 'Name', 'name', 'Unknown Series')) : 'Unknown Series', href: details(parentId) },
                { text: String(prop(item, 'Name', 'name', 'Season ' + prop(item, 'IndexNumber', 'indexNumber', ''))), loadItems: seasons(parentId), currentId: itemId }
            ];
        });
        if (type === 'Episode') return Promise.all([breadcrumbItem(seriesId), breadcrumbItem(parentId)]).then(function (values) {
            var series = values[0], season = values[1];
            var seasonName = season ? String(prop(season, 'Name', 'name', '')) : 'Season ' + String(prop(item, 'ParentIndexNumber', 'parentIndexNumber', ''));
            var episodeNumber = String(prop(item, 'IndexNumber', 'indexNumber', '')).padStart(2, '0');
            return [
                { text: 'Shows', href: route('tv') },
                { text: series ? String(prop(series, 'Name', 'name', 'Unknown Series')) : 'Unknown Series', href: details(seriesId) },
                { text: seasonName, loadItems: seasons(seriesId), currentId: parentId },
                { text: String(prop(item, 'ParentIndexNumber', 'parentIndexNumber', '')) + 'x' + episodeNumber + ' - ' + String(prop(item, 'Name', 'name', '')) }
            ];
        });
        if (type === 'MusicArtist') return Promise.resolve([
            { text: 'Music', href: route('music') },
            { text: String(prop(item, 'Name', 'name', '')) },
            { text: 'All Albums', loadItems: albums(itemId) }
        ]);
        if (type === 'MusicAlbum') {
            var albumArtists = prop(item, 'AlbumArtists', 'albumArtists', []) || [];
            var albumArtist = albumArtists[0] || null;
            var artistId = albumArtist ? String(prop(albumArtist, 'Id', 'id', '')) : parentId;
            var artistName = String(prop(item, 'AlbumArtist', 'albumArtist', 'Unknown Artist'));
            return Promise.resolve([
                { text: 'Music', href: route('music') },
                { text: artistName, href: artistId ? details(artistId) : '' },
                { text: String(prop(item, 'Name', 'name', '')), loadItems: albums(artistId), currentId: itemId },
                { text: 'All Songs', loadItems: songs(itemId) }
            ]);
        }
        if (type === 'Audio') return breadcrumbItem(parentId).then(function (album) {
            var albumArtists = album ? (prop(album, 'AlbumArtists', 'albumArtists', []) || []) : [];
            var artist = albumArtists[0] || null;
            var artistId = artist ? String(prop(artist, 'Id', 'id', '')) : '';
            var artistName = album ? String(prop(album, 'AlbumArtist', 'albumArtist', 'Unknown Artist')) : 'Unknown Artist';
            return [
                { text: 'Music', href: route('music') },
                { text: artistName, href: artistId ? details(artistId) : '' },
                { text: album ? String(prop(album, 'Name', 'name', 'Unknown Album')) : 'Unknown Album', loadItems: albums(artistId), currentId: parentId },
                { text: String(prop(item, 'Name', 'name', '')) }
            ];
        });
        return Promise.resolve([]);
    }

    function applyBreadcrumbs(settings) {
        var existing = document.querySelector('.hssm-breadcrumbs-wrapper');
        var id = currentItemId();
        if (!setting(settings, 'EnableBreadcrumbs', false) || !id || window.location.hash.indexOf('/details') < 0 || window.innerWidth < 768) {
            if (existing) existing.remove();
            closeBreadcrumbPopover();
            return;
        }
        if (existing && existing.dataset.hssmItemId === id) return;
        if (breadcrumbsWorkKey === id) return;
        breadcrumbsWorkKey = id;
        var target = document.querySelector('.skinHeader .headerLeft, .headerLeft');
        if (!target) { breadcrumbsWorkKey = ''; return; }
        Promise.all([
            ApiClient.getItem(currentUserId(), id),
            typeof ApiClient.getAncestorItems === 'function' ? ApiClient.getAncestorItems(id).catch(function () { return []; }) : Promise.resolve([])
        ]).then(function (values) {
            return breadcrumbDefinitions(values[0], values[1]);
        }).then(function (definitions) {
            if (!definitions.length || currentItemId() !== id || !target.isConnected) return;
            var old = document.querySelector('.hssm-breadcrumbs-wrapper');
            if (old) old.remove();
            var wrapper = document.createElement('div');
            wrapper.className = 'hssm-breadcrumbs-wrapper';
            wrapper.dataset.hssmItemId = id;
            var nav = document.createElement('nav');
            nav.className = 'hssm-breadcrumbs';
            nav.setAttribute('aria-label', 'Breadcrumb');
            definitions.forEach(function (definition, index) {
                if (index) {
                    var separator = document.createElement('span');
                    separator.className = 'hssm-breadcrumb-separator';
                    separator.textContent = ' / ';
                    nav.appendChild(separator);
                }
                var element;
                if (definition.href) {
                    element = document.createElement('a');
                    element.href = definition.href;
                } else if (definition.loadItems) {
                    element = document.createElement('button');
                    element.type = 'button';
                    element.addEventListener('click', function (event) {
                        event.stopPropagation();
                        showBreadcrumbPopover(element, definition.loadItems, definition.currentId);
                    });
                } else {
                    element = document.createElement('span');
                }
                element.className = 'hssm-breadcrumb-element';
                element.textContent = definition.text;
                nav.appendChild(element);
            });
            wrapper.appendChild(nav);
            target.appendChild(wrapper);
        }).catch(function (error) {
            console.warn('[Home Screen Manager] Could not build Jellyfin breadcrumbs.', error);
        }).finally(function () {
            if (breadcrumbsWorkKey === id) breadcrumbsWorkKey = '';
        });
    }

    function applyInfiniteScroll(settings) {
        var ids = setting(settings, 'InfiniteScrollLibraryIds', []).map(resolvedLibraryId);
        infiniteLibraryKey = ids.indexOf(currentTopParentId()) >= 0 ? currentTopParentId() : '';
        document.body.classList.toggle('hssm-infinite-scroll-active', !!infiniteLibraryKey);
    }

    function tryInfiniteScroll() {
        if (!infiniteLibraryKey || infiniteLoading || window.innerHeight + window.scrollY < document.documentElement.scrollHeight - 900) return;
        var page = activePage(); if (!page) return;
        var next = page.querySelector('.btnNextPage:not([disabled])');
        var container = page.querySelector('.tabContent.is-active .itemsContainer, .itemsContainer');
        if (!next || !container || !container.children.length) return;
        infiniteLoading = true;
        var scrollY = window.scrollY;
        var previous = Array.from(container.children).map(function (node) { return node.cloneNode(true); });
        var previousFirst = container.querySelector('[data-id]') ? container.querySelector('[data-id]').getAttribute('data-id') : '';
        next.click();
        var attempts = 0;
        var poll = window.setInterval(function () {
            attempts += 1;
            var first = container.querySelector('[data-id]');
            if ((first && first.getAttribute('data-id') !== previousFirst) || attempts > 80) {
                window.clearInterval(poll);
                if (attempts <= 80) {
                    var currentIds = new Set(Array.from(container.querySelectorAll('[data-id]')).map(function (node) { return node.getAttribute('data-id'); }));
                    var fragment = document.createDocumentFragment(); previous.forEach(function (node) { var id = node.getAttribute && node.getAttribute('data-id'); if (!id || !currentIds.has(id)) fragment.appendChild(node); });
                    container.insertBefore(fragment, container.firstChild); window.scrollTo(0, scrollY);
                }
                infiniteLoading = false;
            }
        }, 100);
    }

    function runEnhancedSearch(page, term, mode) {
        var resultHost = page.querySelector('.hssm-search-results'); if (!resultHost) return;
        if (!term.trim()) { resultHost.innerHTML = ''; page.classList.remove('hssm-search-showing'); return; }
        page.classList.add('hssm-search-showing'); resultHost.innerHTML = '<p class="hssm-loading">Searching Jellyfin…</p>';
        var types = mode === 'music' ? 'Audio,MusicAlbum,MusicArtist,MusicVideo' : mode === 'books' ? 'Book,AudioBook' : mode === 'all' ? 'Movie,Series,Season,Episode,Video,BoxSet,Playlist,Audio,MusicAlbum,MusicArtist,MusicVideo,Book,AudioBook' : 'Movie,Series,Season,Episode,Video';
        queryItems({ SearchTerm: term.trim(), IncludeItemTypes: types, Recursive: true, Limit: 100 }).then(function (items) {
            if (!resultHost.isConnected) return;
            var definition = { ArtSize: 'medium', ArtType: 'automatic', ArtShape: 'poster', ShowText: true };
            resultHost.innerHTML = '<p class="hssm-search-count">' + items.length + (items.length === 1 ? ' result' : ' results') + '</p><div class="hssm-search-grid">' + uniqueItems(items).map(function (item) { return card(item, definition); }).join('') + '</div>';
            Array.from(resultHost.querySelectorAll('.card[data-id]')).forEach(addMyListButton);
        }, function () { resultHost.innerHTML = '<p>Jellyfin search could not be completed.</p>'; });
    }

    function applyEnhancedSearch(settings) {
        var enabled = setting(settings, 'EnableEnhancedSearch', false);
        var page = document.getElementById('searchPage') || (window.location.hash.indexOf('/search') >= 0 ? activePage() : null);
        if (!enabled) { Array.from(document.querySelectorAll('.hssm-search-controls, .hssm-search-results')).forEach(function (node) { node.remove(); }); if (page) page.classList.remove('hssm-search-showing'); return; }
        if (!page) return;
        var input = page.querySelector('#searchTextInput'); if (!input || page.querySelector('.hssm-search-controls')) return;
        var controls = document.createElement('div'); controls.className = 'hssm-search-controls';
        controls.innerHTML = [['all','All'],['core','Movies & TV'],['music','Music'],['books','Books']].map(function (entry) { return '<button type="button" class="emby-button ' + (entry[0] === searchMode ? 'raised button-submit' : '') + '" data-hssm-search-mode="' + entry[0] + '">' + entry[1] + '</button>'; }).join('');
        var results = document.createElement('div'); results.className = 'hssm-search-results';
        var inputContainer = input.closest('.inputContainer, .searchfields') || input; inputContainer.parentNode.insertBefore(controls, inputContainer.nextSibling); controls.parentNode.insertBefore(results, controls.nextSibling);
        function search() { window.clearTimeout(searchTimer); searchTimer = window.setTimeout(function () { runEnhancedSearch(page, input.value, searchMode); }, 250); }
        input.addEventListener('input', search);
        controls.addEventListener('click', function (event) { var button = event.target.closest('[data-hssm-search-mode]'); if (!button) return; searchMode = button.dataset.hssmSearchMode; Array.from(controls.querySelectorAll('button')).forEach(function (entry) { entry.classList.toggle('raised', entry === button); entry.classList.toggle('button-submit', entry === button); }); search(); });
        if (input.value) search();
    }
    function sectionPageIds(section, cursor, limit) {
        var ids = prop(section, 'ItemIds', 'itemIds', []).map(String).filter(Boolean);
        if (String(prop(section, 'Type', 'type', '')) === 'top-10-50') {
            ids = ids.slice(0, Math.max(10, Math.min(50, Number(prop(section, 'DisplayTopCount', 'displayTopCount', 10)) || 10)));
        }
        return ids.slice(cursor, cursor + limit);
    }

    function attachSectionPaging(state) {
        if (!state || !state.node || !state.node.isConnected) return;
        var scroller = state.node.querySelector(".hssm-client-scroller");
        if (!scroller || scroller.dataset.hssmPagingBound === "true") return;
        scroller.dataset.hssmPagingBound = "true";
        scroller.addEventListener("scroll", function () {
            if (scroller.scrollLeft + scroller.clientWidth < scroller.scrollWidth - Math.max(600, scroller.clientWidth)) return;
            if (state.dynamicLoader) loadDynamicPage(state);
            else loadSectionPage(state);
        }, { passive:true });
    }

    function loadDynamicPage(state) {
        if (!state || !state.dynamicLoader || state.loading || state.complete || state.generation !== runtimeGeneration) return;
        state.loading = true;
        var start = state.cursor;
        homeRequestLane(function () { return state.dynamicLoader(start, 40); }).then(function (items) {
            if (!sectionStateIsCurrent(state) || state.generation !== runtimeGeneration || !state.container.isConnected) return;
            items = uniqueItems(items || []);
            state.items = uniqueItems(state.items.concat(items));
            state.cursor = start + items.length;
            state.complete = Number.isFinite(state.dynamicTotal) ? state.cursor >= state.dynamicTotal : items.length < 40;
            saveSectionCache(state.section, state.items, state.cursor);
            paintSectionState(state, false);
        }).catch(function (error) {
            console.warn("[Home Screen Manager] A dynamic section page could not load.", error);
        }).finally(function () { state.loading = false; });
    }

    function sectionStateIsCurrent(state) {
        if (!state) return false;
        var id = String(prop(state.section, 'Id', 'id', ''));
        return !!id && sectionRuntime[id] === state;
    }

    function paintSectionState(state, loading) {
        if (!state || !sectionStateIsCurrent(state) || state.generation !== runtimeGeneration || !state.container.isConnected) return;
        var oldNode = state.node;
        var oldScroller = oldNode && oldNode.querySelector('.hssm-client-scroller');
        var oldScrollLeft = oldScroller ? oldScroller.scrollLeft : 0;
        var ordered = orderItems(uniqueItems(state.items), state.section);
        var nextNode = sectionNode(state.section, ordered, loading);
        if (oldNode && oldNode.isConnected) oldNode.replaceWith(nextNode);
        else state.container.appendChild(nextNode);
        state.node = nextNode;
        upgradeSectionControls(nextNode);
        var nextScroller = nextNode.querySelector('.hssm-client-scroller');
        if (nextScroller && oldScrollLeft) nextScroller.scrollLeft = oldScrollLeft;
        attachSectionPaging(state);
        if (setting(state.settings, 'EnableMyList', false)) Array.from(nextNode.querySelectorAll('.card[data-id]')).forEach(addMyListButton);
        applyHybridOrder(state.container, state.settings, state.preferences);
    }

    function loadSectionPage(state) {
        if (!state || state.loading || state.complete || state.generation !== runtimeGeneration) return;
        var pageIds = sectionPageIds(state.section, state.cursor, 40);
        if (!pageIds.length) {
            state.complete = true;
            if (!state.items.length) paintSectionState(state, false);
            return;
        }
        state.loading = true;
        homeRequestLane(function () { return queryIds(pageIds); }).then(function (items) {
            if (!sectionStateIsCurrent(state) || state.generation !== runtimeGeneration || !state.container.isConnected) return;
            state.items = uniqueItems(state.items.concat(items));
            state.cursor += pageIds.length;
            state.complete = sectionPageIds(state.section, state.cursor, 1).length === 0;
            saveSectionCache(state.section, state.items, state.cursor);
            paintSectionState(state, false);
        }).catch(function (error) {
            if (state.generation === runtimeGeneration) {
                lastError = String(error && (error.message || error.statusText) || error || 'Section loading failed');
                console.warn('[Home Screen Manager] A section page could not be loaded.', error);
                paintSectionState(state, false);
            }
        }).finally(function () { state.loading = false; });
    }

    function loadDynamicSection(state) {
        var type = String(prop(state.section, "Type", "type", ""));
        var request = null;
        state.dynamicLoader = null;
        state.dynamicTotal = null;
        if (type === "my-list-content") {
            request = loadLikedItems(true).then(function (items) {
                state.dynamicTotal = items.length;
                return items;
            });
        } else if (type === "watch-again") {
            state.dynamicLoader = function (start, limit) { return loadWatchAgainItems(start, limit); };
            request = state.dynamicLoader(0, 40);
        } else if (type === "other-users-activity") {
            var maximum = Math.max(1, Math.min(100, Number(prop(state.section, "ActivityMaxItems", "activityMaxItems", 20)) || 20));
            request = getJson("HomeScreenSectionsManager/other-users-items", {
                mediaType:prop(state.section, "ActivityMediaType", "activityMediaType", "movies"),
                limit:maximum
            }).then(function (result) {
                var ids = prop(result, "ItemIds", "itemIds", []).map(String).filter(Boolean).slice(0, maximum);
                state.dynamicTotal = ids.length;
                state.dynamicLoader = function (start, limit) { return queryIds(ids.slice(start, start + limit)); };
                return state.dynamicLoader(0, 40);
            });
        } else if (type === "rotating-sections" || type === "seasonal-sections") {
            var draft = activeSectionDraft(state.section);
            if (!draft) return;
            var sourceType = String(prop(draft, "SourceType", "sourceType", ""));
            var sourceId = String(prop(draft, "SourceId", "sourceId", ""));
            if (sourceType === "collection" || sourceType === "library") {
                var parentId = sourceType === "library" ? resolvedLibraryId(sourceId) : sourceId;
                state.dynamicLoader = function (start, limit) { return queryItems({ ParentId:parentId, Recursive:true, StartIndex:start, Limit:limit }); };
                request = state.dynamicLoader(0, 40);
            }
            if (sourceType === "tag") {
                request = postJson("CollectionManager/individual-collection-drafts/preview", tagSource(sourceId, prop(state.section, "Name", "name", ""))).then(function (preview) {
                    var ids = prop(preview, "Items", "items", []).map(function (item) { return String(prop(item, "Id", "id", "")); }).filter(Boolean);
                    state.dynamicTotal = ids.length;
                    state.dynamicLoader = function (start, limit) { return queryIds(ids.slice(start, start + limit)); };
                    return state.dynamicLoader(0, 40);
                });
            }
        }
        if (!request) return;
        return Promise.resolve(request).then(function (items) {
            if (!sectionStateIsCurrent(state) || state.generation !== runtimeGeneration || !state.container.isConnected) return;
            state.items = uniqueItems(items || []);
            state.cursor = state.items.length;
            state.complete = Number.isFinite(state.dynamicTotal) ? state.cursor >= state.dynamicTotal : state.items.length < 40;
            saveSectionCache(state.section, state.items, state.cursor);
            paintSectionState(state, false);
        }).catch(function (error) {
            console.warn("[Home Screen Manager] A dynamic section could not refresh; its saved content remains visible.", error);
        });
    }

    function initializeSection(section, container, settings, preferences, generation) {
        var id = String(prop(section, 'Id', 'id', ''));
        var cached = sectionCache(section);
        var state = {
            section:section,
            container:container,
            settings:settings,
            preferences:preferences,
            generation:generation,
            items:cached ? cached.items : [],
            cursor:cached ? Math.max(0, Number(cached.cursor) || cached.items.length) : 0,
            complete:false,
            loading:false,
            dynamicLoader:null,
            dynamicTotal:null,
            node:null
        };
        sectionRuntime[id] = state;
        paintSectionState(state, !cached);
        var type = String(prop(section, 'Type', 'type', ''));
        if (type === 'my-list-content' || type === 'watch-again') state.complete = false;
        else if (!cached || !cached.items.length) loadSectionPage(state);
        else state.complete = sectionPageIds(section, state.cursor, 1).length === 0;
        if (type === 'my-list-content' || type === 'watch-again' || type === 'other-users-activity' || type === 'rotating-sections' || type === 'seasonal-sections') {
            window.setTimeout(function () {
                if (state.generation === runtimeGeneration && sectionStateIsCurrent(state)) homeRequestLane(function () { return loadDynamicSection(state); });
            }, type === 'my-list-content' || type === 'watch-again' ? 0 : 800);
        }
        return state;
    }

    function clearPageContextTitle() {
        Array.from(document.querySelectorAll(".hssm-page-context-title")).forEach(function (node) { node.remove(); });
        Array.from(document.querySelectorAll(".pageTitle.hssm-page-context-source")).forEach(function (node) { node.classList.remove("hssm-page-context-source"); });
    }

    function queueLibraryPageContextTitle(scope, libraryId) {
        var key = String(window.location.hash || '') + ':' + String(libraryId || '');
        if (!scope || !libraryId || pageContextWorkKey === key) return;
        pageContextWorkKey = key;
        ApiClient.getItem(currentUserId(), libraryId).then(function (item) {
            if (pageContextWorkKey !== key || !scope.isConnected || currentTopParentId() !== libraryId) return;
            var name = String(prop(item, 'Name', 'name', '') || '').trim();
            if (name) applyPageContextTitle(scope, name);
        }).catch(function () {});
    }

    function applyPageContextTitle(scope, explicitTitle) {
        if (!scope) { clearPageContextTitle(); return; }
        var headerTabs = document.querySelector(".headerTabs.sectionTabs");
        var hasVisibleTabs = headerTabs && !headerTabs.classList.contains("hide") && headerTabs.querySelector(".emby-tab-button");
        var libraryId = explicitTitle ? '' : currentTopParentId();
        if (libraryId) hasVisibleTabs = true;
        if (explicitTitle) hasVisibleTabs = true;
        if (!explicitTitle && !hasVisibleTabs) { clearPageContextTitle(); return; }
        var source = document.querySelector(".skinHeader .pageTitle, .headerTop .pageTitle, .pageTitle");
        var title = String(explicitTitle || (source && source.textContent) || "").replace(/\s+/g, " ").trim();
        if (!title && libraryId) {
            var currentView = (liveViewsCache || []).find(function (view) { return String(prop(view, 'Id', 'id', '')) === libraryId; });
            title = String(prop(currentView, 'Name', 'name', '') || '').trim();
        }
        if (!title && libraryId) {
            queueLibraryPageContextTitle(scope, libraryId);
            return;
        }
        if (!title) { clearPageContextTitle(); return; }
        var target = scope;
        if (!explicitTitle && headerTabs) {
            var activeButton = headerTabs.querySelector(".emby-tab-button-active");
            var activeIndex = activeButton && activeButton.getAttribute("data-index");
            target = activeIndex !== null && activeIndex !== undefined ? scope.querySelector(".pageTabContent[data-index=\"" + CSS.escape(String(activeIndex)) + "\"]") || scope : scope;
        }
        Array.from(document.querySelectorAll(".hssm-page-context-title")).forEach(function (node) {
            if (node.parentNode !== target) node.remove();
        });
        var heading = Array.from(target.children).find(function (node) { return node.classList && node.classList.contains("hssm-page-context-title"); });
        if (!heading) {
            heading = document.createElement("h1");
            heading.className = "hssm-page-context-title";
            target.insertBefore(heading, target.firstChild);
        }
        heading.textContent = title;
        Array.from(document.querySelectorAll(".pageTitle.hssm-page-context-source")).forEach(function (node) {
            if (node !== source) node.classList.remove("hssm-page-context-source");
        });
        if (source) source.classList.add("hssm-page-context-source");
        if (libraryId) queueLibraryPageContextTitle(scope, libraryId);
    }

    function applyRouteFeatures(settings, scope, home, preferences) {
        document.body.classList.add('hssm-client-enabled');
        applyLogo(settings);
        applyMyListHeartColor(settings);
        applyMyList(settings, scope);
        if (home) {
            clearPageContextTitle();
            closeBreadcrumbPopover();
            var staleBreadcrumbs = document.querySelector(".hssm-breadcrumbs-wrapper");
            if (staleBreadcrumbs) staleBreadcrumbs.remove();
            breadcrumbsWorkKey = "";
            document.body.classList.remove("hssm-infinite-scroll-active");
            infiniteLibraryKey = "";
            applyRemoveButtons(settings, scope, preferences);
            return;
        }
        if (activeMyListContainer()) {
            clearPageContextTitle();
            return;
        }
        applyPageContextTitle(scope, "");
        applySeriesInfo(settings);
        applyCollections(settings);
        applyBreadcrumbs(settings);
        applyInfiniteScroll(settings);
        applyEnhancedSearch(settings);
    }
    function signature(settings, pageId) {
        return JSON.stringify({
            pageId: pageId || 'home',
            sections: sectionsForPage(settings, pageId || 'home'),
            order: pageLayoutOrder(settings, pageId || 'home')
        });
    }

    function renderHomeRows(settings, preferences, generation, container) {
        container = container || activeHomeContainer();
        if (!container || generation !== runtimeGeneration) return false;
        var pageId = pageIdForContainer(container) || 'home';
        var sections = sectionsForPage(settings, pageId);
        var scopedSettings = settingsForPage(settings, pageId);
        Array.from(container.querySelectorAll(":scope > [data-hssm-section-id]")).forEach(function (node) { node.remove(); });
        sectionRuntime = {};
        sections.forEach(function (section) {
            var id = String(prop(section, 'Id', 'id', ''));
            var existing = id ? container.querySelector(':scope > [data-hssm-section-id="' + CSS.escape(id) + '"]') : null;
            if (existing) existing.remove();
            initializeSection(section, container, scopedSettings, pageId === 'home' ? preferences : {}, generation);
        });
        lastContainer = container;
        container.dataset.hssmClientVersion = CLIENT_VERSION;
        lastSignature = signature(settings, pageId);
        lastError = '';
        renderedSectionCount = sections.length;
        applyHybridOrder(container, scopedSettings, pageId === 'home' ? preferences : {});
        var customPanel = container.closest('.hssm-owned-custom-page');
        applyRouteFeatures(settings, container.closest('.libraryPage, .page') || container, pageId === 'home' || !!customPanel, pageId === 'home' ? preferences : {});
        if (customPanel) clearPageContextTitle();
        return true;
    }

    function homeContainerNeedsMount(container, sections, settings) {
        if (!container || (pageIdForContainer(container) === 'home' && !container.querySelector(':scope > .section0'))) return false;
        var pageId = pageIdForContainer(container) || 'home';
        if (container !== lastContainer || signature(settings, pageId) !== lastSignature) return true;
        if (container.dataset.hssmClientVersion !== CLIENT_VERSION) return true;
        return sections.some(function (section) {
            var id = String(prop(section, 'Id', 'id', ''));
            return id && !container.querySelector(':scope > [data-hssm-section-id="' + CSS.escape(id) + '"]');
        });
    }

    function renderActiveManagedPage(settings) {
        var container = activeManagedSectionContainer();
        if (!container || container === activeHomeContainer()) return false;
        var pageId = pageIdForContainer(container);
        var sections = sectionsForPage(settings, pageId);
        if (homeContainerNeedsMount(container, sections, settings) || container !== lastContainer) renderHomeRows(settings, {}, ++runtimeGeneration, container);
        else {
            applyHybridOrder(container, settingsForPage(settings, pageId), {});
            applyRouteFeatures(settings, container.closest('.libraryPage, .page') || container, !!container.closest('.hssm-owned-custom-page'), {});
        }
        var customPanel = container.closest('.hssm-owned-custom-page');
        if (customPanel) clearPageContextTitle();
        renderExplicitMediaBars(settings, container, sections);
        return true;
    }

    function bindHomeSettingsChange(container) {
        if (!container || homeSettingsListenerContainer === container) return;
        if (homeSettingsListenerContainer) homeSettingsListenerContainer.removeEventListener('settingschange', handleHomeSettingsChange);
        homeSettingsListenerContainer = container;
        container.addEventListener('settingschange', handleHomeSettingsChange);
    }

    function handleHomeSettingsChange() {
        cacheRemove('native-home-preferences');
        queueRouteRefresh(true);
    }

    function installViewShowHook() {
        if (!window.Emby || !Emby.Page || typeof Emby.Page.onViewShow !== "function") return false;
        if (Emby.Page.onViewShow === viewShowHook) return true;
        var original = Emby.Page.onViewShow;
        viewShowHook = function () {
            var result = original.apply(this, arguments);
            queueRouteRefresh(false);
            return result;
        };
        viewShowHook.hssmOriginal = original;
        Emby.Page.onViewShow = viewShowHook;
        return true;
    }

    function bindHomeTabs() {
        var slider = document.querySelector("#indexPage .emby-tabs-slider, .emby-tabs-slider");
        var tabs = slider ? slider.closest("[is=\"emby-tabs\"]") : document.querySelector(".headerTabs[is=\"emby-tabs\"]");
        if (!tabs || tabs === homeTabsListener) return;
        if (homeTabsListener) homeTabsListener.removeEventListener("tabchange", handleHomeTabChange);
        homeTabsListener = tabs;
        homeTabsListener.addEventListener("tabchange", handleHomeTabChange);
    }

    function handleHomeTabChange() {
        window.setTimeout(function () {
            lastFeatureScope = null;
            lastFeatureRoute = "";
            queueRouteRefresh(false);
        }, 0);
    }

    function currentFeatureScope() {
        var home = activeHomeContainer();
        if (home) return home;
        var custom = activeCustomPagePanel();
        if (custom) return custom;
        var myList = activeMyListContainer();
        if (myList) return myListPageMarker() || myList;
        var favorites = activeFavoritesPanel();
        if (favorites) return favorites;
        var page = activePage();
        return page ? page.querySelector(".pageTabContent.is-active") || page : null;
    }

    function routeRefresh(force) {
        installViewShowHook();
        bindHomeTabs();
        var featureScope = currentFeatureScope();
        var featureRoute = String(window.location.hash || "#/home");
        if (!force && window.ApiClient && currentUserId() && featureScope && featureScope === lastFeatureScope && featureRoute === lastFeatureRoute) {
            var immediateSettings = settingsCache || cacheRead("client-settings", 24 * 60 * 60 * 1000);
            if (immediateSettings) {
                ensureOwnedPages(immediateSettings);
                var immediateHome = activeHomeContainer();
                if (immediateHome) {
                    var immediatePreferences = latestNativePreferences || cacheRead("native-home-preferences", 24 * 60 * 60 * 1000) || {};
                    applyHybridOrder(immediateHome, immediateSettings, immediatePreferences);
                    applyRouteFeatures(immediateSettings, immediateHome.closest(".libraryPage, .page") || immediateHome, true, immediatePreferences);
                    sendMediaBarPayload(mediaBarFrameForContainer(immediateHome));
                } else {
                    applyRouteFeatures(immediateSettings, featureScope, false, {});
                }
            }
            return;
        }
        lastFeatureScope = featureScope;
        lastFeatureRoute = featureRoute;
        window.clearTimeout(homeRetryTimer);
        homeRetryTimer = null;
        var generation = ++routeGeneration;
        disconnectViewObserver();
        if (!window.ApiClient || !currentUserId()) {
            if (!isDashboardScreen() && !isPlaybackScreen() && clientReadyAttempts < 100) {
                window.clearTimeout(clientReadyTimer);
                clientReadyAttempts += 1;
                clientReadyTimer = window.setTimeout(function () { routeRefresh(false); }, 100);
            }
            applyLogo(isPlaybackScreen() ? {} : (settingsCache || cacheRead('client-settings', 24 * 60 * 60 * 1000) || {}));
            return;
        }
        clientReadyAttempts = 0;
        window.clearTimeout(clientReadyTimer);
        clientReadyTimer = null;
        if (isDashboardScreen() || isPlaybackScreen()) {
            applyLogo(isPlaybackScreen() ? {} : (settingsCache || cacheRead('client-settings', 24 * 60 * 60 * 1000) || {}));
            return;
        }
        liveUserViews(false);
        getClientSettings(!!force).then(function (settings) {
            if (generation !== routeGeneration || isDashboardScreen() || isPlaybackScreen()) return;
            applyLogo(settings);
            ensureOwnedPages(settings);
            if (normalizeInitialHomeSelection()) return;
            bindHomeTabs();
            var attempts = 0;
            function enterView() {
                if (generation !== routeGeneration || isDashboardScreen() || isPlaybackScreen()) return;
                var customPage = activeCustomPagePanel();
                if (customPage) {
                    renderActiveManagedPage(settings);
                    return;
                }
                var myListContainer = activeMyListContainer();
                if (myListContainer) {
                    applyRouteFeatures(settings, myListPageMarker(), false, {});
                    renderActiveManagedPage(settings);
                    return;
                }
                var favorites = activeFavoritesPanel();
                if (favorites) {
                    applyRouteFeatures(settings, favorites, false, {});
                    renderActiveManagedPage(settings);
                    return;
                }
                var homeContainer = activeHomeContainer();
                if (homeContainer && !homeContainer.querySelector(":scope > .section0")) {
                    if (attempts++ < 100) homeRetryTimer = window.setTimeout(enterView, 100);
                    return;
                }
                if (homeContainer) {
                    var cachedPreferences = cacheRead('native-home-preferences', 24 * 60 * 60 * 1000) || {};
                    var sections = sectionsForPage(settings, 'home');
                    bindHomeSettingsChange(homeContainer);
                    if (homeContainerNeedsMount(homeContainer, sections, settings)) renderHomeRows(settings, cachedPreferences, ++runtimeGeneration, homeContainer);
                    else {
                        applyHybridOrder(homeContainer, settings, cachedPreferences);
                        applyRouteFeatures(settings, homeContainer.closest('.libraryPage, .page') || homeContainer, true, cachedPreferences);
                    }
                    if (!primeCachedMediaBar()) renderMediaBar(settings, cachedPreferences, homeContainer, sections);
                    renderExplicitMediaBars(settings, homeContainer, sections, cachedPreferences);
                    nativePreferences().then(function (preferences) {
                        if (generation !== routeGeneration || homeContainer !== activeHomeContainer()) return;
                        preferences = preferences || cachedPreferences;
                        latestNativePreferences = preferences;
                        applyHybridOrder(homeContainer, settings, preferences);
                        applyRemoveButtons(settings, homeContainer.closest('.libraryPage, .page') || homeContainer, preferences);
                        renderMediaBar(settings, preferences, homeContainer, sections);
                        renderExplicitMediaBars(settings, homeContainer, sections, preferences);
                    });
                    return;
                }
                if (isHomeRoute() && attempts++ < 100) {
                    homeRetryTimer = window.setTimeout(enterView, 100);
                    return;
                }
                var scope = activePage();
                if (!scope && attempts++ < 100) {
                    homeRetryTimer = window.setTimeout(enterView, 100);
                    return;
                }
                if (scope) applyRouteFeatures(settings, scope, false, {});
            }
            enterView();
        }).catch(function (error) {
            if (generation === routeGeneration) console.warn('[Home Screen Manager] Could not initialize the active Jellyfin view.', error);
        });
    }

    function queueRouteRefresh(force) {
        window.clearTimeout(routeEventTimer);
        routeEventTimer = window.setTimeout(function () { routeRefresh(!!force); }, force ? 0 : 60);
    }

    window.addEventListener('hashchange', function () { queueRouteRefresh(false); });
    document.addEventListener('viewshow', function () { queueRouteRefresh(false); }, true);
    document.addEventListener('visibilitychange', function () { syncOwnedMediaBarVisibility(); });
    window.addEventListener('home-screen-manager-refresh', function () { routeRefresh(true); });
    window.addEventListener('home-screen-manager-settings-changed', function () {
        settingsCache = null;
        settingsCacheAt = 0;
        cacheRemove('client-settings');
        cacheRemove('media-bar');
        clearSectionCaches();
        if (!isDashboardScreen() && !isPlaybackScreen()) routeRefresh(true);
    });
    window.addEventListener('scroll', tryInfiniteScroll, { passive: true });
    window.HomeScreenManagerClient = {
        version: CLIENT_VERSION,
        refresh: function () { routeRefresh(true); },
        invalidate: function () {
            settingsCache = null;
            settingsCacheAt = 0;
            cacheRemove('client-settings');
            cacheRemove('media-bar');
            clearSectionCaches();
        },
        status: function () {
            return {
                containerFound: !!activeHomeContainer(),
                renderedSectionCount: renderedSectionCount,
                lastError: lastError
            };
        }
    };
    routeRefresh(false);
}());
