using MediaBrowser.Model.Plugins;

namespace Jellyfin.Plugin.HomeScreenSectionsManager.Configuration;

/// <summary>Configuration persisted by Jellyfin for Home Screen Sections Manager.</summary>
public sealed class PluginConfiguration : BasePluginConfiguration
{
    /// <summary>Gets or sets the dashboard label color for native Jellyfin sections.</summary>
    public string JellyfinSectionLabelColor { get; set; } = "#00a4dc";

    /// <summary>Gets or sets the dashboard label color for plugin-created sections.</summary>
    public string ManagerSectionLabelColor { get; set; } = "#aa5cc3";

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
}

/// <summary>Request body used to replace only Home Screen Sections Manager-owned settings.</summary>
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
