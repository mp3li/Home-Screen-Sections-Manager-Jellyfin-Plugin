using MediaBrowser.Model.Plugins;

namespace Jellyfin.Plugin.HomeScreenSectionsManager.Configuration;

/// <summary>Configuration persisted by Jellyfin for Home Screen Manager.</summary>
public sealed class PluginConfiguration : BasePluginConfiguration
{
    /// <summary>Gets or sets the dashboard label color for native Jellyfin sections.</summary>
    public string JellyfinSectionLabelColor { get; set; } = "#00a4dc";

    /// <summary>Gets or sets the dashboard label color for plugin-created sections.</summary>
    public string ManagerSectionLabelColor { get; set; } = "#aa5cc3";

    /// <summary>Gets or sets the dashboard label color for the media-bar badge.</summary>
    public string MediaBarSectionLabelColor { get; set; } = "#c78000";

    public string AbyssAccentColor { get; set; } = "#f5f5f7";

    public int AbyssRadius { get; set; } = 24;

    public string AbyssIndicatorColor { get; set; } = "#373737";

    public string AbyssFontImportUrl { get; set; } = string.Empty;

    public string AbyssFontFamily { get; set; } = string.Empty;

    public bool AbyssLiteMode { get; set; }

    public string HeaderTabsColorMode { get; set; } = "solid";

    public string HeaderTabsColorOne { get; set; } = "#f5f5f7";

    public string HeaderTabsColorTwo { get; set; } = "#f5f5f7";

    public string SelectedHeaderTabTextColor { get; set; } = "#121212";

    public string PlayButtonColorMode { get; set; } = "solid";

    public string PlayButtonColorOne { get; set; } = "#f5f5f7";

    public string PlayButtonColorTwo { get; set; } = "#f5f5f7";

    public string ProgressColorMode { get; set; } = "solid";

    public string ProgressColorOne { get; set; } = "#f5f5f7";

    public string ProgressColorTwo { get; set; } = "#f5f5f7";

    public string SidebarIconColorMode { get; set; } = "solid";

    public string SidebarIconColorOne { get; set; } = "#f5f5f7";

    public string SidebarIconColorTwo { get; set; } = "#f5f5f7";

    public string MyListHeartColorMode { get; set; } = "solid";

    public string MyListHeartColorOne { get; set; } = "#f5f5f7";

    public string MyListHeartColorTwo { get; set; } = "#f5f5f7";

    public string LogoImageDataUrl { get; set; } = string.Empty;

    public int MediaBarIntervalSeconds { get; set; } = 5;

    public string MediaBarImageType { get; set; } = "abyss-original";

    public bool EnableMediaBarSlowZoom { get; set; } = true;

    public bool AutoRefreshSections { get; set; }

    public bool EnableRemoveContinueNextUp { get; set; }

    public bool EnableMyList { get; set; }

    /// <summary>Gets or sets whether Jellyfin's Favorites top-navigation page is hidden.</summary>
    public bool HideFavorites { get; set; }

    public bool EnableSeriesInfo { get; set; }

    public List<string> InfiniteScrollLibraryIds { get; set; } = [];

    public bool EnableCollectionsOnDetailPage { get; set; }

    public bool EnableEnhancedSearch { get; set; }

    public bool EnableBreadcrumbs { get; set; }

    public bool EnableTitleMarquee { get; set; } = true;

    /// <summary>Gets or sets the saved plugin-created home screen sections.</summary>
    public List<HomeScreenSectionDefinition> Sections { get; set; } = [];

    /// <summary>Gets or sets the saved hybrid order, containing native anchors and plugin section ids.</summary>
    public List<string> SectionOrder { get; set; } = [];

    /// <summary>Gets or sets the plugin-owned top-navigation pages, including the optional My List page.</summary>
    public List<HomeScreenPageDefinition> Pages { get; set; } = [];

    /// <summary>Gets or sets the top-navigation page order. A hidden: prefix stores page visibility.</summary>
    public List<string> PageOrder { get; set; } = [];

    /// <summary>Gets or sets the independent section order for each top-navigation page.</summary>
    public List<HomeScreenPageLayoutDefinition> PageLayouts { get; set; } = [];
}

/// <summary>A plugin-owned top-navigation home-screen page.</summary>
public sealed class HomeScreenPageDefinition
{
    /// <summary>Gets or sets the stable browser-created identifier.</summary>
    public string Id { get; set; } = string.Empty;

    /// <summary>Gets or sets the page title.</summary>
    public string Name { get; set; } = string.Empty;
}

/// <summary>The saved section ordering for one top-navigation page.</summary>
public sealed class HomeScreenPageLayoutDefinition
{
    /// <summary>Gets or sets the page identifier.</summary>
    public string PageId { get; set; } = "home";

    /// <summary>Gets or sets the section order. A hidden: prefix stores section visibility.</summary>
    public List<string> SectionOrder { get; set; } = [];
}

/// <summary>A saved custom home screen section and its selected source content.</summary>
public sealed class HomeScreenSectionDefinition
{
    /// <summary>Gets or sets the stable browser-created identifier.</summary>
    public string Id { get; set; } = string.Empty;

