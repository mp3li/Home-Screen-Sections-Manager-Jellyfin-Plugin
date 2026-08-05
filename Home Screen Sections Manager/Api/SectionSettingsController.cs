using Jellyfin.Plugin.HomeScreenSectionsManager.Configuration;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Jellyfin.Plugin.HomeScreenSectionsManager.Api;

/// <summary>Persists the Dashboard's Home Screen Sections Manager-owned layout settings.</summary>
[ApiController]
[Authorize(Policy = "RequiresElevation")]
[Route("HomeScreenSectionsManager")]
public sealed class SectionSettingsController : ControllerBase
{
    /// <summary>Gets the current saved custom sections and hybrid layout order.</summary>
    [HttpGet("section-settings")]
    public ActionResult<PluginConfiguration> Get()
    {
        return Ok(Plugin.Instance?.Configuration ?? new PluginConfiguration());
    }

    /// <summary>Replaces the saved custom sections and hybrid layout order.</summary>
    [HttpPost("section-settings")]
    public ActionResult<PluginConfiguration> Save([FromBody] SectionSettingsRequest request)
    {
        if (Plugin.Instance is null)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, "Home Screen Sections Manager is not initialized.");
        }

        return Ok(Plugin.Instance.UpdateSectionSettings(request));
    }
}
