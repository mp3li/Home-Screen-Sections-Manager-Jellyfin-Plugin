using Jellyfin.Plugin.HomeScreenSectionsManager.Configuration;
using Jellyfin.Plugin.HomeScreenSectionsManager.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Jellyfin.Plugin.HomeScreenSectionsManager.Api;

/// <summary>Persists the Dashboard's Home Screen Manager-owned layout settings.</summary>
[ApiController]
[Authorize(Policy = "RequiresElevation")]
[Route("HomeScreenSectionsManager")]
public sealed class SectionSettingsController : ControllerBase
{
    private readonly HomeScreenInjectionService _injection;

    /// <summary>Initializes a new instance of the <see cref="SectionSettingsController"/> class.</summary>
    public SectionSettingsController(HomeScreenInjectionService injection)
    {
        _injection = injection;
    }

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
            return StatusCode(StatusCodes.Status503ServiceUnavailable, "Home Screen Manager is not initialized.");
        }

        return Ok(Plugin.Instance.UpdateSectionSettings(request));
    }

    /// <summary>Saves one completed section's ordering and makes the home-screen client available.</summary>
    [HttpPost("sections/{sectionId}/apply")]
    public ActionResult<object> ApplySection([FromRoute] string sectionId, [FromBody] ApplySectionRequest request)
    {
        if (Plugin.Instance is null)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, "Home Screen Manager is not initialized.");
        }

        if (!Plugin.Instance.Configuration.Sections.Any(section => string.Equals(section.Id, sectionId, StringComparison.Ordinal)))
        {
            return NotFound("Save the section content before adding it to the home screen.");
        }

        if (!_injection.TryRegister())
        {
            return Conflict("File Transformation is required to add custom sections to Jellyfin Web. Install its Jellyfin 10.11-compatible release, restart Jellyfin, and try again.");
        }

        var configuration = Plugin.Instance.UpdateSectionContentOrder(sectionId, request.ContentOrder);
        var section = configuration.Sections.First(item => string.Equals(item.Id, sectionId, StringComparison.Ordinal));
        return Ok(new { Applied = true, Section = section, RequiresRefresh = true });
    }

    /// <summary>Gets the saved Abyss CSS generator settings.</summary>
    [HttpGet("customization-settings")]
    public ActionResult<CustomizationSettingsRequest> GetCustomizationSettings()
    {
        var configuration = Plugin.Instance?.Configuration ?? new PluginConfiguration();
        return Ok(new CustomizationSettingsRequest
        {
            AbyssAccentColor = configuration.AbyssAccentColor,
            AbyssRadius = configuration.AbyssRadius,
            AbyssIndicatorColor = configuration.AbyssIndicatorColor,
            AbyssFontImportUrl = configuration.AbyssFontImportUrl,
            AbyssFontFamily = configuration.AbyssFontFamily,
            AbyssLiteMode = configuration.AbyssLiteMode,
        });
    }

    /// <summary>Saves only the Abyss CSS generator settings.</summary>
    [HttpPost("customization-settings")]
    public ActionResult<CustomizationSettingsRequest> SaveCustomizationSettings([FromBody] CustomizationSettingsRequest request)
    {
        if (Plugin.Instance is null)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, "Home Screen Manager is not initialized.");
        }

        var saved = Plugin.Instance.UpdateCustomizationSettings(request);
        return Ok(new CustomizationSettingsRequest
        {
            AbyssAccentColor = saved.AbyssAccentColor,
            AbyssRadius = saved.AbyssRadius,
            AbyssIndicatorColor = saved.AbyssIndicatorColor,
            AbyssFontImportUrl = saved.AbyssFontImportUrl,
            AbyssFontFamily = saved.AbyssFontFamily,
            AbyssLiteMode = saved.AbyssLiteMode,
        });
    }
}