    /// <summary>Gets or sets the display name.</summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>Gets or sets the top-navigation page that owns this section.</summary>
    public string PageId { get; set; } = "home";

    /// <summary>Gets or sets the selected section type.</summary>
    public string Type { get; set; } = string.Empty;

    /// <summary>Gets or sets selected collection, library, or tag source identifiers.</summary>
    public List<string> SourceIds { get; set; } = [];

    /// <summary>Gets or sets selected manual media item identifiers.</summary>
    public List<string> ItemIds { get; set; } = [];

    /// <summary>Gets or sets the selected ordering applied to the section's displayed content.</summary>
    public string ContentOrder { get; set; } = "title-ascending";

    /// <summary>Gets or sets the selected home-screen art size.</summary>
    public string ArtSize { get; set; } = "medium";

    /// <summary>Gets or sets the selected Jellyfin image type.</summary>
    public string ArtType { get; set; } = "automatic";

    /// <summary>Gets or sets the selected art shape.</summary>
    public string ArtShape { get; set; } = "poster";

    /// <summary>Gets or sets whether item text is displayed under the art.</summary>
    public bool ShowText { get; set; } = true;

    /// <summary>Gets or sets whether this saved section is rendered on its page.</summary>
    public bool IsVisible { get; set; } = true;

    /// <summary>Gets or sets whether this section also supplies an Abyss media bar.</summary>
    public bool IsMediaBar { get; set; }


    /// <summary>Gets or sets how many IMDb-tagged items the Top section displays.</summary>
    public int DisplayTopCount { get; set; } = 10;

    /// <summary>Gets or sets whether oversized ranking numbers are visible.</summary>
    public bool ShowRankNumbers { get; set; } = true;

    public string RankNumberColorMode { get; set; } = "solid";

    public string RankNumberColorOne { get; set; } = "#f5f5f7";

    public string RankNumberColorTwo { get; set; } = "#f5f5f7";

    /// <summary>Gets or sets the drop-shadow color used behind ranking numbers.</summary>
    public string RankNumberShadowColor { get; set; } = "#000000";

    /// <summary>Gets or sets an optional TTF or OTF data URL used by ranking numbers.</summary>
    public string RankNumberFontDataUrl { get; set; } = string.Empty;

    /// <summary>Gets or sets the maximum number of cross-user activity items displayed.</summary>
    public int ActivityMaxItems { get; set; } = 20;

    /// <summary>Gets or sets the selected cross-user activity media group.</summary>
    public string ActivityMediaType { get; set; } = "movies";

    /// <summary>Gets or sets the ordered source drafts used by rotating and seasonal sections.</summary>
    public List<HomeScreenSectionDraft> Drafts { get; set; } = [];

    /// <summary>Gets or sets the rotating section interval in minutes.</summary>
    public int RotationIntervalMinutes { get; set; } = 1440;

    /// <summary>Gets or sets when the current rotating draft sequence began.</summary>
    public long RotationStartUnixMilliseconds { get; set; }

    /// <summary>Gets or sets whether the completed section has been added to the home screen.</summary>
    public bool IsApplied { get; set; }
}

/// <summary>One collection, library, or tag source within a rotating or seasonal section.</summary>
public sealed class HomeScreenSectionDraft
{
    /// <summary>Gets or sets the stable browser-created draft identifier.</summary>
    public string Id { get; set; } = string.Empty;

    /// <summary>Gets or sets whether this draft uses a collection, library, or metadata tag.</summary>
    public string SourceType { get; set; } = string.Empty;

    /// <summary>Gets or sets the collection id, library id, or encoded library, metadata type, and tag value.</summary>
    public string SourceId { get; set; } = string.Empty;

    /// <summary>Gets or sets the source name displayed in the Dashboard draft list.</summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>Gets or sets the first month when a seasonal draft is active.</summary>
    public int StartMonth { get; set; } = 1;

    /// <summary>Gets or sets the first day when a seasonal draft is active.</summary>
    public int StartDay { get; set; } = 1;

    /// <summary>Gets or sets the last month when a seasonal draft is active.</summary>
    public int EndMonth { get; set; } = 12;

    /// <summary>Gets or sets the last day when a seasonal draft is active.</summary>
    public int EndDay { get; set; } = 31;
}

/// <summary>Request body used to replace only Home Screen Manager-owned settings.</summary>
public sealed class SectionSettingsRequest
{
    /// <summary>Gets or sets the native Jellyfin label color.</summary>
    public string JellyfinSectionLabelColor { get; set; } = "#00a4dc";

    /// <summary>Gets or sets the plugin section label color.</summary>
    public string ManagerSectionLabelColor { get; set; } = "#aa5cc3";

    /// <summary>Gets or sets the dashboard label color for the media-bar badge.</summary>
    public string MediaBarSectionLabelColor { get; set; } = "#c78000";

    /// <summary>Gets or sets custom sections.</summary>
    public List<HomeScreenSectionDefinition> Sections { get; set; } = [];

    /// <summary>Gets or sets the hybrid row order.</summary>
    public List<string> SectionOrder { get; set; } = [];

