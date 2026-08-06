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
                    IsApplied = section.IsApplied,
                })
                .ToList(),
        };

        UpdateConfiguration(configuration);
        return configuration;
    }

    /// <summary>Saves the final ordering selected for one completed home-screen section.</summary>
    public PluginConfiguration UpdateSectionContentOrder(string sectionId, string contentOrder)
    {
        var previous = Configuration;
        var normalizedId = sectionId?.Trim() ?? string.Empty;
        var normalizedOrder = NormalizeContentOrder(contentOrder);
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
            SectionOrder = [.. previous.SectionOrder],
            Sections = previous.Sections.Select(section => new HomeScreenSectionDefinition
            {
                Id = section.Id,
                Name = section.Name,
                Type = section.Type,
                SourceIds = [.. section.SourceIds],
                ItemIds = [.. section.ItemIds],
                ContentOrder = string.Equals(section.Id, normalizedId, StringComparison.Ordinal)
                    ? normalizedOrder
                    : NormalizeContentOrder(section.ContentOrder),
                IsApplied = string.Equals(section.Id, normalizedId, StringComparison.Ordinal) || section.IsApplied,
            }).ToList(),
        };

        UpdateConfiguration(configuration);
        return configuration;
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
