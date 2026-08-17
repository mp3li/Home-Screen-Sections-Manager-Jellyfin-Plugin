using System.Reflection;
using Jellyfin.Plugin.HomeScreenSectionsManager.Configuration;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Jellyfin.Plugin.HomeScreenSectionsManager.Api;

/// <summary>Authenticated configuration and static assets consumed by the Jellyfin Web home-screen client.</summary>
[ApiController]
[Route("HomeScreenSectionsManager")]
public sealed class HomeScreenClientController : ControllerBase
{
    /// <summary>Returns the plugin-owned sections and hybrid order for the signed-in user interface.</summary>
    [Authorize]
    [HttpGet("client-settings")]
    public ActionResult<object> GetClientSettings()
    {
        Response.Headers.CacheControl = "no-store, no-cache, must-revalidate, max-age=0";
        Response.Headers.Pragma = "no-cache";
        Response.Headers.Expires = "0";
        var configuration = Plugin.Instance?.Configuration ?? new PluginConfiguration();
        var topRows = Plugin.GetEffectiveTopRows(configuration);
        return Ok(new
        {
            Sections = configuration.Sections.Where(section => section.IsApplied).ToArray(),
            configuration.SectionOrder,
            configuration.Pages,
            configuration.PageOrder,
            configuration.PageLayouts,
            configuration.EnableRemoveContinueNextUp,
            configuration.EnableMyList,
            configuration.HideFavorites,
            configuration.EnableSeriesInfo,
            configuration.InfiniteScrollLibraryIds,
            configuration.EnableCollectionsOnDetailPage,
            configuration.EnableEnhancedSearch,
            configuration.EnableBreadcrumbs,
            configuration.EnableTitleMarquee,
            configuration.TitleMarqueeSpeed,
            configuration.EnableTopRow,
            configuration.TopRowPageIds,
            configuration.TopRowAlwaysShow,
            configuration.TopRowPersistent,
            configuration.TopRowLogoShadowColor,
            configuration.EnableTopRowMessage,
            configuration.TopRowMessagePageIds,
            configuration.TopRowMessageAlwaysShow,
            configuration.TopRowMessagePersistent,
            configuration.TopRowMessageText,
            configuration.TopRowMessageFontDataUrl,
            configuration.TopRowMessageFontColor,
            configuration.TopRowMessageFontShadowColor,
            configuration.TopRowMessageBarColorMode,
            configuration.TopRowMessageBarColorOne,
            configuration.TopRowMessageBarColorTwo,
            configuration.TopRowMessageMarqueeSpeed,
            TopRows = topRows,
            configuration.TopRowSection,
            TopRowLogoCollectionIds = CollectionManagerLogoBridge.GetSelectedCollectionIds(),
            configuration.HeaderTabsColorMode,
            configuration.HeaderTabsColorOne,
            configuration.HeaderTabsColorTwo,
            configuration.PlayButtonColorMode,
            configuration.PlayButtonColorOne,
            configuration.PlayButtonColorTwo,
            configuration.ProgressColorMode,
            configuration.ProgressColorOne,
            configuration.ProgressColorTwo,
            configuration.SidebarIconColorMode,
            configuration.SidebarIconColorOne,
            configuration.SidebarIconColorTwo,
            configuration.MyListHeartColorMode,
            configuration.MyListHeartColorOne,
            configuration.MyListHeartColorTwo,
            configuration.LogoImageDataUrl,
            configuration.MediaBarIntervalSeconds,
            configuration.MediaBarImageType,
            configuration.EnableMediaBarSlowZoom,
        });
    }

    /// <summary>Serves the exact source logo selected for a collection in Collection Manager.</summary>
    [Authorize]
    [HttpGet("top-row-logo/{collectionId}")]
    public ActionResult GetTopRowLogo(string collectionId)
    {
        var logo = CollectionManagerLogoBridge.Open(collectionId);
        if (logo is null)
        {
            return NotFound();
        }

        Response.Headers.CacheControl = "no-store, no-cache, must-revalidate, max-age=0";
        Response.Headers.Pragma = "no-cache";
        Response.Headers.Expires = "0";
        return File(logo.Stream, logo.ContentType);
    }

    /// <summary>Serves the embedded Home Screen Manager browser client.</summary>
    [AllowAnonymous]
    [HttpGet("client.js")]
    [Produces("application/javascript")]
    public ActionResult GetClientScript() => Embedded("Jellyfin.Plugin.HomeScreenSectionsManager.Web.homeScreenClient.js", "application/javascript");

