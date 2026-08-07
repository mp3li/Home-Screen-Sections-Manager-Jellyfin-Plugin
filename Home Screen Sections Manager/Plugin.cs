using Jellyfin.Plugin.HomeScreenSectionsManager.Configuration;
using MediaBrowser.Common.Configuration;
using MediaBrowser.Common.Plugins;
using MediaBrowser.Model.Plugins;
using MediaBrowser.Model.Serialization;

namespace Jellyfin.Plugin.HomeScreenSectionsManager;

/// <summary>The Home Screen Manager plugin entry point.</summary>
public sealed class Plugin : BasePlugin<PluginConfiguration>, IHasWebPages
{
    /// <summary>Initializes a new instance of the <see cref="Plugin"/> class.</summary>
    public Plugin(IApplicationPaths applicationPaths, IXmlSerializer xmlSerializer)
        : base(applicationPaths, xmlSerializer)
    {
        Instance = this;
    }

    /// <summary>Gets the active plugin instance.</summary>
    public static Plugin? Instance { get; private set; }

    /// <inheritdoc />
    public override string Name => "Home Screen Manager";

    /// <inheritdoc />
    public override Guid Id => Guid.Parse("7948ef78-238c-4a8b-be2b-3ab473e50a1b");

    /// <summary>Replaces only the settings owned by the section layout editor.</summary>
    public PluginConfiguration UpdateSectionSettings(SectionSettingsRequest request)
    {
        var previous = Configuration;
        var configuration = new PluginConfiguration
        {
            JellyfinSectionLabelColor = request.JellyfinSectionLabelColor,
            ManagerSectionLabelColor = request.ManagerSectionLabelColor,
            AbyssAccentColor = previous.AbyssAccentColor,
            AbyssRadius = previous.AbyssRadius,
            AbyssIndicatorColor = previous.AbyssIndicatorColor,
            AbyssFontImportUrl = previous.AbyssFontImportUrl,
            AbyssFontFamily = previous.AbyssFontFamily,
            AbyssLiteMode = previous.AbyssLiteMode,
            HeaderTabsColorMode = previous.HeaderTabsColorMode, HeaderTabsColorOne = previous.HeaderTabsColorOne, HeaderTabsColorTwo = previous.HeaderTabsColorTwo, PlayButtonColorMode = previous.PlayButtonColorMode, PlayButtonColorOne = previous.PlayButtonColorOne, PlayButtonColorTwo = previous.PlayButtonColorTwo, ProgressColorMode = previous.ProgressColorMode, ProgressColorOne = previous.ProgressColorOne, ProgressColorTwo = previous.ProgressColorTwo, SidebarIconColorMode = previous.SidebarIconColorMode, SidebarIconColorOne = previous.SidebarIconColorOne, SidebarIconColorTwo = previous.SidebarIconColorTwo, MyListHeartColorMode = previous.MyListHeartColorMode, MyListHeartColorOne = previous.MyListHeartColorOne, MyListHeartColorTwo = previous.MyListHeartColorTwo, LogoImageDataUrl = previous.LogoImageDataUrl, MediaBarIntervalSeconds = previous.MediaBarIntervalSeconds, MediaBarImageType = previous.MediaBarImageType, AutoRefreshSections = previous.AutoRefreshSections, EnableRemoveContinueNextUp = previous.EnableRemoveContinueNextUp, EnableMyList = previous.EnableMyList, EnableSeriesInfo = previous.EnableSeriesInfo, InfiniteScrollLibraryIds = [.. previous.InfiniteScrollLibraryIds], EnableCollectionsOnDetailPage = previous.EnableCollectionsOnDetailPage, EnableEnhancedSearch = previous.EnableEnhancedSearch, EnableBreadcrumbs = previous.EnableBreadcrumbs,
            SectionOrder = (request.SectionOrder ?? []).Where(id => !string.IsNullOrWhiteSpace(id)).Distinct(StringComparer.Ordinal).ToList(),
            Sections = (request.Sections ?? [])
                .Where(section => !string.IsNullOrWhiteSpace(section.Id) && !string.IsNullOrWhiteSpace(section.Name) && !string.IsNullOrWhiteSpace(section.Type))
                .Select(section => new HomeScreenSectionDefinition
                {
                    Id = section.Id,
                    Name = section.Name.Trim(),
                    Type = section.Type,
                    SourceIds = (section.SourceIds ?? []).Where(id => !string.IsNullOrWhiteSpace(id)).Distinct(StringComparer.Ordinal).ToList(),
                    ItemIds = (section.ItemIds ?? []).Where(id => !string.IsNullOrWhiteSpace(id)).Distinct(StringComparer.Ordinal).ToList(),
                    ContentOrder = NormalizeContentOrder(section.ContentOrder),
                    ArtSize = NormalizeArtSize(section.ArtSize),
                    ArtType = NormalizeArtType(section.ArtType),
                    ArtShape = NormalizeArtShape(section.ArtShape),
                    ShowText = section.ShowText,
                    Drafts = NormalizeSectionDrafts(section.Drafts),
                    RotationIntervalMinutes = Math.Clamp(section.RotationIntervalMinutes, 1, 525600),
                    RotationStartUnixMilliseconds = Math.Max(0, section.RotationStartUnixMilliseconds),
                    IsApplied = section.IsApplied,
                })
                .ToList(),
        };

        UpdateConfiguration(configuration);
        return configuration;
    }

