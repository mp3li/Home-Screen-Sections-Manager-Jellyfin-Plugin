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
        var configuration = Plugin.Instance?.Configuration ?? new PluginConfiguration();
        return Ok(new
        {
            Sections = configuration.Sections.Where(section => section.IsApplied).ToArray(),
            configuration.SectionOrder,
        });
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

    private ActionResult Embedded(string resourceName, string contentType)
    {
        var stream = Assembly.GetExecutingAssembly().GetManifestResourceStream(resourceName);
        if (stream is null)
        {
            return NotFound();
        }

        Response.Headers.CacheControl = "no-cache";
        return File(stream, contentType);
    }
}
