using Jellyfin.Plugin.HomeScreenSectionsManager.Configuration;
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

        var configuration = Plugin.Instance.ApplySection(sectionId, request);
        var section = configuration.Sections.First(item => string.Equals(item.Id, sectionId, StringComparison.Ordinal));
        return Ok(new
        {
            Applied = true,
            Section = section,
            RequiresRefresh = true,
        });
    }

    /// <summary>Gets the independently switchable browser enhancements.</summary>
    [HttpGet("main-settings")]
    public ActionResult<MainSettingsRequest> GetMainSettings()
    {
        var configuration = Plugin.Instance?.Configuration ?? new PluginConfiguration();
        return Ok(new MainSettingsRequest
        {
            AutoRefreshSections = configuration.AutoRefreshSections,
            EnableRemoveContinueNextUp = configuration.EnableRemoveContinueNextUp,
            EnableMyList = configuration.EnableMyList,
            HideFavorites = configuration.HideFavorites,
            EnableSeriesInfo = configuration.EnableSeriesInfo,
            InfiniteScrollLibraryIds = [.. configuration.InfiniteScrollLibraryIds],
            EnableCollectionsOnDetailPage = configuration.EnableCollectionsOnDetailPage,
            EnableEnhancedSearch = configuration.EnableEnhancedSearch,
            EnableBreadcrumbs = configuration.EnableBreadcrumbs,
            EnableTitleMarquee = configuration.EnableTitleMarquee,
            TitleMarqueeSpeed = configuration.TitleMarqueeSpeed,
        });
    }

    /// <summary>Saves the independently switchable browser enhancements.</summary>
    [HttpPost("main-settings")]
    public ActionResult<MainSettingsRequest> SaveMainSettings([FromBody] MainSettingsRequest request)
    {
        if (Plugin.Instance is null)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, "Home Screen Manager is not initialized.");
        }

        var configuration = Plugin.Instance.UpdateMainSettings(request);
        return Ok(new MainSettingsRequest
        {
            AutoRefreshSections = configuration.AutoRefreshSections,
            EnableRemoveContinueNextUp = configuration.EnableRemoveContinueNextUp,
            EnableMyList = configuration.EnableMyList,
            HideFavorites = configuration.HideFavorites,
            EnableSeriesInfo = configuration.EnableSeriesInfo,
            InfiniteScrollLibraryIds = [.. configuration.InfiniteScrollLibraryIds],
            EnableCollectionsOnDetailPage = configuration.EnableCollectionsOnDetailPage,
            EnableEnhancedSearch = configuration.EnableEnhancedSearch,
            EnableBreadcrumbs = configuration.EnableBreadcrumbs,
            EnableTitleMarquee = configuration.EnableTitleMarquee,
            TitleMarqueeSpeed = configuration.TitleMarqueeSpeed,
        });
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
            HeaderTabsColorMode = configuration.HeaderTabsColorMode,
            HeaderTabsColorOne = configuration.HeaderTabsColorOne,
            HeaderTabsColorTwo = configuration.HeaderTabsColorTwo,
            SelectedHeaderTabTextColor = configuration.SelectedHeaderTabTextColor,
            PlayButtonColorMode = configuration.PlayButtonColorMode,
            PlayButtonColorOne = configuration.PlayButtonColorOne,
            PlayButtonColorTwo = configuration.PlayButtonColorTwo,
            ProgressColorMode = configuration.ProgressColorMode,
            ProgressColorOne = configuration.ProgressColorOne,
            ProgressColorTwo = configuration.ProgressColorTwo,
            SidebarIconColorMode = configuration.SidebarIconColorMode,
            SidebarIconColorOne = configuration.SidebarIconColorOne,
            SidebarIconColorTwo = configuration.SidebarIconColorTwo,
            MyListHeartColorMode = configuration.MyListHeartColorMode,
            MyListHeartColorOne = configuration.MyListHeartColorOne,
            MyListHeartColorTwo = configuration.MyListHeartColorTwo,
            LogoImageDataUrl = configuration.LogoImageDataUrl,
            MediaBarIntervalSeconds = configuration.MediaBarIntervalSeconds,
            MediaBarImageType = configuration.MediaBarImageType,
            EnableMediaBarSlowZoom = configuration.EnableMediaBarSlowZoom,
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
            HeaderTabsColorMode = saved.HeaderTabsColorMode,
            HeaderTabsColorOne = saved.HeaderTabsColorOne,
            HeaderTabsColorTwo = saved.HeaderTabsColorTwo,
            SelectedHeaderTabTextColor = saved.SelectedHeaderTabTextColor,
            PlayButtonColorMode = saved.PlayButtonColorMode,
            PlayButtonColorOne = saved.PlayButtonColorOne,
            PlayButtonColorTwo = saved.PlayButtonColorTwo,
            ProgressColorMode = saved.ProgressColorMode,
            ProgressColorOne = saved.ProgressColorOne,
            ProgressColorTwo = saved.ProgressColorTwo,
            SidebarIconColorMode = saved.SidebarIconColorMode,
            SidebarIconColorOne = saved.SidebarIconColorOne,
            SidebarIconColorTwo = saved.SidebarIconColorTwo,
            MyListHeartColorMode = saved.MyListHeartColorMode,
            MyListHeartColorOne = saved.MyListHeartColorOne,
            MyListHeartColorTwo = saved.MyListHeartColorTwo,
            LogoImageDataUrl = saved.LogoImageDataUrl,
            MediaBarIntervalSeconds = saved.MediaBarIntervalSeconds,
            MediaBarImageType = saved.MediaBarImageType,
            EnableMediaBarSlowZoom = saved.EnableMediaBarSlowZoom,
        });
    }
}
