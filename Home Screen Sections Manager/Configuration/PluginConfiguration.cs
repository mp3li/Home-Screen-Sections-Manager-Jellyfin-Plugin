using MediaBrowser.Model.Plugins;

namespace Jellyfin.Plugin.HomeScreenSectionsManager.Configuration;

/// <summary>Configuration persisted by Jellyfin for Home Screen Manager.</summary>
public sealed class PluginConfiguration : BasePluginConfiguration
{
    /// <summary>Gets or sets the dashboard label color for native Jellyfin sections.</summary>
    public string JellyfinSectionLabelColor { get; set; } = "#00a4dc";

    /// <summary>Gets or sets the dashboard label color for plugin-created sections.</summary>
    public string ManagerSectionLabelColor { get; set; } = "#aa5cc3";

    public string AbyssAccentColor { get; set; } = "#f5f5f7";

    public int AbyssRadius { get; set; } = 24;

    public string AbyssIndicatorColor { get; set; } = "#373737";

    public string AbyssFontImportUrl { get; set; } = string.Empty;

    public string AbyssFontFamily { get; set; } = string.Empty;

    public bool AbyssLiteMode { get; set; }

    /// <summary>Gets or sets the saved plugin-created home screen sections.</summary>
    public List<HomeScreenSectionDefinition> Sections { get; set; } = [];

    /// <summary>Gets or sets the saved hybrid order, containing native anchors and plugin section ids.</summary>
    public List<string> SectionOrder { get; set; } = [];
}

/// <summary>A saved custom home screen section and its selected source content.</summary>
public sealed class HomeScreenSectionDefinition
{
    /// <summary>Gets or sets the stable browser-created identifier.</summary>
    public string Id { get; set; } = string.Empty;

    /// <summary>Gets or sets the display name.</summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>Gets or sets the selected section type.</summary>
    public string Type { get; set; } = string.Empty;

    /// <summary>Gets or sets selected collection, library, or tag source identifiers.</summary>
    public List<string> SourceIds { get; set; } = [];

    /// <summary>Gets or sets selected manual media item identifiers.</summary>
    public List<string> ItemIds { get; set; } = [];

    /// <summary>Gets or sets the selected ordering applied to the section's displayed content.</summary>
    public string ContentOrder { get; set; } = "title-ascending";

    /// <summary>Gets or sets whether the completed section has been added to the home screen.</summary>
    public bool IsApplied { get; set; }
}

/// <summary>Request body used to replace only Home Screen Manager-owned settings.</summary>
public sealed class SectionSettingsRequest
{
    /// <summary>Gets or sets the native Jellyfin label color.</summary>
    public string JellyfinSectionLabelColor { get; set; } = "#00a4dc";

    /// <summary>Gets or sets the plugin section label color.</summary>
    public string ManagerSectionLabelColor { get; set; } = "#aa5cc3";

    /// <summary>Gets or sets custom sections.</summary>
    public List<HomeScreenSectionDefinition> Sections { get; set; } = [];

    /// <summary>Gets or sets the hybrid row order.</summary>
    public List<string> SectionOrder { get; set; } = [];
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
}

/// <summary>Request body used when the administrator adds one completed section to the home screen.</summary>
public sealed class ApplySectionRequest
{
    /// <summary>Gets or sets the selected content ordering.</summary>
    public string ContentOrder { get; set; } = "title-ascending";

    /// <summary>Gets or sets the item identifiers in their final manual order.</summary>
    public List<string> ItemIds { get; set; } = [];
}
