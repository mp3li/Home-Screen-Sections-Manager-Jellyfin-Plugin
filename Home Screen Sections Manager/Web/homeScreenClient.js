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
    var settingsRequest = null;
    var settingsReconcileQueued = false;
    var enhancementTimer = null;
    var mediaBarTimer = null;
    var mediaBarIndex = 0;
    var mediaBarSourceKey = '';
    var mediaBarPayload = null;
    var mediaBarMessageBound = false;
    var mediaBarLoadSequence = 0;
    var renderGeneration = 0;
    var detailWorkKey = '';
    var collectionsWorkKey = '';
    var breadcrumbsWorkKey = '';
    var infiniteLoading = false;
    var infiniteLibraryKey = '';
    var myListRenderKey = '';
    var searchTimer = null;
    var searchMode = 'core';
    var originalHeaderHomeHtml = null;
    var runtimeGeneration = 0;
    var activeViewObserver = null;
    var heartStatusTimer = null;
    var pendingHeartIds = {};
    var sectionRuntime = {};
    var homeRequestLane = createLimiter(2);
    var heartRequestLane = createLimiter(1);
    var likedItemsById = {};
    var likedItemsLoaded = false;
    var likedItemsRequest = null;
    var myListHeaderRetryTimer = null;
    var clientReadyTimer = null;
    var clientReadyAttempts = 0;
    var routeEventTimer = null;
    var myListNavigationBound = false;
    var myListActive = false;
    var latestNativePreferences = {};
    var liveViewsCache = null;
    var liveViewsCacheAt = 0;
    var liveViewsRequest = null;
    var libraryRouteRepairKey = '';
    var pendingLibraryRouteLabel = '';

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

    function activeHomeContainer() {
        if (!isHomeRoute()) return null;
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
            Fields: 'PrimaryImageAspectRatio,DateCreated,PremiereDate,ProductionYear,CommunityRating,SortName,Tags,Overview,RunTimeTicks,ChildCount,RecursiveItemCount,ParentId,SeriesId,SeriesName,UserData',
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
        var isMyList = String(prop(section, 'Id', 'id', '')) === 'my-list';
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
        if (showText && isMyList && type === 'Episode') {
            footer = '<div class="cardText cardTextCentered cardText-first"><bdi><a is="emby-linkbutton" href="' + escapeHtml(seriesHref) + '" class="itemAction textActionButton">' + escapeHtml(seriesName || 'Unknown Series') + '</a></bdi></div><div class="cardText cardTextCentered cardText-secondary"><bdi><a is="emby-linkbutton" href="' + escapeHtml(href) + '" class="itemAction textActionButton">' + escapeHtml(name) + '</a></bdi></div>';
        } else if (showText) {
            footer = '<div class="cardText cardTextCentered cardText-first"><bdi><a is="emby-linkbutton" href="' + escapeHtml(href) + '" class="itemAction textActionButton">' + escapeHtml(name) + '</a></bdi></div>' + (year ? '<div class="cardText cardTextCentered cardText-secondary"><bdi>' + escapeHtml(year) + '</bdi></div>' : '');
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
        node.className = 'verticalSection hssm-client-section hssm-size-' + artSize + ' hssm-shape-' + artShape + ' hssm-art-' + artType + (String(prop(section, 'Type', 'type', '')) === 'top-10-50' ? ' hssm-top-ranked hssm-rank-' + String(prop(section, 'RankNumberColorMode', 'rankNumberColorMode', 'solid')) : '');
        node.style.setProperty('--hssm-rank-one', String(prop(section, 'RankNumberColorOne', 'rankNumberColorOne', '#f5f5f7')));
        node.style.setProperty('--hssm-rank-two', String(prop(section, 'RankNumberColorTwo', 'rankNumberColorTwo', '#f5f5f7')));
        var rankFont = String(prop(section, 'RankNumberFontDataUrl', 'rankNumberFontDataUrl', ''));
        if (rankFont && String(prop(section, 'Type', 'type', '')) === 'top-10-50') { var family = 'hssm-rank-' + id.replace(/[^a-z0-9_-]/gi, ''); var styleId = family + '-font'; var fontStyle = document.getElementById(styleId); if (!fontStyle) { fontStyle = document.createElement('style'); fontStyle.id = styleId; document.head.appendChild(fontStyle); } fontStyle.textContent = '@font-face{font-family:"' + family + '";src:url("' + rankFont.replace(/"/g, '') + '")}'; node.style.setProperty('--hssm-rank-font', '"' + family + '"'); }
        node.dataset.hssmSectionId = id;
        if (!items.length) {
            if (loading) {
                node.innerHTML = '<h2 class="sectionTitle sectionTitle-cards padded-left">' + escapeHtml(name) + '</h2><p class="hssm-section-loading padded-left">Loading section content…</p>';
                node.dataset.hssmLoading = 'true';
            } else {
                node.hidden = true;
            }
            return node;
        }
        node.innerHTML = '<h2 class="sectionTitle sectionTitle-cards padded-left">' + escapeHtml(name) + '</h2>' +
            '<div is="emby-scroller" class="hssm-client-scroller padded-top-focusscale padded-bottom-focusscale" data-centerfocus="true"><div is="emby-itemscontainer" class="itemsContainer scrollSlider focuscontainer-x hssm-client-items">' +
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
        if (!container) return;
        var latestIndex = nativeTypes(preferences).indexOf('latestmedia');
        var wrapper = latestIndex >= 0 ? container.querySelector(':scope > .section' + latestIndex) : null;
        if (wrapper) {
            wrapper.dataset.hssmLatestWrapper = 'true';
            var latestRows = Array.from(wrapper.querySelectorAll(':scope > .verticalSection'));
            latestRows.forEach(function (row) {
                var id = latestLibraryId(row);
                if (!id) return;
                row.dataset.hssmLatestLibraryId = id;
                row.dataset.hssmLatestOrderId = 'jellyfin-latest-' + id;
                container.insertBefore(row, wrapper);
            });
            if (latestRows.length) {
                wrapper.hidden = true;
                wrapper.style.display = 'none';
            }
        }
        var hidden = {};
        prop(settings, 'SectionOrder', 'sectionOrder', []).forEach(function (value) {
            var entry = sectionOrderEntry(value);
            if (entry.hidden) hidden[entry.id] = true;
        });
        Array.from(container.querySelectorAll(':scope > [data-hssm-latest-library-id]')).forEach(function (row) {
            row.hidden = !!hidden[row.dataset.hssmLatestOrderId];
        });
    }

    function mediaBarTokenEligible(token) {
        return ['smalllibrarytiles', 'librarybuttons', 'latestmedia'].indexOf(String(token || '')) < 0;
    }

    function mediaBarNodeEligible(node, preferences) {
        if (!node || node.hidden || node.dataset.hssmLatestLibraryId) return false;
        if (node.dataset.hssmSectionId) return true;
        return mediaBarTokenEligible(nativeTokenForNode(node, preferences));
    }

    function normalizeMediaBarNodes(nodes, preferences) {
        var eligibleIndex = nodes.findIndex(function (node) { return mediaBarNodeEligible(node, preferences); });
        if (eligibleIndex > 0) nodes.unshift(nodes.splice(eligibleIndex, 1)[0]);
        return nodes;
    }

    function nodesInOrder(container, settings, preferences) {
        prepareNativeLatestRows(container, settings, preferences);
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
                var latest = container.querySelector(':scope > [data-hssm-latest-order-id="' + CSS.escape(id) + '"]');
                if (latest) { latest.hidden = entry.hidden; add(latest); }
                return;
            }
            var manager = container.querySelector('[data-hssm-section-id="' + CSS.escape(id) + '"]');
            if (manager) {
                add(manager);
                return;
            }
            var match = id.match(/^jellyfin-(\d+)-(.+)$/);
            if (match) {
                var currentIndex = native.indexOf(match[2]);
                if (currentIndex >= 0) add(container.querySelector('.section' + currentIndex));
            }
        });
        Array.from(container.children).forEach(function (node) {
            if (node.dataset.hssmLatestWrapper === 'true') return;
            add(node);
        });
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

    function requestClientSettings() {
        if (settingsRequest) return settingsRequest;
        settingsRequest = getJson('HomeScreenSectionsManager/client-settings').then(function (settings) {
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
            if (JSON.stringify(live) !== JSON.stringify(cached) && !isDashboardScreen() && !isPlaybackScreen()) routeRefresh(false);
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

    function isDashboardScreen() {
        var hash = String(window.location.hash || '').toLowerCase();
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
        if (activeViewObserver) activeViewObserver.disconnect();
        activeViewObserver = null;
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

    function libraryRouteType(hash) {
        var match = String(hash || '').toLowerCase().match(/^#\/(movies|tv|music|books)(?:\.html)?(?:[?&]|$)/);
        if (!match) return '';
        return { movies:'movies', tv:'tvshows', music:'music', books:'books' }[match[1]] || '';
    }

    function replaceTopParentId(hash, id) {
        var value = String(hash || '');
        return value.replace(/([?&]topParentId=)[^&]*/i, '$1' + encodeURIComponent(id));
    }

    function matchingLiveLibrary(hash, views, linkText) {
        var staleId = (String(hash || '').match(/[?&]topParentId=([^&]+)/i) || [])[1];
        if (!staleId) return null;
        try { staleId = decodeURIComponent(staleId); } catch (_) {}
        if ((views || []).some(function (view) { return String(prop(view, 'Id', 'id', '')) === staleId; })) return null;
        var aliasedId = resolvedLibraryId(staleId);
        var aliased = (views || []).find(function (view) { return String(prop(view, 'Id', 'id', '')) === aliasedId; });
        if (aliased) return aliased;
        var routeType = libraryRouteType(hash);
        if (!routeType) return null;
        var candidates = (views || []).filter(function (view) {
            return String(prop(view, 'CollectionType', 'collectionType', '')).toLowerCase() === routeType;
        });
        if (!candidates.length) return null;
        var normalizedLabel = String(linkText || '').trim().toLowerCase();
        var named = normalizedLabel ? candidates.filter(function (view) {
            return String(prop(view, 'Name', 'name', '')).trim().toLowerCase() === normalizedLabel;
        }) : [];
        return named.length === 1 ? named[0] : candidates.length === 1 ? candidates[0] : null;
    }

    function repairedLibraryHash(hash, views, linkText) {
        var replacement = matchingLiveLibrary(hash, views, linkText);
        if (!replacement) return '';
        var oldId = (String(hash || '').match(/[?&]topParentId=([^&]+)/i) || [])[1] || '';
        try { oldId = decodeURIComponent(oldId); } catch (_) {}
        var newId = String(prop(replacement, 'Id', 'id', ''));
        rememberLibraryAlias(oldId, newId);
        return replaceTopParentId(hash, newId);
    }

    function reconcileCurrentLibraryRoute() {
        var original = String(window.location.hash || '');
        if (!currentTopParentId() || !libraryRouteType(original) || libraryRouteRepairKey === original) return;
        libraryRouteRepairKey = original;
        liveUserViews(true).then(function (views) {
            if (String(window.location.hash || '') !== original) return;
            if (!views.length) {
                libraryRouteRepairKey = '';
                pendingLibraryRouteLabel = '';
                return;
            }
            var repaired = repairedLibraryHash(original, views, pendingLibraryRouteLabel);
            pendingLibraryRouteLabel = '';
            if (repaired && repaired !== original) window.location.hash = repaired.slice(1);
        });
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
            var resumeOptions = { Limit: 30, Recursive: true, Fields: 'Overview,PrimaryImageAspectRatio,DateCreated,PremiereDate,ProductionYear,OfficialRating,CommunityRating,SortName,Tags,RunTimeTicks,UserData,SeriesName,SeriesId,ParentIndexNumber,IndexNumber', ImageTypeLimit:1, EnableImageTypes:'Primary,Backdrop,Thumb' };
            if (token === 'resumeaudio') resumeOptions.MediaTypes = 'Audio';
            if (token === 'resumebook') resumeOptions.IncludeItemTypes = 'Book,AudioBook';
            return getJson('Users/' + encodeURIComponent(userId) + '/Items/Resume', resumeOptions).then(responseItems).then(function (items) {
                return items.map(function (item) { return Object.assign({}, item, { _source: 'resume' }); });
            });
        }
        if (token === 'nextup') return getJson('Shows/NextUp', { UserId: userId, Limit: 30, Fields: 'Overview,PrimaryImageAspectRatio,DateCreated,Path,MediaSourceCount,PremiereDate,ProductionYear,OfficialRating,CommunityRating,RunTimeTicks,UserData,SeriesName,SeriesId,ParentIndexNumber,IndexNumber', ImageTypeLimit:1, EnableImageTypes:'Primary,Backdrop,Banner,Thumb', EnableTotalRecordCount:false, DisableFirstEpisode:false, EnableResumable:false }).then(responseItems).then(function (items) {
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
        var ids = prop(section, 'ItemIds', 'itemIds', []).map(String).slice(0, 30);
        var cached = sectionCache(section);
        if (cached && cached.items.length) {
            var allowed = {}; ids.forEach(function (id) { allowed[id] = true; });
            var cachedItems = cached.items.filter(function (item) { return allowed[String(prop(item, 'Id', 'id', ''))]; });
            if (cachedItems.length) return Promise.resolve(orderItems(uniqueItems(cachedItems), section).slice(0, 30));
        }
        if (!ids.length) return Promise.resolve([]);
        return queryIds(ids).then(function (items) { return orderItems(uniqueItems(items), section).slice(0, 30); });
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
                frame.style.removeProperty('visibility');
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
            var expectedImageType = cachedSettings ? String(setting(cachedSettings, 'MediaBarImageType', 'backdrop')) : '';
            if (!cached || !expectedKey || cached.key !== expectedKey || cached.intervalSeconds !== expectedInterval || cached.imageType !== expectedImageType || !Array.isArray(cached.items) || !cached.items.length) return false;
            mediaBarPayload = {
                type:'home-screen-manager-media-bar',
                action:'configure',
                items:cached.items,
                intervalSeconds:expectedInterval,
                imageType:expectedImageType
            };
            sendMediaBarPayload(ensureMediaBarFrame(container));
            return true;
        } catch (_) {
            return false;
        }
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

    function renderMediaBar(settings, preferences, container, sections, sectionItemPromises) {
        var loadSequence = ++mediaBarLoadSequence;
        var source = mediaBarSource(settings, preferences, container, sections, sectionItemPromises);
        var interval = Math.max(1, Math.min(300, Number(setting(settings, 'MediaBarIntervalSeconds', 5)) || 5));
        var requestedImage = String(setting(settings, 'MediaBarImageType', 'backdrop'));
        var frame = ensureMediaBarFrame(container);
        var matchingCachedPayload = null;
        try {
            var cached = cacheRead('media-bar', 24 * 60 * 60 * 1000);
            if (cached && cached.key === source.key && cached.intervalSeconds === interval && cached.imageType === requestedImage && Array.isArray(cached.items) && cached.items.length) {
                matchingCachedPayload = { type:'home-screen-manager-media-bar', action:'configure', items:cached.items, intervalSeconds:interval, imageType:requestedImage };
                mediaBarPayload = matchingCachedPayload;
                mediaBarSourceKey = JSON.stringify([source.key, interval, requestedImage, cached.items]);
            }
        } catch (_) {}
        if (matchingCachedPayload) sendMediaBarPayload(frame);
        else {
            mediaBarPayload = null;
            mediaBarSourceKey = '';
            frame.dataset.hssmMediaBarPending = 'true';
            frame.style.visibility = 'hidden';
        }
        return source.items.then(function (items) {
            if (loadSequence !== mediaBarLoadSequence || container !== activeHomeContainer()) return;
            var key = JSON.stringify([source.key, interval, requestedImage, items]);
            mediaBarPayload = {
                type: 'home-screen-manager-media-bar',
                action: 'configure',
                items: items,
                intervalSeconds: interval,
                imageType: requestedImage
            };
            cacheWrite('media-bar', { key:source.key, intervalSeconds:interval, imageType:requestedImage, items:items });
            if (key !== mediaBarSourceKey) {
                mediaBarSourceKey = key;
                sendMediaBarPayload(frame);
            }
        }).catch(function (error) {
            if (loadSequence !== mediaBarLoadSequence || container !== activeHomeContainer()) return;
            console.warn('[Home Screen Manager] Could not load the selected media-bar source.', error);
            mediaBarPayload = { type: 'home-screen-manager-media-bar', action: 'configure', items: [], intervalSeconds: 5, imageType: 'backdrop' };
            sendMediaBarPayload(frame);
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
        if (!force && likedItemsRequest) return likedItemsRequest;
        if (!likedItemsLoaded) {
            var cached = cacheRead('my-list', 24 * 60 * 60 * 1000);
            if (Array.isArray(cached)) saveLikedItems(cached);
        }
        likedItemsRequest = queryItems({ Filters: 'Likes', Recursive: true, Limit: 500, IncludeItemTypes: 'Movie,Series,Season,Episode,Video,BoxSet,Playlist,Audio,MusicAlbum,Book,AudioBook' }).then(function (items) {
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
        var definition = { Id: 'my-list', Name: 'My List', ArtSize: 'medium', ArtType: 'automatic', ArtShape: 'poster', ShowText: true };
        var section = sectionNode(definition, uniqueItems(items));
        section.hidden = false;
        container.innerHTML = '';
        if (items.length) {
            container.appendChild(section);
            upgradeSectionControls(section);
        }
        else container.innerHTML = '<p class="hssm-empty-list">My List is empty.</p>';
        Array.from(container.querySelectorAll('.card[data-id]')).forEach(addMyListButton);
    }

    function renderMyList(container) {
        var key = currentUserId() + ':' + Date.now();
        myListRenderKey = key;
        var cached = cacheRead('my-list', 24 * 60 * 60 * 1000);
        if (Array.isArray(cached)) paintMyList(container, cached);
        else container.innerHTML = '<p class="hssm-loading">Loading My List…</p>';
        return loadLikedItems(true).then(function (items) {
            if (myListRenderKey === key && container.isConnected) paintMyList(container, items);
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

    function queueMyListHeaderRetry(settings, generation) {
        if (!isHomeRoute() || !setting(settings, 'EnableMyList', false)) return;
        window.clearTimeout(myListHeaderRetryTimer);
        var attempts = 0;
        function retry() {
            if (generation !== runtimeGeneration || !isHomeRoute() || isDashboardScreen() || isPlaybackScreen()) return;
            var scope = activePage();
            applyMyList(settings, scope, true);
            if (!document.querySelector('.hssm-my-list-tab') && attempts++ < 30) myListHeaderRetryTimer = window.setTimeout(retry, 100);
        }
        myListHeaderRetryTimer = window.setTimeout(retry, 0);
    }

    function setMyListView(active) {
        var indexPage = document.getElementById('indexPage');
        var headerTabs = document.querySelector('.headerTabs.sectionTabs');
        var customButton = headerTabs && headerTabs.querySelector('.hssm-my-list-tab');
        var customPage = indexPage && indexPage.querySelector('.hssm-my-list-page');
        if (!indexPage || !customButton || !customPage) return;
        myListActive = !!active;
        document.body.classList.toggle('hssm-my-list-active', myListActive);
        Array.from(headerTabs.querySelectorAll('.emby-tab-button')).forEach(function (button) {
            var selected = myListActive && button === customButton;
            if (button === customButton || myListActive) button.classList.toggle('emby-tab-button-active', selected);
            button.setAttribute('aria-selected', String(selected));
        });
        Array.from(indexPage.querySelectorAll(':scope > .pageTabContent')).forEach(function (panel) {
            panel.classList.toggle('is-active', myListActive && panel === customPage);
        });
        if (myListActive) renderMyList(customPage.querySelector('.hssm-my-list-container'));
    }

    function bindMyListNavigation() {
        if (myListNavigationBound) return;
        myListNavigationBound = true;
        document.addEventListener('click', function (event) {
            var button = event.target && event.target.closest ? event.target.closest('.headerTabs.sectionTabs .emby-tab-button') : null;
            if (!button) return;
            if (button.classList.contains('hssm-my-list-tab')) {
                event.preventDefault();
                event.stopImmediatePropagation();
                setMyListView(true);
                return;
            }
            if (myListActive) setMyListView(false);
        }, true);
    }

    function applyMyList(settings, scope, skipRetry) {
        var enabled = setting(settings, 'EnableMyList', false);
        scope = scope || activePage();
        Array.from(document.querySelectorAll('.hssm-my-list-button')).forEach(function (node) { if (!enabled || !scope || !scope.contains(node)) node.remove(); });
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
            myListActive = false;
            document.body.classList.remove('hssm-my-list-active');
            return;
        }
        if (scope) Array.from(scope.querySelectorAll('.card[data-id]')).forEach(addMyListButton);
        queueVisibleHeartStatus(scope);
        var detail = scope;
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
        if (!isHomeRoute()) return;
        if (!indexPage || !tabsWidget || !tabsSlider) {
            if (!skipRetry) queueMyListHeaderRetry(settings, runtimeGeneration);
            return;
        }
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
        bindMyListNavigation();
        if (myListActive) setMyListView(true);
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
    function clearRouteArtifacts(preservePendingBar) {
        document.body.classList.remove('hssm-client-enabled', 'hssm-home-active', 'hssm-infinite-scroll-active');
        Array.from(document.querySelectorAll('.featurediframe')).forEach(function (frame) {
            if (!preservePendingBar && isHomeRoute()) frame.style.visibility = 'hidden';
            else if (!preservePendingBar) frame.style.removeProperty('visibility');
            delete frame.dataset.hssmMediaBarPending;
        });
        infiniteLibraryKey = '';
        closeBreadcrumbPopover();
        var breadcrumbs = document.querySelector('.hssm-breadcrumbs-wrapper');
        if (breadcrumbs) breadcrumbs.remove();
        breadcrumbsWorkKey = '';
        window.clearTimeout(enhancementTimer);
        window.clearTimeout(homeRetryTimer);
        window.clearTimeout(myListHeaderRetryTimer);
        myListHeaderRetryTimer = null;
        disconnectViewObserver();
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
        var scroller = state.node.querySelector('.hssm-client-scroller');
        if (!scroller || scroller.dataset.hssmPagingBound === 'true') return;
        scroller.dataset.hssmPagingBound = 'true';
        scroller.addEventListener('scroll', function () {
            if (scroller.scrollLeft + scroller.clientWidth >= scroller.scrollWidth - Math.max(600, scroller.clientWidth)) loadSectionPage(state);
        }, { passive:true });
    }

    function paintSectionState(state, loading) {
        if (!state || state.generation !== runtimeGeneration || !state.container.isConnected) return;
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
            if (state.generation !== runtimeGeneration || state.container !== activeHomeContainer()) return;
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
        var type = String(prop(state.section, 'Type', 'type', ''));
        var request = null;
        if (type === 'other-users-activity') {
            request = getJson('HomeScreenSectionsManager/other-users-items', {
                mediaType:prop(state.section, 'ActivityMediaType', 'activityMediaType', 'movies'),
                limit:Math.min(40, Number(prop(state.section, 'ActivityMaxItems', 'activityMaxItems', 20)) || 20)
            }).then(function (result) { return queryIds(prop(result, 'ItemIds', 'itemIds', []).slice(0, 40)); });
        } else if (type === 'rotating-sections' || type === 'seasonal-sections') {
            var draft = activeSectionDraft(state.section);
            if (!draft) return;
            var sourceType = String(prop(draft, 'SourceType', 'sourceType', ''));
            var sourceId = String(prop(draft, 'SourceId', 'sourceId', ''));
            if (sourceType === 'collection') request = queryItems({ ParentId:sourceId, Recursive:true, StartIndex:0, Limit:40 });
            if (sourceType === 'library') request = queryItems({ ParentId:resolvedLibraryId(sourceId), Recursive:true, StartIndex:0, Limit:40 });
            if (sourceType === 'tag') {
                request = postJson('CollectionManager/individual-collection-drafts/preview', tagSource(sourceId, prop(state.section, 'Name', 'name', ''))).then(function (preview) {
                    return queryIds(prop(preview, 'Items', 'items', []).map(function (item) { return String(prop(item, 'Id', 'id', '')); }).slice(0, 40));
                });
            }
        }
        if (!request) return;
        return Promise.resolve(request).then(function (items) {
            if (state.generation !== runtimeGeneration || state.container !== activeHomeContainer()) return;
            state.items = uniqueItems(items);
            state.cursor = state.items.length;
            state.complete = true;
            saveSectionCache(state.section, state.items, state.cursor);
            paintSectionState(state, false);
        }).catch(function (error) {
            console.warn('[Home Screen Manager] A dynamic section could not refresh; its saved content remains visible.', error);
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
            node:null
        };
        sectionRuntime[id] = state;
        paintSectionState(state, !cached);
        if (!cached || !cached.items.length) loadSectionPage(state);
        else state.complete = sectionPageIds(section, state.cursor, 1).length === 0;
        var type = String(prop(section, 'Type', 'type', ''));
        if (type === 'other-users-activity' || type === 'rotating-sections' || type === 'seasonal-sections') {
            window.setTimeout(function () {
                if (state.generation === runtimeGeneration) homeRequestLane(function () { return loadDynamicSection(state); });
            }, 800);
        }
        return state;
    }

    function applyRouteFeatures(settings, scope, home, preferences) {
        document.body.classList.add('hssm-client-enabled');
        document.body.classList.toggle('hssm-home-active', !!home);
        applyLogo(settings);
        applyMyListHeartColor(settings);
        applyMyList(settings, scope);
        if (home) {
            applyRemoveButtons(settings, scope, preferences);
            return;
        }
        applySeriesInfo(settings);
        applyCollections(settings);
        applyBreadcrumbs(settings);
        applyInfiniteScroll(settings);
        applyEnhancedSearch(settings);
    }
    function signature(settings) {
        return JSON.stringify({
            sections: prop(settings, 'Sections', 'sections', []),
            order: prop(settings, 'SectionOrder', 'sectionOrder', []),
            mediaBarInterval: setting(settings, 'MediaBarIntervalSeconds', 5),
            mediaBarImageType: setting(settings, 'MediaBarImageType', 'backdrop'),
            logo: setting(settings, 'LogoImageDataUrl', ''),
            myList: setting(settings, 'EnableMyList', false),
            myListHeartMode: setting(settings, 'MyListHeartColorMode', 'solid'),
            myListHeartOne: setting(settings, 'MyListHeartColorOne', '#f5f5f7'),
            myListHeartTwo: setting(settings, 'MyListHeartColorTwo', '#f5f5f7')
        });
    }

    function renderHome(settings, preferences, generation) {
        var container = activeHomeContainer();
        if (!container || generation !== runtimeGeneration) return false;
        var sections = prop(settings, 'Sections', 'sections', []);
        Array.from(container.querySelectorAll('[data-hssm-section-id]')).forEach(function (node) { node.remove(); });
        sectionRuntime = {};
        sections.forEach(function (section) { initializeSection(section, container, settings, preferences, generation); });
        lastContainer = container;
        lastSignature = signature(settings);
        lastError = '';
        renderedSectionCount = sections.length;
        applyHybridOrder(container, settings, preferences);
        applyRouteFeatures(settings, container.closest('.libraryPage, .page') || container, true, preferences);
        renderMediaBar(settings, preferences, container, sections);
        return true;
    }

    function observeActiveView(settings, scope, home, preferences, generation) {
        disconnectViewObserver();
        if (!scope || generation !== runtimeGeneration) return;
        var pending = false;
        activeViewObserver = new MutationObserver(function (mutations) {
            if (pending || generation !== runtimeGeneration) return;
            var relevant = mutations.some(function (mutation) { return mutation.addedNodes && mutation.addedNodes.length; });
            if (!relevant) return;
            pending = true;
            window.setTimeout(function () {
                pending = false;
                if (generation !== runtimeGeneration || !scope.isConnected) return;
                if (home) {
                    var container = activeHomeContainer();
                    if (container) {
                        applyHybridOrder(container, settings, preferences);
                        applyRemoveButtons(settings, scope, preferences);
                    }
                }
                if (setting(settings, 'EnableMyList', false)) Array.from(scope.querySelectorAll('.card[data-id]')).forEach(addMyListButton);
                if (setting(settings, 'EnableMyList', false)) queueVisibleHeartStatus(scope);
            }, 80);
        });
        activeViewObserver.observe(scope, { childList:true, subtree:true });
    }

    function routeRefresh(force) {
        if (!isHomeRoute()) {
            myListActive = false;
            document.body.classList.remove('hssm-my-list-active');
        }
        reconcileCurrentLibraryRoute();
        var generation = ++runtimeGeneration;
        var preservePendingBar = !force && !isDashboardScreen() && !isPlaybackScreen() && primeCachedMediaBar();
        clearRouteArtifacts(preservePendingBar);
        if (!window.ApiClient || !currentUserId()) {
            if (!isDashboardScreen() && !isPlaybackScreen() && clientReadyAttempts < 300) {
                window.clearTimeout(clientReadyTimer);
                clientReadyAttempts += 1;
                clientReadyTimer = window.setTimeout(function () { routeRefresh(false); }, 100);
            } else if (isHomeRoute()) {
                Array.from(document.querySelectorAll('.featurediframe')).forEach(function (frame) { frame.style.removeProperty('visibility'); });
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
            if (generation !== runtimeGeneration || isDashboardScreen() || isPlaybackScreen()) return;
            applyLogo(settings);
            var attempts = 0;
            function enterView() {
                if (generation !== runtimeGeneration || isDashboardScreen() || isPlaybackScreen()) return;
                var homeContainer = activeHomeContainer();
                if (homeContainer) {
                    var cachedPreferences = cacheRead('native-home-preferences', 24 * 60 * 60 * 1000) || {};
                    if (renderHome(settings, cachedPreferences, generation)) {
                        observeActiveView(settings, homeContainer.closest('.libraryPage, .page') || homeContainer, true, cachedPreferences, generation);
                    }
                    nativePreferences().then(function (preferences) {
                        if (generation !== runtimeGeneration || homeContainer !== activeHomeContainer()) return;
                        preferences = preferences || cachedPreferences;
                        latestNativePreferences = preferences;
                        applyHybridOrder(homeContainer, settings, preferences);
                        applyRemoveButtons(settings, homeContainer.closest('.libraryPage, .page') || homeContainer, preferences);
                        observeActiveView(settings, homeContainer.closest('.libraryPage, .page') || homeContainer, true, preferences, generation);
                        renderMediaBar(settings, preferences, homeContainer, prop(settings, 'Sections', 'sections', []));
                    });
                    return;
                }
                var scope = activePage();
                if (!scope && attempts++ < 30) {
                    homeRetryTimer = window.setTimeout(enterView, 100);
                    return;
                }
                if (!scope) return;
                applyRouteFeatures(settings, scope, false);
                observeActiveView(settings, scope, false, {}, generation);
            }
            enterView();
        }).catch(function (error) {
            if (generation === runtimeGeneration) {
                if (isHomeRoute()) Array.from(document.querySelectorAll('.featurediframe')).forEach(function (frame) { frame.style.removeProperty('visibility'); });
                console.warn('[Home Screen Manager] Could not initialize the active Jellyfin view.', error);
            }
        });
    }

    function queueRouteRefresh(force) {
        window.clearTimeout(routeEventTimer);
        routeEventTimer = window.setTimeout(function () { routeRefresh(!!force); }, force ? 0 : 60);
    }

    window.addEventListener('hashchange', function () { queueRouteRefresh(false); });
    window.addEventListener('pageshow', function () { queueRouteRefresh(false); });
    window.addEventListener('load', function () { queueRouteRefresh(false); }, { once:true });
    document.addEventListener('viewshow', function () { queueRouteRefresh(false); });
    window.addEventListener('home-screen-manager-refresh', function () { routeRefresh(true); });
    window.addEventListener('home-screen-manager-settings-changed', function () {
        settingsCache = null;
        settingsCacheAt = 0;
        cacheRemove('client-settings');
        cacheRemove('media-bar');
        if (!isDashboardScreen() && !isPlaybackScreen()) routeRefresh(true);
    });
    window.addEventListener('scroll', tryInfiniteScroll, { passive: true });
    document.addEventListener('click', function (event) {
        var anchor = event.target && event.target.closest ? event.target.closest('a[href]') : null;
        if (!anchor) return;
        var href = anchor.getAttribute('href') || '';
        var marker = href.indexOf('#/');
        if (marker < 0) return;
        var hash = href.slice(marker);
        if (!libraryRouteType(hash) || !/[?&]topParentId=/i.test(hash)) return;
        pendingLibraryRouteLabel = anchor.getAttribute('aria-label') || anchor.textContent || '';
        if (!liveViewsCache) return;
        var repaired = repairedLibraryHash(hash, liveViewsCache, pendingLibraryRouteLabel);
        if (!repaired || repaired === hash) return;
        anchor.setAttribute('href', href.slice(0, marker) + repaired);
    }, true);
    window.HomeScreenManagerClient = {
        refresh: function () { routeRefresh(true); },
        invalidate: function () {
            settingsCache = null;
            settingsCacheAt = 0;
            cacheRemove('client-settings');
            cacheRemove('media-bar');
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