    /// <summary>Gets or sets plugin-owned pages.</summary>
    public List<HomeScreenPageDefinition>? Pages { get; set; }

    /// <summary>Gets or sets the top-navigation page order.</summary>
    public List<string>? PageOrder { get; set; }

    /// <summary>Gets or sets the independent section orders for all pages.</summary>
    public List<HomeScreenPageLayoutDefinition>? PageLayouts { get; set; }
}
/// <summary>Saved Abyss CSS generator settings.</summary>
public sealed class CustomizationSettingsRequest
{
    /// <summary>Gets or sets the Abyss accent color as a six-digit HTML color.</summary>
    public string AbyssAccentColor { get; set; } = "#f5f5f7";

    /// <summary>Gets or sets global Abyss corner rounding in pixels.</summary>
    public int AbyssRadius { get; set; } = 24;

    /// <summary>Gets or sets the Abyss indicator-pill color as a six-digit HTML color.</summary>
    public string AbyssIndicatorColor { get; set; } = "#373737";

    /// <summary>Gets or sets an optional web-font stylesheet URL.</summary>
    public string AbyssFontImportUrl { get; set; } = string.Empty;

    /// <summary>Gets or sets an optional CSS font family.</summary>
    public string AbyssFontFamily { get; set; } = string.Empty;

    /// <summary>Gets or sets whether the supported Abyss Lite override is imported.</summary>
    public bool AbyssLiteMode { get; set; }

    public string HeaderTabsColorMode { get; set; } = "solid";

    public string HeaderTabsColorOne { get; set; } = "#f5f5f7";

    public string HeaderTabsColorTwo { get; set; } = "#f5f5f7";

    public string SelectedHeaderTabTextColor { get; set; } = "#121212";

    public string PlayButtonColorMode { get; set; } = "solid";

    public string PlayButtonColorOne { get; set; } = "#f5f5f7";

    public string PlayButtonColorTwo { get; set; } = "#f5f5f7";

    public string ProgressColorMode { get; set; } = "solid";

    public string ProgressColorOne { get; set; } = "#f5f5f7";

    public string ProgressColorTwo { get; set; } = "#f5f5f7";

    public string SidebarIconColorMode { get; set; } = "solid";

    public string SidebarIconColorOne { get; set; } = "#f5f5f7";

    public string SidebarIconColorTwo { get; set; } = "#f5f5f7";

    public string MyListHeartColorMode { get; set; } = "solid";

    public string MyListHeartColorOne { get; set; } = "#f5f5f7";

    public string MyListHeartColorTwo { get; set; } = "#f5f5f7";

    public string LogoImageDataUrl { get; set; } = string.Empty;

    public int MediaBarIntervalSeconds { get; set; } = 5;

    public string MediaBarImageType { get; set; } = "abyss-original";

    public bool EnableMediaBarSlowZoom { get; set; } = true;
}

/// <summary>Request body for browser enhancement settings.</summary>
public sealed class MainSettingsRequest
{
    public bool AutoRefreshSections { get; set; }

    public bool EnableRemoveContinueNextUp { get; set; }

    public bool EnableMyList { get; set; }

    public bool HideFavorites { get; set; }

    public bool EnableSeriesInfo { get; set; }

    public List<string> InfiniteScrollLibraryIds { get; set; } = [];

    public bool EnableCollectionsOnDetailPage { get; set; }

    public bool EnableEnhancedSearch { get; set; }

    public bool EnableBreadcrumbs { get; set; }

    public bool EnableTitleMarquee { get; set; } = true;
}

/// <summary>Request body used when the administrator adds one completed section to the home screen.</summary>
public sealed class ApplySectionRequest
{
    /// <summary>Gets or sets the administrator-defined section title.</summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>Gets or sets the selected content ordering.</summary>
    public string ContentOrder { get; set; } = "title-ascending";

    /// <summary>Gets or sets the item identifiers in their final manual order.</summary>
    public List<string>? ItemIds { get; set; }

    /// <summary>Gets or sets the selected home-screen art size.</summary>
    public string ArtSize { get; set; } = "medium";

    /// <summary>Gets or sets the selected Jellyfin image type.</summary>
    public string ArtType { get; set; } = "automatic";

    /// <summary>Gets or sets the selected art shape.</summary>
    public string ArtShape { get; set; } = "poster";

    /// <summary>Gets or sets whether item text is displayed under the art.</summary>
    public bool ShowText { get; set; } = true;

    public bool IsVisible { get; set; } = true;

    public bool IsMediaBar { get; set; }

    public int DisplayTopCount { get; set; } = 10;

    public bool ShowRankNumbers { get; set; } = true;

    public string RankNumberColorMode { get; set; } = "solid";

    public string RankNumberColorOne { get; set; } = "#f5f5f7";

    public string RankNumberColorTwo { get; set; } = "#f5f5f7";

    public string RankNumberShadowColor { get; set; } = "#000000";

    public string RankNumberFontDataUrl { get; set; } = string.Empty;

    public int ActivityMaxItems { get; set; } = 20;

    public string ActivityMediaType { get; set; } = "movies";
}