    /// <summary>Serves the embedded Home Screen Manager browser styles.</summary>
    [AllowAnonymous]
    [HttpGet("client.css")]
    [Produces("text/css")]
    public ActionResult GetClientStyles() => Embedded("Jellyfin.Plugin.HomeScreenSectionsManager.Web.homeScreenClient.css", "text/css");

    /// <summary>Serves a stable no-cache bootstrap so a catalog update always loads the installed browser-client version.</summary>
    [AllowAnonymous]
    [HttpGet("bootstrap.js")]
    [Produces("application/javascript")]
    public ActionResult GetBootstrapScript()
    {
        var version = Assembly.GetExecutingAssembly().GetName().Version?.ToString(4) ?? "0.0.0.0";
        var script = "(function(){'use strict';var version='" + version + "';var mask=document.getElementById('hssm-media-bar-boot-mask');if(!mask){mask=document.createElement('style');mask.id='hssm-media-bar-boot-mask';mask.textContent='#homeTab>.featurediframe{display:none!important}';document.head.appendChild(mask);window.setTimeout(function(){var stale=document.getElementById('hssm-media-bar-boot-mask');if(stale)stale.remove();},15000);}var style=document.querySelector('link[data-hssm-client-style]');if(!style||style.dataset.hssmClientVersion!==version){if(style)style.remove();style=document.createElement('link');style.rel='stylesheet';style.href=ApiClient.getUrl('HomeScreenSectionsManager/client.css',{v:version});style.dataset.hssmClientStyle='true';style.dataset.hssmClientVersion=version;document.head.appendChild(style);}if(window.HomeScreenManagerClient&&window.HomeScreenManagerClient.version===version){window.HomeScreenManagerClient.refresh();return;}document.querySelectorAll('script[data-hssm-client-script]').forEach(function(node){node.remove();});var client=document.createElement('script');client.src=ApiClient.getUrl('HomeScreenSectionsManager/client.js',{v:version});client.dataset.hssmClientScript='true';client.dataset.hssmClientVersion=version;client.onerror=function(){var stale=document.getElementById('hssm-media-bar-boot-mask');if(stale)stale.remove();console.error('[Home Screen Manager] Could not load the browser client.');};document.head.appendChild(client);}());";
        Response.Headers.CacheControl = "no-store, no-cache, must-revalidate, max-age=0";
        Response.Headers.Pragma = "no-cache";
        Response.Headers.Expires = "0";
        return Content(script, "application/javascript");
    }

    /// <summary>Serves the credited Abyss-compatible media-bar document.</summary>
    [AllowAnonymous]
    [HttpGet("media-bar.html")]
    [Produces("text/html")]
    public ActionResult GetMediaBar()
    {
        var stream = Assembly.GetExecutingAssembly().GetManifestResourceStream("Jellyfin.Plugin.HomeScreenSectionsManager.Web.mediaBar.html");
        if (stream is null)
        {
            return NotFound();
        }

        using var reader = new StreamReader(stream);
        var configuration = Plugin.Instance?.Configuration ?? new PluginConfiguration();
        var html = reader.ReadToEnd()
            .Replace("__HSSM_MEDIA_BAR_INTERVAL__", configuration.MediaBarIntervalSeconds.ToString(System.Globalization.CultureInfo.InvariantCulture), StringComparison.Ordinal)
            .Replace("__HSSM_MEDIA_BAR_IMAGE_TYPE__", configuration.MediaBarImageType, StringComparison.Ordinal);
        Response.Headers.CacheControl = "no-store, no-cache, must-revalidate, max-age=0";
        Response.Headers.Pragma = "no-cache";
        Response.Headers.Expires = "0";
        return Content(html, "text/html");
    }

    /// <summary>Serves the license retained with the adapted Abyss spotlight portion.</summary>
    [AllowAnonymous]
    [HttpGet("abyss-license.txt")]
    [Produces("text/plain")]
    public ActionResult GetAbyssLicense() => Embedded("Jellyfin.Plugin.HomeScreenSectionsManager.ThirdParty.Abyss.LICENSE", "text/plain");

    private ActionResult Embedded(string resourceName, string contentType)
    {
        var stream = Assembly.GetExecutingAssembly().GetManifestResourceStream(resourceName);
        if (stream is null)
        {
            return NotFound();
        }

        Response.Headers.CacheControl = "no-store, no-cache, must-revalidate, max-age=0";
        Response.Headers.Pragma = "no-cache";
        Response.Headers.Expires = "0";
        return File(stream, contentType);
    }
}