    /// <summary>Updates only the saved Abyss CSS generator settings.</summary>
    public PluginConfiguration UpdateCustomizationSettings(CustomizationSettingsRequest request)
    {
        var previous = Configuration;
        var configuration = new PluginConfiguration
        {
            JellyfinSectionLabelColor = previous.JellyfinSectionLabelColor,
            ManagerSectionLabelColor = previous.ManagerSectionLabelColor,
            AbyssAccentColor = request.AbyssAccentColor ?? "#f5f5f7",
            AbyssRadius = Math.Clamp(request.AbyssRadius, 0, 64),
            AbyssIndicatorColor = request.AbyssIndicatorColor ?? "#373737",
            AbyssFontImportUrl = (request.AbyssFontImportUrl ?? string.Empty).Trim(),
            AbyssFontFamily = (request.AbyssFontFamily ?? string.Empty).Trim(),
            AbyssLiteMode = request.AbyssLiteMode,
            HeaderTabsColorMode = NormalizeColorMode(request.HeaderTabsColorMode),
            HeaderTabsColorOne = NormalizeColor(request.HeaderTabsColorOne, "#f5f5f7"), HeaderTabsColorTwo = NormalizeColor(request.HeaderTabsColorTwo, "#f5f5f7"),
            PlayButtonColorMode = NormalizeColorMode(request.PlayButtonColorMode),
            PlayButtonColorOne = NormalizeColor(request.PlayButtonColorOne, "#f5f5f7"), PlayButtonColorTwo = NormalizeColor(request.PlayButtonColorTwo, "#f5f5f7"),
            ProgressColorMode = NormalizeColorMode(request.ProgressColorMode),
            ProgressColorOne = NormalizeColor(request.ProgressColorOne, "#f5f5f7"), ProgressColorTwo = NormalizeColor(request.ProgressColorTwo, "#f5f5f7"),
            SidebarIconColorMode = NormalizeColorMode(request.SidebarIconColorMode),
            SidebarIconColorOne = NormalizeColor(request.SidebarIconColorOne, "#f5f5f7"), SidebarIconColorTwo = NormalizeColor(request.SidebarIconColorTwo, "#f5f5f7"),
            MyListHeartColorMode = NormalizeColorMode(request.MyListHeartColorMode),
            MyListHeartColorOne = NormalizeColor(request.MyListHeartColorOne, "#f5f5f7"), MyListHeartColorTwo = NormalizeColor(request.MyListHeartColorTwo, "#f5f5f7"),
            LogoImageDataUrl = NormalizeImageDataUrl(request.LogoImageDataUrl),
            MediaBarIntervalSeconds = Math.Clamp(request.MediaBarIntervalSeconds, 1, 300),
            MediaBarImageType = NormalizeMediaBarImageType(request.MediaBarImageType),
            AutoRefreshSections = previous.AutoRefreshSections, EnableRemoveContinueNextUp = previous.EnableRemoveContinueNextUp, EnableMyList = previous.EnableMyList, EnableSeriesInfo = previous.EnableSeriesInfo, InfiniteScrollLibraryIds = [.. previous.InfiniteScrollLibraryIds], EnableCollectionsOnDetailPage = previous.EnableCollectionsOnDetailPage, EnableEnhancedSearch = previous.EnableEnhancedSearch, EnableBreadcrumbs = previous.EnableBreadcrumbs,
            SectionOrder = [.. previous.SectionOrder],
            Sections = previous.Sections
                .Select(section => new HomeScreenSectionDefinition
                {
                    Id = section.Id,
                    Name = section.Name,
                    Type = section.Type,
                    SourceIds = [.. section.SourceIds],
                    ItemIds = [.. section.ItemIds],
                    ContentOrder = NormalizeContentOrder(section.ContentOrder),
                    ArtSize = NormalizeArtSize(section.ArtSize),
                    ArtType = NormalizeArtType(section.ArtType),
                    ArtShape = NormalizeArtShape(section.ArtShape),
                    ShowText = section.ShowText,
                    Drafts = NormalizeSectionDrafts(section.Drafts),
                    RotationIntervalMinutes = Math.Clamp(section.RotationIntervalMinutes, 1, 525600),
                    RotationStartUnixMilliseconds = Math.Max(0, section.RotationStartUnixMilliseconds),
                    IsApplied = section.IsApplied,
                })
                .ToList(),
        };

        UpdateConfiguration(configuration);
        return configuration;
    }

