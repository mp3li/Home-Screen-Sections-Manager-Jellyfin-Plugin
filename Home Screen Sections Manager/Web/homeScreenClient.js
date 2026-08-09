(function () {
    'use strict';

    function removeAll(selector) {
        Array.from(document.querySelectorAll(selector)).forEach(function (node) { node.remove(); });
    }

    function restoreAbyssMediaBar() {
        Array.from(document.querySelectorAll('.featurediframe')).forEach(function (frame) {
            var pluginFrame = String(frame.getAttribute('src') || frame.src || '').indexOf('/HomeScreenSectionsManager/media-bar.html') >= 0;
            if (pluginFrame) {
                frame.src = frame.dataset.hssmAbyssSpotlightUrl || new URL('ui/spotlight.html', document.baseURI).href;
            }
            frame.style.removeProperty('visibility');
            delete frame.dataset.hssmMediaBar;
            delete frame.dataset.hssmMediaBarReady;
            delete frame.dataset.hssmMediaBarPending;
            delete frame.dataset.hssmAbyssSpotlightUrl;
        });
    }

    function restoreJellyfinWeb() {
        restoreAbyssMediaBar();
        removeAll('.hssm-client-section, .hssm-my-list-page, .hssm-my-list-tab, .hssm-my-list-button, .hssm-my-list-detail-button, .hssm-remove-row-button, .hssm-breadcrumbs-wrapper, .hssm-header-home-link, .hssm-search-controls, .hssm-search-results, .hssm-series-info, .hssm-detail-collections');
        removeAll('style[id^="hssm-"], link[data-hssm-client-style]');
        document.documentElement.classList.remove('hssm-has-logo');
        document.body.classList.remove('hssm-has-logo');
        Array.from(document.querySelectorAll('.hssm-media-source-section')).forEach(function (node) { node.classList.remove('hssm-media-source-section'); });
    }

    window.HomeScreenManagerClient = {
        refresh: restoreJellyfinWeb,
        status: function () { return { safeMode: true, renderedSectionCount: 0, lastError: 'Runtime disabled for server recovery.' }; }
    };

    restoreJellyfinWeb();
    console.warn('[Home Screen Manager] Browser runtime is disabled in recovery safe mode.');
}());
