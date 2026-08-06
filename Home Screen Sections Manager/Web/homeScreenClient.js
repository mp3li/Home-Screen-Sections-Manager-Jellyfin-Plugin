(function () {
    'use strict';

    if (window.HomeScreenManagerClient) {
        window.HomeScreenManagerClient.refresh();
        return;
    }

    var renderTimer = null;
    var rendering = false;
    var rerenderRequested = false;
    var lastContainer = null;
    var lastSignature = '';
    var defaultSections = ['smalllibrarytiles', 'resume', 'resumeaudio', 'resumebook', 'livetv', 'nextup', 'latestmedia'];

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
        var candidates = document.querySelectorAll('.homeSectionsContainer');
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
            Fields: 'PrimaryImageAspectRatio,DateCreated,PremiereDate,ProductionYear,CommunityRating,SortName,Tags',
            ImageTypeLimit: 1,
            EnableImageTypes: 'Primary,Backdrop,Thumb'
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

    function sectionItems(section) {
        var type = String(prop(section, 'Type', 'type', ''));
        var sources = prop(section, 'SourceIds', 'sourceIds', []).map(String);
        var itemIds = prop(section, 'ItemIds', 'itemIds', []).map(String);
        if (type === 'manual-content' || type === 'individual-tag-content' || type === 'multiple-tag-content' || type === 'muilti-match-tag-collection-content') {
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

    function card(item) {
        var id = String(prop(item, 'Id', 'id', ''));
        var name = String(prop(item, 'Name', 'name', ''));
        var year = prop(item, 'ProductionYear', 'productionYear', '');
        var serverId = typeof ApiClient.serverId === 'function' ? ApiClient.serverId() : '';
        var href = '#/details?id=' + encodeURIComponent(id) + (serverId ? '&serverId=' + encodeURIComponent(serverId) : '');
        var imageUrl = ApiClient.getUrl('Items/' + encodeURIComponent(id) + '/Images/Primary', { maxHeight: 480, quality: 90 });
        return '<div class="card overflowPortraitCard card-hoverable card-withuserdata hssm-client-card" data-id="' + escapeHtml(id) + '">' +
            '<div class="cardBox cardBox-bottompadded"><div class="cardScalable"><div class="cardPadder cardPadder-overflowPortrait"></div>' +
            '<a is="emby-linkbutton" href="' + escapeHtml(href) + '" class="cardImageContainer coveredImage cardContent itemAction" aria-label="' + escapeHtml(name) + '" style="background-image:url(&quot;' + escapeHtml(imageUrl) + '&quot;)"></a>' +
            '</div><div class="cardText cardTextCentered cardText-first"><bdi><a is="emby-linkbutton" href="' + escapeHtml(href) + '" class="itemAction textActionButton">' + escapeHtml(name) + '</a></bdi></div>' +
            (year ? '<div class="cardText cardTextCentered cardText-secondary"><bdi>' + escapeHtml(year) + '</bdi></div>' : '') + '</div></div>';
    }

    function sectionNode(section, items) {
        var node = document.createElement('div');
        var id = String(prop(section, 'Id', 'id', ''));
        var name = String(prop(section, 'Name', 'name', ''));
        node.className = 'verticalSection hssm-client-section';
        node.dataset.hssmSectionId = id;
        if (!items.length) {
            node.hidden = true;
            return node;
        }
        node.innerHTML = '<h2 class="sectionTitle sectionTitle-cards padded-left">' + escapeHtml(name) + '</h2>' +
            '<div class="hssm-client-scroller padded-top-focusscale padded-bottom-focusscale"><div class="itemsContainer scrollSlider focuscontainer-x hssm-client-items">' +
            items.map(card).join('') + '</div></div>';
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

    function nodesInOrder(container, settings, preferences) {
        var sectionOrder = prop(settings, 'SectionOrder', 'sectionOrder', []).map(String);
        var native = nativeTypes(preferences);
        var desired = [];
        var used = new Set();
        var resumeIndex = native.indexOf('resume');
        function add(node) {
            if (node && !used.has(node)) {
                used.add(node);
                desired.push(node);
            }
        }
        if (resumeIndex >= 0) add(container.querySelector('.section' + resumeIndex));
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
        return desired;
    }

    function applyHybridOrder(container, settings, preferences) {
        var desired = nodesInOrder(container, settings, preferences);
        var current = Array.from(container.children);
        var unchanged = current.length === desired.length && current.every(function (node, index) { return node === desired[index]; });
        if (!unchanged) desired.forEach(function (node) { container.appendChild(node); });
    }

    function signature(settings) {
        return JSON.stringify({
            sections: prop(settings, 'Sections', 'sections', []),
            order: prop(settings, 'SectionOrder', 'sectionOrder', [])
        });
    }

    function renderHome() {
        if (rendering || !window.ApiClient || !currentUserId()) {
            rerenderRequested = true;
            return;
        }
        var container = activeHomeContainer();
        if (!container) return;
        rendering = true;
        rerenderRequested = false;
        Promise.all([getJson('HomeScreenSectionsManager/client-settings'), nativePreferences()]).then(function (values) {
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
                return;
            }
            existing.forEach(function (node) { node.remove(); });
            return Promise.all(sections.map(function (section) {
                return sectionItems(section).then(function (items) {
                    var node = sectionNode(section, orderItems(uniqueItems(items), section));
                    container.appendChild(node);
                }, function () {
                    container.appendChild(sectionNode(section, []));
                });
            })).then(function () {
                lastContainer = container;
                lastSignature = nextSignature;
                applyHybridOrder(container, settings, preferences);
            });
        }).catch(function (error) {
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

    var observer = new MutationObserver(scheduleRender);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('hashchange', scheduleRender);
    window.addEventListener('home-screen-manager-refresh', function () {
        lastSignature = '';
        scheduleRender();
    });
    window.HomeScreenManagerClient = { refresh: function () { lastSignature = ''; scheduleRender(); } };
    scheduleRender();
}());