    /// <summary>Saves the final ordering selected for one completed home-screen section.</summary>
    public PluginConfiguration ApplySection(string sectionId, ApplySectionRequest request)
    {
        var previous = Configuration;
        var normalizedId = sectionId?.Trim() ?? string.Empty;
        var normalizedOrder = NormalizeContentOrder(request.ContentOrder);
        var configuration = new PluginConfiguration
        {
            JellyfinSectionLabelColor = previous.JellyfinSectionLabelColor,
            ManagerSectionLabelColor = previous.ManagerSectionLabelColor,
            AbyssAccentColor = previous.AbyssAccentColor,
            AbyssRadius = previous.AbyssRadius,
            AbyssIndicatorColor = previous.AbyssIndicatorColor,
            AbyssFontImportUrl = previous.AbyssFontImportUrl,
            AbyssFontFamily = previous.AbyssFontFamily,
            AbyssLiteMode = previous.AbyssLiteMode,
            HeaderTabsColorMode = previous.HeaderTabsColorMode, HeaderTabsColorOne = previous.HeaderTabsColorOne, HeaderTabsColorTwo = previous.HeaderTabsColorTwo, PlayButtonColorMode = previous.PlayButtonColorMode, PlayButtonColorOne = previous.PlayButtonColorOne, PlayButtonColorTwo = previous.PlayButtonColorTwo, ProgressColorMode = previous.ProgressColorMode, ProgressColorOne = previous.ProgressColorOne, ProgressColorTwo = previous.ProgressColorTwo, SidebarIconColorMode = previous.SidebarIconColorMode, SidebarIconColorOne = previous.SidebarIconColorOne, SidebarIconColorTwo = previous.SidebarIconColorTwo, MyListHeartColorMode = previous.MyListHeartColorMode, MyListHeartColorOne = previous.MyListHeartColorOne, MyListHeartColorTwo = previous.MyListHeartColorTwo, LogoImageDataUrl = previous.LogoImageDataUrl, MediaBarIntervalSeconds = previous.MediaBarIntervalSeconds, MediaBarImageType = previous.MediaBarImageType, AutoRefreshSections = previous.AutoRefreshSections, EnableRemoveContinueNextUp = previous.EnableRemoveContinueNextUp, EnableMyList = previous.EnableMyList, EnableSeriesInfo = previous.EnableSeriesInfo, InfiniteScrollLibraryIds = [.. previous.InfiniteScrollLibraryIds], EnableCollectionsOnDetailPage = previous.EnableCollectionsOnDetailPage, EnableEnhancedSearch = previous.EnableEnhancedSearch, EnableBreadcrumbs = previous.EnableBreadcrumbs,
            SectionOrder = [.. previous.SectionOrder],
            Sections = previous.Sections.Select(section => new HomeScreenSectionDefinition
            {
                Id = section.Id,
                Name = section.Name,
                Type = section.Type,
                SourceIds = [.. section.SourceIds],
                ItemIds = string.Equals(section.Id, normalizedId, StringComparison.Ordinal) && request.ItemIds is not null
                    ? request.ItemIds.Where(id => !string.IsNullOrWhiteSpace(id)).Distinct(StringComparer.Ordinal).ToList()
                    : [.. section.ItemIds],
                ContentOrder = string.Equals(section.Id, normalizedId, StringComparison.Ordinal)
                    ? normalizedOrder
                    : NormalizeContentOrder(section.ContentOrder),
                ArtSize = string.Equals(section.Id, normalizedId, StringComparison.Ordinal)
                    ? NormalizeArtSize(request.ArtSize)
                    : NormalizeArtSize(section.ArtSize),
                ArtType = string.Equals(section.Id, normalizedId, StringComparison.Ordinal)
                    ? NormalizeArtType(request.ArtType)
                    : NormalizeArtType(section.ArtType),
                ArtShape = string.Equals(section.Id, normalizedId, StringComparison.Ordinal)
                    ? NormalizeArtShape(request.ArtShape)
                    : NormalizeArtShape(section.ArtShape),
                ShowText = string.Equals(section.Id, normalizedId, StringComparison.Ordinal)
                    ? request.ShowText
                    : section.ShowText,
                Drafts = NormalizeSectionDrafts(section.Drafts),
                RotationIntervalMinutes = Math.Clamp(section.RotationIntervalMinutes, 1, 525600),
                RotationStartUnixMilliseconds = Math.Max(0, section.RotationStartUnixMilliseconds),
                IsApplied = string.Equals(section.Id, normalizedId, StringComparison.Ordinal) || section.IsApplied,
            }).ToList(),
        };

        UpdateConfiguration(configuration);
        return configuration;
    }

