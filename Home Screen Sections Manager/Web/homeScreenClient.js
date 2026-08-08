(function () {
    'use strict';

    if (window.HomeScreenManagerClient) {
        window.HomeScreenManagerClient.refresh();
        return;
    }

    var renderTimer = null;
    var homeRetryTimer = null;
    var homeRetryCount = 0;
    var rendering = false;
    var rerenderRequested = false;
    var lastContainer = null;
    var lastSignature = '';
    var lastError = '';
    var renderedSectionCount = 0;
    var defaultSections = ['smalllibrarytiles', 'resume', 'resumeaudio', 'resumebook', 'livetv', 'nextup', 'latestmedia'];
    var settingsCache = null;
    var settingsCacheAt = 0;
    var enhancementTimer = null;
    var mediaBarTimer = null;
    var mediaBarIndex = 0;
    var mediaBarSourceKey = '';
    var mediaBarPayload = null;
    var mediaBarMessageBound = false;
    var autoRefreshTimer = null;
    var detailWorkKey = '';
    var collectionsWorkKey = '';
    var breadcrumbsWorkKey = '';
    var infiniteLoading = false;
    var infiniteLibraryKey = '';
    var myListRenderKey = '';
    var searchTimer = null;
    var searchMode = 'core';
    var originalHeaderHomeHtml = null;

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

    function activeHomeContainer() {
        var visibleHome = document.querySelector('.libraryPage:not(.hide) .homeSectionsContainer:not(.hssm-my-list-container)');
        if (visibleHome) return visibleHome;
        var candidates = document.querySelectorAll('.homeSectionsContainer:not(.hssm-my-list-container)');
        for (var index = 0; index < candidates.length; index++) {
            var container = candidates[index];
            var page = container.closest('.libraryPage, .page');
            if (!page || !page.classList.contains('hide')) return container;
        }
        return null;
    }

    function getJson(path, parameters) {
        return ApiClient.getJSON(ApiClient.getUrl(path, parameters));
    }

    function queryItems(parameters) {
        var userId = currentUserId();
        if (!userId) return Promise.resolve([]);
        var options = Object.assign({
            Fields: 'PrimaryImageAspectRatio,DateCreated,PremiereDate,ProductionYear,CommunityRating,SortName,Tags,Overview,RunTimeTicks,ChildCount,RecursiveItemCount,ParentId,SeriesId,UserData',
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
        return Promise.all(chunks.map(function (chunk) {
            return queryItems({ Ids: chunk.join(',') });
        })).then(function (groups) {
            var byId = {};
            groups.forEach(function (items) {
                items.forEach(function (item) { byId[String(prop(item, 'Id', 'id', ''))] = item; });
            });
            return usable.map(function (id) { return byId[id]; }).filter(Boolean);
        });
    }

    function queryParent(parentId, startIndex, accumulated) {
        var start = startIndex || 0;
        var all = accumulated || [];
        return queryItems({ ParentId: parentId, Recursive: true, StartIndex: start, Limit: 200 }).then(function (items) {
            all.push.apply(all, items);
            return items.length === 200 ? queryParent(parentId, start + items.length, all) : all;
        });
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
            SourceLibraryId: pieces.shift() || '',
            MetadataType: pieces.shift() || '',
            MetadataValue: pieces.join('|'),
            AdditionalLibraryIds: [],
            CollectionTitle: sectionName || '',
            Overview: '',
            ExistingCollectionAction: '',
            ArtPreference: 'JellyfinDefault'
        };
    }

    function liveTagItems(section) {
        var type = String(prop(section, 'Type', 'type', ''));
        var sources = prop(section, 'SourceIds', 'sourceIds', []).map(function (value) { return tagSource(value, prop(section, 'Name', 'name', '')); });
        if (!sources.length) return Promise.resolve([]);
        var request = type === 'individual-tag-content'
            ? postJson('CollectionManager/individual-collection-drafts/preview', sources[0])
            : postJson('CollectionManager/tag-collection-drafts/preview', {
                SelectedTags: sources,
                AdditionalLibraryIds: [],
                RequireAllTags: type === 'muilti-match-tag-collection-content',
                CollectionTitle: prop(section, 'Name', 'name', ''),
                Overview: '',
                ExistingCollectionAction: '',
                ArtPreference: 'JellyfinDefault'
            });
        return request.then(function (preview) {
            return queryIds(prop(preview, 'Items', 'items', []).map(function (item) { return String(prop(item, 'Id', 'id', '')); }));
        });
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

    function sectionDraftItems(section, draft) {
        var sourceType = String(prop(draft, 'SourceType', 'sourceType', ''));
        var sourceId = String(prop(draft, 'SourceId', 'sourceId', ''));
        if (!sourceId) return Promise.resolve([]);
        if (sourceType === 'collection') return queryParent(sourceId);
        if (sourceType === 'tag') {
            return postJson('CollectionManager/individual-collection-drafts/preview', tagSource(sourceId, prop(section, 'Name', 'name', ''))).then(function (preview) {
                return queryIds(prop(preview, 'Items', 'items', []).map(function (item) { return String(prop(item, 'Id', 'id', '')); }));
            });
        }
        return Promise.resolve([]);
    }

    function sectionItems(section, autoRefresh) {
        var type = String(prop(section, 'Type', 'type', ''));

        var sources = prop(section, 'SourceIds', 'sourceIds', []).map(String);
        var itemIds = prop(section, 'ItemIds', 'itemIds', []).map(String);
        if (type === 'rotating-sections' || type === 'seasonal-sections') {
            var activeDraft = activeSectionDraft(section);
            if (!activeDraft) return Promise.resolve([]);
            return sectionDraftItems(section, activeDraft).catch(function () { return queryIds(itemIds); });
        }
        if (type === 'individual-tag-content' || type === 'multiple-tag-content' || type === 'muilti-match-tag-collection-content') {
            return autoRefresh ? liveTagItems(section).catch(function () { return queryIds(itemIds); }) : queryIds(itemIds);
        }
        if (type === 'manual-content') {
            return queryIds(itemIds);
        }
        if (type === 'multiple-collections-in-a-row' || type === 'libraries-in-a-row') {
            return queryIds(sources);
        }
        return Promise.all(sources.map(function (id) { return queryParent(id); })).then(function (groups) {
            var live = uniqueItems([].concat.apply([], groups));
            return live.length ? live : queryIds(itemIds);
        });
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
        if (order === 'rating-descending') return sorted.sort(function (left, right) { return taggedRating(right) - taggedRating(left); });
        return sorted.sort(function (left, right) { return String(prop(left, 'SortName', 'sortName', prop(left, 'Name', 'name', ''))).localeCompare(String(prop(right, 'SortName', 'sortName', prop(right, 'Name', 'name', '')))); });
    }

    function normalizedArtType(section) {
        var type = String(prop(section, 'ArtType', 'artType', 'automatic')).toLowerCase();
        var names = {
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

    function card(item, section) {
        var id = String(prop(item, 'Id', 'id', ''));
        var name = String(prop(item, 'Name', 'name', ''));
        var year = prop(item, 'ProductionYear', 'productionYear', '');
        var serverId = typeof ApiClient.serverId === 'function' ? ApiClient.serverId() : '';
        var href = '#/details?id=' + encodeURIComponent(id) + (serverId ? '&serverId=' + encodeURIComponent(serverId) : '');
        var shape = cardShape(section);
        var imageUrl = cardImage(item, section);
        var showText = prop(section, 'ShowText', 'showText', true) !== false;
        var imageStyle = imageUrl ? ' style="background-image:url(&quot;' + escapeHtml(imageUrl) + '&quot;)"' : '';
        var footer = showText
            ? '<div class="cardText cardTextCentered cardText-first"><bdi><a is="emby-linkbutton" href="' + escapeHtml(href) + '" class="itemAction textActionButton">' + escapeHtml(name) + '</a></bdi></div>' + (year ? '<div class="cardText cardTextCentered cardText-secondary"><bdi>' + escapeHtml(year) + '</bdi></div>' : '')
            : '';
        return '<div class="card ' + shape.card + ' card-hoverable card-withuserdata hssm-client-card" data-id="' + escapeHtml(id) + '">' +
            '<div class="cardBox' + (showText ? ' cardBox-bottompadded' : '') + '"><div class="cardScalable"><div class="cardPadder ' + shape.padder + '"></div>' +
            '<a is="emby-linkbutton" href="' + escapeHtml(href) + '" class="cardImageContainer coveredImage cardContent itemAction" aria-label="' + escapeHtml(name) + '"' + imageStyle + '></a>' +
            '</div>' + footer + '</div></div>';
    }

    function sectionNode(section, items) {
        var node = document.createElement('div');
        var id = String(prop(section, 'Id', 'id', ''));
        var name = String(prop(section, 'Name', 'name', ''));
        var artSize = String(prop(section, 'ArtSize', 'artSize', 'medium'));
        var artShape = cardShape(section).name;
        var artType = String(prop(section, 'ArtType', 'artType', 'automatic'));
        node.className = 'verticalSection hssm-client-section hssm-size-' + artSize + ' hssm-shape-' + artShape + ' hssm-art-' + artType;
        node.dataset.hssmSectionId = id;
        if (!items.length) {
            node.hidden = true;
            return node;
        }
        node.innerHTML = '<h2 class="sectionTitle sectionTitle-cards padded-left">' + escapeHtml(name) + '</h2>' +
            '<div is="emby-scroller" class="hssm-client-scroller padded-top-focusscale padded-bottom-focusscale" data-centerfocus="true"><div is="emby-itemscontainer" class="itemsContainer scrollSlider focuscontainer-x hssm-client-items">' +
            items.map(function (item) { return card(item, section); }).join('') + '</div></div>';
        return node;
    }

    function nativePreferences() {
        var userId = currentUserId();
        if (!userId || typeof ApiClient.getDisplayPreferences !== 'function') return Promise.resolve({});
        return ApiClient.getDisplayPreferences('usersettings', userId, 'emby').then(function (result) {
            return prop(result, 'CustomPrefs', 'customPrefs', {});
        }, function () { return {}; });
    }

    function nativeTypes(preferences) {
        var values = [];
        for (var index = 0; index < 10; index++) values.push(preferences['homesection' + index] || defaultSections[index] || 'none');
        return values;
    }

    function mediaBarTokenEligible(token) {
        return ['smalllibrarytiles', 'librarybuttons', 'latestmedia'].indexOf(String(token || '')) < 0;
    }

    function mediaBarNodeEligible(node, preferences) {
        if (!node) return false;
        if (node.dataset.hssmSectionId) return true;
        return mediaBarTokenEligible(nativeTokenForNode(node, preferences));
    }

    function normalizeMediaBarNodes(nodes, preferences) {
        var eligibleIndex = nodes.findIndex(function (node) { return mediaBarNodeEligible(node, preferences); });
        if (eligibleIndex > 0) nodes.unshift(nodes.splice(eligibleIndex, 1)[0]);
        return nodes;
    }

    function nodesInOrder(container, settings, preferences) {
        var sectionOrder = prop(settings, 'SectionOrder', 'sectionOrder', []).map(String);
        var native = nativeTypes(preferences);
        var desired = [];
        var used = new Set();
        function add(node) {
            if (node && !used.has(node)) {
                used.add(node);
                desired.push(node);
            }
        }
        sectionOrder.forEach(function (id) {
            var manager = container.querySelector('[data-hssm-section-id="' + CSS.escape(id) + '"]');
            if (manager) {
                add(manager);
                return;
            }
            var match = id.match(/^jellyfin-(\d+)-/);
            if (match) add(container.querySelector('.section' + Number(match[1])));
        });
        Array.from(container.children).forEach(add);
        return normalizeMediaBarNodes(desired, preferences);
    }

    function applyHybridOrder(container, settings, preferences) {
        var desired = nodesInOrder(container, settings, preferences);
        var current = Array.from(container.children);
        var unchanged = current.length === desired.length && current.every(function (node, index) { return node === desired[index]; });
        if (!unchanged) desired.forEach(function (node) { container.appendChild(node); });
    }

    function setting(settings, name, fallback) {
        return prop(settings, name, name.charAt(0).toLowerCase() + name.slice(1), fallback);
    }

    function getClientSettings(force) {
        if (!force && settingsCache && Date.now() - settingsCacheAt < 5000) return Promise.resolve(settingsCache);
        return getJson('HomeScreenSectionsManager/client-settings').then(function (settings) {
            settingsCache = settings || {};
            settingsCacheAt = Date.now();
            return settingsCache;
        });
    }

    function currentItemId() {
        var match = window.location.hash.match(/[?&]id=([^&]+)/i);
        return match ? decodeURIComponent(match[1]) : '';
    }

    function currentTopParentId() {
        var match = window.location.hash.match(/[?&]topParentId=([^&]+)/i);
        return match ? decodeURIComponent(match[1]) : '';
    }

    function activePage() {
        return document.querySelector('.libraryPage:not(.hide), .page:not(.hide)');
    }

    function isPlaybackScreen() {
        var hash = String(window.location.hash || '').toLowerCase();
        if (/^#\/(?:video|audio|nowplaying|livetvplayer)(?:[/?]|$)/.test(hash)) return true;
        return !!document.querySelector('#videoOsdPage:not(.hide), .videoOsdPage:not(.hide), #nowPlayingPage:not(.hide), .nowPlayingPage:not(.hide)');
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
            logoLink.href = '#/home.html';
            logoLink.setAttribute('aria-label', 'Home');
            logoLink.innerHTML = '<img class="hssm-header-logo" alt="Home" />';
            logoLink.addEventListener('click', function (event) {
                var nativeHome = document.querySelector('.skinHeader .headerHomeButton, .headerHomeButton');
                if (nativeHome) {
                    event.preventDefault();
                    nativeHome.click();
                }
            });
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

    function nativeSectionItems(token, preferences, container) {
        var native = nativeTypes(preferences);
        var index = native.indexOf(token);
        var row = index >= 0 ? container.querySelector('.section' + index) : null;
        var ids = row ? Array.from(row.querySelectorAll('.card[data-id], [data-id].card')).map(function (node) { return node.getAttribute('data-id'); }).filter(Boolean) : [];
        if (ids.length) return queryIds(ids).then(function (items) {
            return items.map(function (item) { return Object.assign({}, item, { _source: token === 'resume' ? 'resume' : token }); });
        });
        var userId = currentUserId();
        if (token === 'resume' || token === 'resumeaudio' || token === 'resumebook') {
            var resumeOptions = { Limit: 30, Recursive: true, Fields: 'Overview,PrimaryImageAspectRatio,DateCreated,PremiereDate,ProductionYear,OfficialRating,CommunityRating,SortName,Tags,RunTimeTicks,UserData,SeriesName,SeriesId,ParentIndexNumber,IndexNumber,PlaybackPositionTicks' };
            if (token === 'resumeaudio') resumeOptions.MediaTypes = 'Audio';
            if (token === 'resumebook') resumeOptions.IncludeItemTypes = 'Book,AudioBook';
            return getJson('Users/' + encodeURIComponent(userId) + '/Items/Resume', resumeOptions).then(responseItems).then(function (items) {
                return items.map(function (item) { return Object.assign({}, item, { _source: 'resume' }); });
            });
        }
        if (token === 'nextup') return getJson('Shows/NextUp', { UserId: userId, Limit: 30, Fields: 'Overview,PrimaryImageAspectRatio,PremiereDate,ProductionYear,OfficialRating,CommunityRating,RunTimeTicks,UserData,SeriesName,SeriesId,ParentIndexNumber,IndexNumber,PlaybackPositionTicks' }).then(responseItems).then(function (items) {
            return items.map(function (item) { return Object.assign({}, item, { _source: 'nextup' }); });
        });
        if (token === 'latestmedia') return queryItems({ Recursive: true, SortBy: 'DateCreated', SortOrder: 'Descending', Limit: 30 });
        if (token === 'livetv') return getJson('LiveTv/Channels', { UserId: userId, Limit: 30, Fields: 'Overview,PrimaryImageAspectRatio,OfficialRating,CommunityRating' }).then(responseItems);
        if (token === 'smalllibrarytiles' || token === 'librarybuttons') {
            var request = typeof ApiClient.getUserViews === 'function' ? ApiClient.getUserViews({}, userId) : getJson('Users/' + encodeURIComponent(userId) + '/Views');
            return request.then(responseItems);
        }
        return Promise.resolve([]);
    }

    function nativeTokenForNode(node, preferences) {
        if (!node) return '';
        var types = nativeTypes(preferences);
        for (var index = 0; index < types.length; index++) {
            if (node.classList.contains('section' + index)) return types[index];
        }
        return '';
    }

    function mediaBarSource(settings, preferences, container, sections) {
        var topNode = nodesInOrder(container, settings, preferences).find(function (node) { return mediaBarNodeEligible(node, preferences); }) || null;
        if (!topNode) return { key: 'none', items: Promise.resolve([]) };
        var managerId = topNode.dataset.hssmSectionId || '';
        if (managerId) {
            var definition = (sections || []).find(function (section) { return String(prop(section, 'Id', 'id', '')) === managerId; });
            if (!definition) return { key: managerId, items: Promise.resolve([]) };
            return {
                key: managerId,
                items: sectionItems(definition, setting(settings, 'AutoRefreshSections', true)).then(function (items) {
                    return orderItems(uniqueItems(items), definition);
                })
            };
        }
        var token = nativeTokenForNode(topNode, preferences);
        return { key: 'jellyfin-' + token, items: nativeSectionItems(token, preferences, container) };
    }

    function mediaBarUrls(frame) {
        var original = frame.dataset.hssmAbyssSpotlightUrl || '';
        if (!original || original.indexOf('/HomeScreenSectionsManager/media-bar.html') >= 0) {
            original = new URL('ui/spotlight.html', document.baseURI).href;
        }
        frame.dataset.hssmAbyssSpotlightUrl = original;
        var cssUrl = new URL('spotlight.css', original).href;
        var pluginUrl = ApiClient.getUrl('HomeScreenSectionsManager/media-bar.html') + '?abyssCss=' + encodeURIComponent(cssUrl);
        return { plugin: pluginUrl, css: cssUrl };
    }

    function mediaBarFrameForContainer(container) {
        var homeTab = container && container.closest('#homeTab, .tabContent');
        if (homeTab) {
            var scoped = homeTab.querySelector('.featurediframe');
            if (scoped) return scoped;
        }
        return Array.from(document.querySelectorAll('.featurediframe')).find(function (frame) {
            var page = frame.closest('.libraryPage, .page');
            return !page || (!page.classList.contains('hide') && !page.hidden);
        }) || null;
    }

    function sendMediaBarPayload(frame) {
        if (!frame || !frame.contentWindow || !mediaBarPayload) return;
        frame.contentWindow.postMessage(mediaBarPayload, window.location.origin);
    }

    function bindMediaBarMessages() {
        if (mediaBarMessageBound) return;
        mediaBarMessageBound = true;
        window.addEventListener('message', function (event) {
            if (event.origin !== window.location.origin || !event.data || event.data.type !== 'home-screen-manager-media-bar') return;
            var frame = Array.from(document.querySelectorAll('.featurediframe[data-hssm-media-bar="true"]')).find(function (candidate) {
                return event.source === candidate.contentWindow;
            });
            if (!frame || event.source !== frame.contentWindow) return;
            if (event.data.action === 'ready') sendMediaBarPayload(frame);
            if (event.data.action === 'rendered') {
                frame.dataset.hssmMediaBarReady = 'true';
                delete frame.dataset.hssmMediaBarPending;
                frame.style.removeProperty('visibility');
            }
        });
    }

    function suppressPendingMediaBar() {
        Array.from(document.querySelectorAll('.featurediframe')).forEach(function (frame) {
            if (frame.dataset.hssmMediaBarReady !== 'true') {
                frame.dataset.hssmMediaBarPending = 'true';
                frame.style.setProperty('visibility', 'hidden', 'important');
            }
        });
    }

    function ensureMediaBarFrame(container) {
        var frame = mediaBarFrameForContainer(container);
        if (!frame) {
            frame = document.createElement('iframe');
            frame.className = 'featurediframe';
            frame.title = 'Home Screen Manager media bar using Abyss';
            container.parentNode.insertBefore(frame, container);
        }
        if (!frame.dataset.hssmAbyssSpotlightUrl && frame.src) frame.dataset.hssmAbyssSpotlightUrl = frame.src;
        frame.dataset.hssmMediaBar = 'true';
        if (frame.dataset.hssmMediaBarReady !== 'true') {
            frame.dataset.hssmMediaBarPending = 'true';
            frame.style.setProperty('visibility', 'hidden', 'important');
        }
        bindMediaBarMessages();
        var urls = mediaBarUrls(frame);
        if (frame.src !== urls.plugin) {
            frame.addEventListener('load', function handleLoad() {
                frame.removeEventListener('load', handleLoad);
                sendMediaBarPayload(frame);
            });
            frame.src = urls.plugin;
        }
        return frame;
    }

    function clearMediaBar(container) {
        window.clearInterval(mediaBarTimer);
        mediaBarTimer = null;
        mediaBarSourceKey = '';
        mediaBarPayload = null;
        Array.from(document.querySelectorAll('.hssm-media-bar')).forEach(function (node) { node.remove(); });
        if (container) Array.from(container.children).forEach(function (node) { node.classList.remove('hssm-media-source-section'); });
    }

    function renderMediaBar(settings, preferences, container, sections) {
        var source = mediaBarSource(settings, preferences, container, sections);
        return source.items.then(function (items) {
            var interval = Math.max(1, Math.min(300, Number(setting(settings, 'MediaBarIntervalSeconds', 5)) || 5));
            var requestedImage = String(setting(settings, 'MediaBarImageType', 'backdrop'));
            var key = JSON.stringify([source.key, interval, requestedImage, items]);
            mediaBarPayload = {
                type: 'home-screen-manager-media-bar',
                action: 'configure',
                items: items,
                intervalSeconds: interval,
                imageType: requestedImage
            };
            var frame = ensureMediaBarFrame(container);
            if (key !== mediaBarSourceKey) {
                delete frame.dataset.hssmMediaBarReady;
                frame.dataset.hssmMediaBarPending = 'true';
                frame.style.setProperty('visibility', 'hidden', 'important');
                mediaBarSourceKey = key;
                sendMediaBarPayload(frame);
            }
        }).catch(function (error) {
            console.warn('[Home Screen Manager] Could not load the selected media-bar source.', error);
            mediaBarPayload = { type: 'home-screen-manager-media-bar', action: 'configure', items: [], intervalSeconds: 5, imageType: 'backdrop' };
            sendMediaBarPayload(ensureMediaBarFrame(container));
        });
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

    function applyRemoveButtons(settings) {
        Array.from(document.querySelectorAll('.hssm-remove-row-button')).forEach(function (button) { if (!setting(settings, 'EnableRemoveContinueNextUp', false)) button.remove(); });
        if (!setting(settings, 'EnableRemoveContinueNextUp', false)) return;
        var dismissed = dismissedNextUp();
        Array.from(document.querySelectorAll('.verticalSection, .section')).forEach(function (row) {
            var heading = row.querySelector('.sectionTitle, h2');
            var title = heading ? heading.textContent.trim().toLowerCase() : '';
            var isContinue = title.indexOf('continue watching') >= 0;
            var isNext = title.indexOf('next up') >= 0;
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
                    event.preventDefault(); event.stopPropagation(); button.disabled = true;
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
        icon.classList.remove('favorite', 'favorite_border');
        icon.classList.add(liked ? 'favorite' : 'favorite_border');
        icon.textContent = '';
    }

    function addMyListButton(cardNode) {
        if (cardNode.querySelector('.hssm-my-list-button')) return;
        var id = cardNode.getAttribute('data-id');
        if (!id) return;
        var holder = cardNode.querySelector('.cardScalable, .cardOverlayContainer') || cardNode;
        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'hssm-my-list-button emby-button';
        button.title = 'Add to My List';
        button.innerHTML = '<span class="material-icons favorite_border" aria-hidden="true"></span>';
        ApiClient.getItem(currentUserId(), id).then(function (item) {
            var liked = !!prop(prop(item, 'UserData', 'userData', {}), 'Likes', 'likes', false);
            button.dataset.liked = liked ? 'true' : 'false';
            button.title = liked ? 'Remove from My List' : 'Add to My List';
            setMyListIcon(button, liked);
        }).catch(function () {});
        button.addEventListener('click', function (event) {
            event.preventDefault(); event.stopPropagation();
            var next = button.dataset.liked !== 'true'; button.disabled = true;
            ApiClient.updateUserItemRating(currentUserId(), id, next).then(function () {
                button.dataset.liked = next ? 'true' : 'false'; button.title = next ? 'Remove from My List' : 'Add to My List';
                setMyListIcon(button, next);
                myListRenderKey = '';
                if (!next && cardNode.closest('.hssm-my-list-container')) cardNode.remove();
            }).finally(function () { button.disabled = false; });
        });
        holder.appendChild(button);
    }

    function renderMyList(container) {
        var key = currentUserId() + ':' + Date.now();
        myListRenderKey = key;
        container.innerHTML = '<p class="hssm-loading">Loading My List…</p>';
        return queryItems({ Filters: 'Likes', Recursive: true, Limit: 500, IncludeItemTypes: 'Movie,Series,Season,Episode,Video,BoxSet,Playlist,Audio,MusicAlbum,Book,AudioBook' }).then(function (items) {
            if (myListRenderKey !== key) return;
            var definition = { Id: 'my-list', Name: 'My List', ArtSize: 'medium', ArtType: 'automatic', ArtShape: 'poster', ShowText: true };
            var section = sectionNode(definition, uniqueItems(items)); section.hidden = false;
            container.innerHTML = ''; container.appendChild(section);
            Array.from(container.querySelectorAll('.card[data-id]')).forEach(addMyListButton);
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

    function applyMyList(settings) {
        var enabled = setting(settings, 'EnableMyList', false);
        Array.from(document.querySelectorAll('.hssm-my-list-button')).forEach(function (node) { if (!enabled) node.remove(); });
        if (!enabled) Array.from(document.querySelectorAll('.hssm-my-list-detail-button')).forEach(function (node) { node.remove(); });
        var indexPage = document.getElementById('indexPage');
        var headerTabs = document.querySelector('.headerTabs.sectionTabs');
        var tabsWidget = headerTabs && headerTabs.querySelector('[is="emby-tabs"], .emby-tabs');
        var tabsSlider = tabsWidget && tabsWidget.querySelector('.emby-tabs-slider');
        if (!enabled) {
            var oldButton = document.querySelector('.hssm-my-list-tab');
            var oldPage = document.querySelector('.hssm-my-list-page');
            if (oldButton) oldButton.remove();
            if (oldPage) oldPage.remove();
            if (tabsWidget && typeof tabsWidget.refresh === 'function') tabsWidget.refresh();
            return;
        }
        Array.from(document.querySelectorAll('.card[data-id]')).forEach(addMyListButton);
        var detail = activePage();
        var detailId = currentItemId();
        if (detail && detailId && !detail.querySelector('.hssm-my-list-detail-button')) {
            var buttons = detail.querySelector('.mainDetailButtons');
            if (buttons) {
                var shell = document.createElement('div');
                shell.className = 'hssm-my-list-detail-button card';
                shell.dataset.id = detailId;
                buttons.appendChild(shell);
                addMyListButton(shell);
            }
        }
        if (!indexPage || !tabsWidget || !tabsSlider) return;
        var button = tabsSlider.querySelector('.hssm-my-list-tab');
        if (!button) {
            button = document.createElement('button');
            button.type = 'button';
            button.setAttribute('is', 'emby-button');
            button.className = 'emby-tab-button hssm-my-list-tab';
            button.innerHTML = '<div class="emby-button-foreground">My List</div>';
            tabsSlider.appendChild(button);
            if (window.CustomElements && typeof window.CustomElements.upgradeSubtree === 'function') window.CustomElements.upgradeSubtree(button);
        }
        var otherIndexes = Array.from(tabsSlider.querySelectorAll('.emby-tab-button:not(.hssm-my-list-tab)')).map(function (entry) { return Number(entry.getAttribute('data-index')); }).filter(Number.isFinite);
        var myIndex = otherIndexes.length ? Math.max.apply(Math, otherIndexes) + 1 : 2;
        button.dataset.index = String(myIndex);
        var page = indexPage.querySelector('.hssm-my-list-page');
        if (!page) {
            page = document.createElement('div');
            page.className = 'tabContent pageTabContent hssm-my-list-page';
            page.innerHTML = '<div class="sections homeSectionsContainer hssm-my-list-container"></div>';
            indexPage.appendChild(page);
        }
        page.dataset.index = String(myIndex);
        page.hidden = false;
        if (tabsWidget.dataset.hssmMyListBound !== 'true') {
            tabsWidget.dataset.hssmMyListBound = 'true';
            tabsWidget.addEventListener('click', function (event) {
                var customButton = event.target.closest('.hssm-my-list-tab');
                if (!customButton || !tabsWidget.contains(customButton)) return;
                event.preventDefault();
                event.stopImmediatePropagation();
                var customPage = indexPage.querySelector('.hssm-my-list-page');
                if (!customPage) return;
                Array.from(tabsWidget.querySelectorAll('.emby-tab-button')).forEach(function (tabButton) {
                    tabButton.classList.toggle('emby-tab-button-active', tabButton === customButton);
                });
                Array.from(indexPage.querySelectorAll(':scope > .tabContent')).forEach(function (tab) {
                    tab.classList.toggle('is-active', tab === customPage);
                });
                tabsWidget.selectedTabIndex = Number(customButton.dataset.index);
                renderMyList(customPage.querySelector('.hssm-my-list-container'));
            }, true);
            tabsWidget.addEventListener('beforetabchange', function (event) {
                var customPage = indexPage.querySelector('.hssm-my-list-page');
                var customButton = tabsWidget.querySelector('.hssm-my-list-tab');
                if (!customPage || !customButton) return;
                var selectedIndex = Number(event.detail && event.detail.selectedTabIndex);
                var customIndex = Number(customButton.dataset.index);
                if (selectedIndex === customIndex) {
                    Array.from(indexPage.querySelectorAll(':scope > .tabContent')).forEach(function (tab) { tab.classList.toggle('is-active', tab === customPage); });
                    renderMyList(customPage.querySelector('.hssm-my-list-container'));
                } else {
                    customPage.classList.remove('is-active');
                }
            });
        }
        if (typeof tabsWidget.refresh === 'function') tabsWidget.refresh();
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
        var ids = setting(settings, 'InfiniteScrollLibraryIds', []).map(String);
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
    function configureAutoRefresh(settings) {
        var enabled = setting(settings, 'AutoRefreshSections', true);
        var dynamic = (prop(settings, 'Sections', 'sections', []) || []).some(function (section) {
            var type = String(prop(section, 'Type', 'type', ''));
            return type === 'rotating-sections' || type === 'seasonal-sections';
        });
        if (!enabled && !dynamic) { window.clearInterval(autoRefreshTimer); autoRefreshTimer = null; return; }
        if (autoRefreshTimer) return;
        autoRefreshTimer = window.setInterval(function () {
            settingsCache = null;
            settingsCacheAt = 0;
            lastSignature = '';
            scheduleRender();
        }, 60000);
    }


    function applyEnhancements(settings) {
        applyLogo(settings);
        applyRemoveButtons(settings);
        applyMyListHeartColor(settings);
        applyMyList(settings);
        applySeriesInfo(settings);
        applyCollections(settings);
        applyBreadcrumbs(settings);
        applyInfiniteScroll(settings);
        configureAutoRefresh(settings);
        applyEnhancedSearch(settings);
    }

    function scheduleEnhancements(force) {
        window.clearTimeout(enhancementTimer);
        enhancementTimer = window.setTimeout(function () {
            if (!window.ApiClient || !currentUserId()) return;
            getClientSettings(force).then(applyEnhancements).catch(function (error) { console.warn('[Home Screen Manager] Could not apply browser enhancements.', error); });
        }, 120);
    }
    function signature(settings) {
        return JSON.stringify({
            sections: prop(settings, 'Sections', 'sections', []),
            order: prop(settings, 'SectionOrder', 'sectionOrder', []),
            autoRefresh: setting(settings, 'AutoRefreshSections', true),
            mediaBarInterval: setting(settings, 'MediaBarIntervalSeconds', 5),
            mediaBarImageType: setting(settings, 'MediaBarImageType', 'backdrop'),
            logo: setting(settings, 'LogoImageDataUrl', ''),
            myList: setting(settings, 'EnableMyList', false),
            myListHeartMode: setting(settings, 'MyListHeartColorMode', 'solid'),
            myListHeartOne: setting(settings, 'MyListHeartColorOne', '#f5f5f7'),
            myListHeartTwo: setting(settings, 'MyListHeartColorTwo', '#f5f5f7')
        });
    }

    function renderHome() {
        if (rendering || !window.ApiClient || !currentUserId()) {
            rerenderRequested = true;
            return;
        }
        var container = activeHomeContainer();
        if (!container) {
            if (homeRetryCount < 100) {
                homeRetryCount += 1;
                window.clearTimeout(homeRetryTimer);
                homeRetryTimer = window.setTimeout(renderHome, 100);
            }
            return;
        }
        homeRetryCount = 0;
        window.clearTimeout(homeRetryTimer);
        rendering = true;
        rerenderRequested = false;
        Promise.all([getClientSettings(false), nativePreferences()]).then(function (values) {
            var settings = values[0] || {};
            var preferences = values[1] || {};
            var sections = prop(settings, 'Sections', 'sections', []);
            var nextSignature = signature(settings);
            var expectedIds = sections.map(function (section) { return String(prop(section, 'Id', 'id', '')); });
            var existing = Array.from(container.querySelectorAll('[data-hssm-section-id]'));
            var complete = container === lastContainer && nextSignature === lastSignature && existing.length === expectedIds.length && expectedIds.every(function (id) {
                return container.querySelector('[data-hssm-section-id="' + CSS.escape(id) + '"]');
            });
            if (complete) {
                applyHybridOrder(container, settings, preferences);
                applyEnhancements(settings);
                return renderMediaBar(settings, preferences, container, sections);
            }
            existing.forEach(function (node) { node.remove(); });
            return Promise.all(sections.map(function (section) {
                return sectionItems(section, setting(settings, 'AutoRefreshSections', true)).then(function (items) {
                    var node = sectionNode(section, orderItems(uniqueItems(items), section));
                    container.appendChild(node);
                }, function (error) {
                    var name = String(prop(section, 'Name', 'name', 'Unnamed section'));
                    console.warn('[Home Screen Manager] Could not load content for section "' + name + '".', error);
                    container.appendChild(sectionNode(section, []));
                });
            })).then(function () {
                lastContainer = container;
                lastSignature = nextSignature;
                lastError = '';
                renderedSectionCount = container.querySelectorAll('[data-hssm-section-id]').length;
                applyHybridOrder(container, settings, preferences);
                applyEnhancements(settings);
                return renderMediaBar(settings, preferences, container, sections);
            });
        }).catch(function (error) {
            lastError = error && (error.message || error.statusText) ? String(error.message || error.statusText) : String(error || 'Unknown rendering error');
            console.warn('[Home Screen Manager] Could not render custom home-screen sections.', error);
        }).finally(function () {
            rendering = false;
            if (rerenderRequested) scheduleRender();
        });
    }

    function scheduleRender() {
        window.clearTimeout(renderTimer);
        renderTimer = window.setTimeout(renderHome, 150);
    }

    function restartHomeSearch() {
        homeRetryCount = 0;
        lastSignature = '';
        settingsCache = null;
        settingsCacheAt = 0;
        scheduleRender();
        scheduleEnhancements(true);
    }


    var observer = new MutationObserver(function () {
        suppressPendingMediaBar();
        scheduleRender();
        scheduleEnhancements(false);
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    window.addEventListener('hashchange', restartHomeSearch);
    window.addEventListener('pageshow', restartHomeSearch);
    document.addEventListener('viewshow', restartHomeSearch);
    window.addEventListener('home-screen-manager-refresh', restartHomeSearch);
    window.addEventListener('scroll', tryInfiniteScroll, { passive: true });
    window.addEventListener('resize', function () { scheduleEnhancements(false); }, { passive: true });
    window.HomeScreenManagerClient = {
        refresh: restartHomeSearch,
        status: function () {
            return {
                containerFound: !!activeHomeContainer(),
                renderedSectionCount: renderedSectionCount,
                lastError: lastError
            };
        }
    };
    suppressPendingMediaBar();
    scheduleRender();
    scheduleEnhancements(true);
}());