    /// <summary>Updates the independently switchable browser enhancements.</summary>
    public PluginConfiguration UpdateMainSettings(MainSettingsRequest request)
    {
        var previous = Configuration;
        var configuration = new PluginConfiguration
        {
            JellyfinSectionLabelColor = previous.JellyfinSectionLabelColor, ManagerSectionLabelColor = previous.ManagerSectionLabelColor,
            AbyssAccentColor = previous.AbyssAccentColor, AbyssRadius = previous.AbyssRadius, AbyssIndicatorColor = previous.AbyssIndicatorColor,
            AbyssFontImportUrl = previous.AbyssFontImportUrl, AbyssFontFamily = previous.AbyssFontFamily, AbyssLiteMode = previous.AbyssLiteMode,
            HeaderTabsColorMode = previous.HeaderTabsColorMode, HeaderTabsColorOne = previous.HeaderTabsColorOne, HeaderTabsColorTwo = previous.HeaderTabsColorTwo,
            PlayButtonColorMode = previous.PlayButtonColorMode, PlayButtonColorOne = previous.PlayButtonColorOne, PlayButtonColorTwo = previous.PlayButtonColorTwo,
            ProgressColorMode = previous.ProgressColorMode, ProgressColorOne = previous.ProgressColorOne, ProgressColorTwo = previous.ProgressColorTwo,
            SidebarIconColorMode = previous.SidebarIconColorMode, SidebarIconColorOne = previous.SidebarIconColorOne, SidebarIconColorTwo = previous.SidebarIconColorTwo,
            MyListHeartColorMode = previous.MyListHeartColorMode, MyListHeartColorOne = previous.MyListHeartColorOne, MyListHeartColorTwo = previous.MyListHeartColorTwo,
            LogoImageDataUrl = previous.LogoImageDataUrl, MediaBarIntervalSeconds = previous.MediaBarIntervalSeconds, MediaBarImageType = previous.MediaBarImageType,
            AutoRefreshSections = request.AutoRefreshSections,
            EnableRemoveContinueNextUp = request.EnableRemoveContinueNextUp,
            EnableMyList = request.EnableMyList,
            EnableSeriesInfo = request.EnableSeriesInfo,
            InfiniteScrollLibraryIds = (request.InfiniteScrollLibraryIds ?? []).Where(id => !string.IsNullOrWhiteSpace(id)).Distinct(StringComparer.Ordinal).ToList(),
            EnableCollectionsOnDetailPage = request.EnableCollectionsOnDetailPage,
            EnableEnhancedSearch = request.EnableEnhancedSearch,
            EnableBreadcrumbs = request.EnableBreadcrumbs,
            SectionOrder = [.. previous.SectionOrder],
            Sections = previous.Sections,
        };
        UpdateConfiguration(configuration);
        return configuration;
    }

    private static string NormalizeColorMode(string? value) => value switch { "vertical-gradient" => "vertical-gradient", "horizontal-gradient" => "horizontal-gradient", "center-gradient" => "center-gradient", _ => "solid" };

    private static string NormalizeColor(string? value, string fallback) => System.Text.RegularExpressions.Regex.IsMatch(value ?? string.Empty, "^#[0-9a-fA-F]{6}$") ? value! : fallback;

    private static string NormalizeMediaBarImageType(string? value) => value switch { "primary" => "primary", "banner" => "banner", "thumb" => "thumb", _ => "backdrop" };

    private static List<HomeScreenSectionDraft> NormalizeSectionDrafts(IEnumerable<HomeScreenSectionDraft>? drafts)
    {
        return (drafts ?? [])
            .Where(draft => !string.IsNullOrWhiteSpace(draft.Id)
                && !string.IsNullOrWhiteSpace(draft.SourceId)
                && (string.Equals(draft.SourceType, "collection", StringComparison.Ordinal)
                    || string.Equals(draft.SourceType, "tag", StringComparison.Ordinal)))
            .GroupBy(draft => draft.Id, StringComparer.Ordinal)
            .Select(group => group.First())
            .Select(draft =>
            {
                var startMonth = Math.Clamp(draft.StartMonth, 1, 12);
                var endMonth = Math.Clamp(draft.EndMonth, 1, 12);
                return new HomeScreenSectionDraft
                {
                    Id = draft.Id.Trim(),
                    SourceType = draft.SourceType,
                    SourceId = draft.SourceId.Trim(),
                    Name = (draft.Name ?? string.Empty).Trim(),
                    StartMonth = startMonth,
                    StartDay = Math.Clamp(draft.StartDay, 1, DateTime.DaysInMonth(2000, startMonth)),
                    EndMonth = endMonth,
                    EndDay = Math.Clamp(draft.EndDay, 1, DateTime.DaysInMonth(2000, endMonth)),
                };
            })
            .ToList();
    }

    private static string NormalizeImageDataUrl(string? value)
    {
        var image = (value ?? string.Empty).Trim();
        if (image.Length == 0) return string.Empty;
        if (image.Length > 4_000_000) return string.Empty;
        return System.Text.RegularExpressions.Regex.IsMatch(image, "^data:image/(?:png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$") ? image : string.Empty;
    }

    private static string NormalizeArtSize(string? artSize)
    {
        return artSize switch
        {
            "extra-small" => "extra-small",
            "small" => "small",
            "large" => "large",
            "extra-large" => "extra-large",
            _ => "medium",
        };
    }

    private static string NormalizeArtType(string? artType)
    {
        return artType switch
        {
            "primary" => "primary",
            "art" => "art",
            "backdrop" => "backdrop",
            "banner" => "banner",
            "logo" => "logo",
            "thumb" => "thumb",
            "disc" => "disc",
            "box" => "box",
            "box-rear" => "box-rear",
            "screenshot" => "screenshot",
            "menu" => "menu",
            "chapter" => "chapter",
            _ => "automatic",
        };
    }

    private static string NormalizeArtShape(string? artShape)
    {
        return artShape switch
        {
            "wide" => "wide",
            "square" => "square",
            "circle" => "circle",
            _ => "poster",
        };
    }

    private static string NormalizeContentOrder(string? contentOrder)
    {
        return contentOrder switch
        {
            "title-descending" => "title-descending",
            "release-date-ascending" => "release-date-ascending",
            "release-date-descending" => "release-date-descending",
            "date-added-descending" => "date-added-descending",
            "date-added-ascending" => "date-added-ascending",
            "rating-descending" => "rating-descending",
            "manual" => "manual",
            _ => "title-ascending",
        };
    }

    /// <inheritdoc />
    public IEnumerable<PluginPageInfo> GetPages()
    {
        yield return new PluginPageInfo
        {
            Name = Name,
            DisplayName = Name,
            EnableInMainMenu = true,
            EmbeddedResourcePath = "Jellyfin.Plugin.HomeScreenSectionsManager.Configuration.configPage.html",
        };
    }
}
