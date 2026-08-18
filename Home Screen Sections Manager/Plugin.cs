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
        var configuration = CloneConfiguration(Configuration);
        configuration.JellyfinSectionLabelColor = NormalizeColor(request.JellyfinSectionLabelColor, "#00a4dc");
        configuration.ManagerSectionLabelColor = NormalizeColor(request.ManagerSectionLabelColor, "#aa5cc3");
        configuration.MediaBarSectionLabelColor = NormalizeColor(request.MediaBarSectionLabelColor, "#c78000");
        configuration.Pages = NormalizePages(request.Pages ?? Configuration.Pages);
        var validPageIds = configuration.Pages.Select(page => page.Id).Append("home").Append("favorites").ToHashSet(StringComparer.Ordinal);
        configuration.Sections = (request.Sections ?? [])
            .Where(section => !string.IsNullOrWhiteSpace(section.Id) && !string.IsNullOrWhiteSpace(section.Name) && !string.IsNullOrWhiteSpace(section.Type))
            .Where(section => validPageIds.Contains(string.IsNullOrWhiteSpace(section.PageId) ? "home" : section.PageId))
            .GroupBy(section => section.Id.Trim(), StringComparer.Ordinal)
            .Select(group => NormalizeSection(group.First(), validPageIds))
            .ToList();
        configuration.PageOrder = NormalizePageOrder(request.PageOrder ?? Configuration.PageOrder, configuration.Pages);
        configuration.HideFavorites = configuration.PageOrder.Any(value => string.Equals(value, "hidden:favorites", StringComparison.Ordinal));
        var requestedLayouts = request.PageLayouts ?? Configuration.PageLayouts;
        configuration.PageLayouts = NormalizePageLayouts(requestedLayouts, request.SectionOrder, validPageIds);
        configuration.SectionOrder = [.. configuration.PageLayouts.First(layout => string.Equals(layout.PageId, "home", StringComparison.Ordinal)).SectionOrder];

        UpdateConfiguration(configuration);
        return configuration;
    }

    /// <summary>Updates only the saved Abyss CSS generator settings.</summary>
    public PluginConfiguration UpdateCustomizationSettings(CustomizationSettingsRequest request)
    {
        var configuration = CloneConfiguration(Configuration);
        configuration.AbyssAccentColor = NormalizeColor(request.AbyssAccentColor, "#f5f5f7");
        configuration.AbyssRadius = Math.Clamp(request.AbyssRadius, 0, 64);
        configuration.AbyssIndicatorColor = NormalizeColor(request.AbyssIndicatorColor, "#373737");
        configuration.AbyssFontImportUrl = (request.AbyssFontImportUrl ?? string.Empty).Trim();
        configuration.AbyssFontFamily = (request.AbyssFontFamily ?? string.Empty).Trim();
        configuration.AbyssLiteMode = request.AbyssLiteMode;
        configuration.HeaderTabsColorMode = NormalizeColorMode(request.HeaderTabsColorMode);
        configuration.HeaderTabsColorOne = NormalizeColor(request.HeaderTabsColorOne, "#f5f5f7");
        configuration.HeaderTabsColorTwo = NormalizeColor(request.HeaderTabsColorTwo, "#f5f5f7");
        configuration.SelectedHeaderTabTextColor = NormalizeColor(request.SelectedHeaderTabTextColor, "#121212");
        configuration.PlayButtonColorMode = NormalizeColorMode(request.PlayButtonColorMode);
        configuration.PlayButtonColorOne = NormalizeColor(request.PlayButtonColorOne, "#f5f5f7");
        configuration.PlayButtonColorTwo = NormalizeColor(request.PlayButtonColorTwo, "#f5f5f7");
        configuration.ProgressColorMode = NormalizeColorMode(request.ProgressColorMode);
        configuration.ProgressColorOne = NormalizeColor(request.ProgressColorOne, "#f5f5f7");
        configuration.ProgressColorTwo = NormalizeColor(request.ProgressColorTwo, "#f5f5f7");
        configuration.SidebarIconColorMode = NormalizeColorMode(request.SidebarIconColorMode);
        configuration.SidebarIconColorOne = NormalizeColor(request.SidebarIconColorOne, "#f5f5f7");
        configuration.SidebarIconColorTwo = NormalizeColor(request.SidebarIconColorTwo, "#f5f5f7");
        configuration.MyListHeartColorMode = NormalizeColorMode(request.MyListHeartColorMode);
        configuration.MyListHeartColorOne = NormalizeColor(request.MyListHeartColorOne, "#f5f5f7");
        configuration.MyListHeartColorTwo = NormalizeColor(request.MyListHeartColorTwo, "#f5f5f7");
        configuration.LogoImageDataUrl = NormalizeImageDataUrl(request.LogoImageDataUrl);
        configuration.MediaBarIntervalSeconds = Math.Clamp(request.MediaBarIntervalSeconds, 1, 300);
        configuration.MediaBarImageType = NormalizeMediaBarImageType(request.MediaBarImageType);
        configuration.EnableMediaBarSlowZoom = request.EnableMediaBarSlowZoom;

        UpdateConfiguration(configuration);
        return configuration;
    }

    /// <summary>Saves the final ordering selected for one completed home-screen section.</summary>
    public PluginConfiguration ApplySection(string sectionId, ApplySectionRequest request)
    {
        var previous = Configuration;
        var normalizedId = sectionId?.Trim() ?? string.Empty;
        var normalizedOrder = NormalizeContentOrder(request.ContentOrder);
        var configuration = CloneConfiguration(previous);
        configuration.Sections = previous.Sections.Select(section => new HomeScreenSectionDefinition
            {
                Id = section.Id,
                Name = string.Equals(section.Id, normalizedId, StringComparison.Ordinal) && !string.IsNullOrWhiteSpace(request.Name)
                    ? request.Name.Trim()
                    : section.Name,
                PageId = section.PageId,
                Type = section.Type,
                SourceIds = [.. section.SourceIds],
                ItemIds = string.Equals(section.Id, normalizedId, StringComparison.Ordinal) && request.ItemIds is not null
                    ? request.ItemIds.Where(id => !string.IsNullOrWhiteSpace(id)).Distinct(StringComparer.Ordinal).ToList()
                    : [.. section.ItemIds],
                ContentOrder = string.Equals(section.Id, normalizedId, StringComparison.Ordinal)
                    ? string.Equals(section.Type, "top-10-50", StringComparison.Ordinal) ? "rating-descending" : normalizedOrder
                    : NormalizeContentOrder(section.ContentOrder),
                MaxItems = string.Equals(section.Id, normalizedId, StringComparison.Ordinal)
                    ? NormalizeMaxItems(request.MaxItems)
                    : NormalizeMaxItems(section.MaxItems),
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
                ShowSectionName = string.Equals(section.Id, normalizedId, StringComparison.Ordinal)
                    ? request.ShowSectionName
                    : section.ShowSectionName,
                IsVisible = string.Equals(section.Id, normalizedId, StringComparison.Ordinal)
                    ? request.IsVisible
                    : section.IsVisible,
                IsMediaBar = string.Equals(section.Id, normalizedId, StringComparison.Ordinal)
                    ? request.IsMediaBar
                    : section.IsMediaBar,
                DisplayTopCount = string.Equals(section.Id, normalizedId, StringComparison.Ordinal)
                    ? NormalizeDisplayTopCount(request.DisplayTopCount)
                    : NormalizeDisplayTopCount(section.DisplayTopCount),
                ShowRankNumbers = string.Equals(section.Id, normalizedId, StringComparison.Ordinal)
                    ? request.ShowRankNumbers
                    : section.ShowRankNumbers,
                RankNumberColorMode = string.Equals(section.Id, normalizedId, StringComparison.Ordinal)
                    ? NormalizeColorMode(request.RankNumberColorMode)
                    : NormalizeColorMode(section.RankNumberColorMode),
                RankNumberColorOne = string.Equals(section.Id, normalizedId, StringComparison.Ordinal)
                    ? NormalizeColor(request.RankNumberColorOne, "#f5f5f7")
                    : NormalizeColor(section.RankNumberColorOne, "#f5f5f7"),
                RankNumberColorTwo = string.Equals(section.Id, normalizedId, StringComparison.Ordinal)
                    ? NormalizeColor(request.RankNumberColorTwo, "#f5f5f7")
                    : NormalizeColor(section.RankNumberColorTwo, "#f5f5f7"),
                RankNumberShadowColor = string.Equals(section.Id, normalizedId, StringComparison.Ordinal)
                    ? NormalizeOptionalColor(request.RankNumberShadowColor)
                    : NormalizeOptionalColor(section.RankNumberShadowColor),
                RankNumberFontDataUrl = string.Equals(section.Id, normalizedId, StringComparison.Ordinal)
                    ? NormalizeFontDataUrl(request.RankNumberFontDataUrl)
                    : NormalizeFontDataUrl(section.RankNumberFontDataUrl),
                ActivityMaxItems = string.Equals(section.Id, normalizedId, StringComparison.Ordinal)
                    ? Math.Clamp(request.ActivityMaxItems, 1, 100)
                    : Math.Clamp(section.ActivityMaxItems, 1, 100),
                ActivityMediaType = string.Equals(section.Id, normalizedId, StringComparison.Ordinal)
                    ? NormalizeActivityMediaType(request.ActivityMediaType)
                    : NormalizeActivityMediaType(section.ActivityMediaType),
                Drafts = NormalizeSectionDrafts(section.Drafts),
                RotationIntervalMinutes = Math.Clamp(section.RotationIntervalMinutes, 1, 525600),
                RotationStartUnixMilliseconds = Math.Max(0, section.RotationStartUnixMilliseconds),
                IsApplied = string.Equals(section.Id, normalizedId, StringComparison.Ordinal) || section.IsApplied,
            }).ToList();

        var appliedSection = configuration.Sections.FirstOrDefault(section => string.Equals(section.Id, normalizedId, StringComparison.Ordinal));
        if (appliedSection is not null && string.Equals(appliedSection.Type, "top-10-50", StringComparison.Ordinal) && !string.IsNullOrWhiteSpace(request.Name) && appliedSection.Drafts.Count > 0)
        {
            appliedSection.Drafts[0].Name = request.Name.Trim();
        }

        UpdateConfiguration(configuration);
        return configuration;
    }

    /// <summary>Updates the independently switchable browser enhancements.</summary>
    public PluginConfiguration UpdateMainSettings(MainSettingsRequest request)
    {
        var configuration = CloneConfiguration(Configuration);
        configuration.AutoRefreshSections = request.AutoRefreshSections;
        configuration.EnableRemoveContinueNextUp = request.EnableRemoveContinueNextUp;
        configuration.EnableMyList = request.EnableMyList;
        configuration.HideFavorites = request.HideFavorites;
        configuration.EnableSeriesInfo = request.EnableSeriesInfo;
        configuration.InfiniteScrollLibraryIds = (request.InfiniteScrollLibraryIds ?? []).Where(id => !string.IsNullOrWhiteSpace(id)).Distinct(StringComparer.Ordinal).ToList();
        configuration.EnableCollectionsOnDetailPage = request.EnableCollectionsOnDetailPage;
        configuration.EnableEnhancedSearch = request.EnableEnhancedSearch;
        configuration.EnableBreadcrumbs = request.EnableBreadcrumbs;
        configuration.EnableTitleMarquee = request.EnableTitleMarquee;
        configuration.TitleMarqueeSpeed = NormalizeTitleMarqueeSpeed(request.TitleMarqueeSpeed);
        if (request.EnableMyList && !configuration.Pages.Any(page => string.Equals(page.Id, "my-list", StringComparison.Ordinal)))
        {
            configuration.Pages.Insert(0, new HomeScreenPageDefinition { Id = "my-list", Name = "My List" });
        }

        configuration.PageOrder = SetPageVisibility(NormalizePageOrder(configuration.PageOrder, configuration.Pages), "favorites", !request.HideFavorites);
        configuration.PageOrder = NormalizePageOrder(configuration.PageOrder, configuration.Pages);
        UpdateConfiguration(configuration);
        return configuration;
    }

    /// <summary>Updates the independently rendered global navigation Top Row.</summary>
    public PluginConfiguration UpdateTopRowSettings(TopRowSettingsRequest request)
    {
        var configuration = CloneConfiguration(Configuration);
        var validPageIds = configuration.Pages.Select(page => page.Id).Append("home").Append("favorites").ToHashSet(StringComparer.Ordinal);
        var requestedMessagePages = request.TopRowMessagePageIds ?? ["home"];
        configuration.TopRowMessagePageIds = requestedMessagePages
            .Where(validPageIds.Contains)
            .Distinct(StringComparer.Ordinal)
            .ToList();
        if (configuration.TopRowMessagePageIds.Count == 0)
        {
            configuration.TopRowMessagePageIds.Add("home");
        }

        var savedRows = GetEffectiveTopRows(configuration);
        var hasSubmittedRows = request.TopRows is { Count: > 0 };
        var legacyMain = new TopRowDefinition
        {
            Id = "main-top-row",
            Name = "Main Top Row",
            IsMain = true,
            EnableTopRow = hasSubmittedRows ? request.EnableTopRow : configuration.EnableTopRow,
            Persistent = hasSubmittedRows ? request.TopRowPersistent : configuration.TopRowPersistent,
            LogoShadowColor = hasSubmittedRows ? request.TopRowLogoShadowColor : configuration.TopRowLogoShadowColor,
            Section = hasSubmittedRows ? request.TopRowSection ?? new HomeScreenSectionDefinition() : configuration.TopRowSection ?? new HomeScreenSectionDefinition(),
        };
        configuration.TopRows = NormalizeTopRows(hasSubmittedRows ? request.TopRows : savedRows, legacyMain, validPageIds);
        var main = configuration.TopRows[0];
        configuration.EnableTopRow = main.EnableTopRow;
        configuration.TopRowPageIds = ["home"];
        configuration.TopRowAlwaysShow = true;
        configuration.TopRowPersistent = main.Persistent;
        configuration.TopRowLogoShadowColor = main.LogoShadowColor;
        configuration.TopRowSection = CloneSection(main.Section);
        configuration.MainTopRowLabelColor = NormalizeColor(request.MainTopRowLabelColor, "#aa5cc3");
        configuration.TopRowTargetLabelColor = NormalizeColor(request.TopRowTargetLabelColor, "#00a4dc");
        configuration.TopRowOverrideOnLabelColor = NormalizeColor(request.TopRowOverrideOnLabelColor, "#35a853");
        configuration.TopRowOverrideOffLabelColor = NormalizeColor(request.TopRowOverrideOffLabelColor, "#777777");
        configuration.EnableTopRowMessage = request.EnableTopRowMessage;
        configuration.TopRowMessageAlwaysShow = request.TopRowMessageAlwaysShow;
        configuration.TopRowMessagePersistent = request.TopRowMessagePersistent;
        configuration.TopRowMessageText = (request.TopRowMessageText ?? string.Empty).Trim();
        configuration.TopRowMessageFontDataUrl = NormalizeFontDataUrl(request.TopRowMessageFontDataUrl);
        configuration.TopRowMessageFontColor = NormalizeColor(request.TopRowMessageFontColor, "#ffffff");
        configuration.TopRowMessageFontShadowColor = NormalizeOptionalColor(request.TopRowMessageFontShadowColor);
        configuration.TopRowMessageBarColorMode = NormalizeColorMode(request.TopRowMessageBarColorMode);
        configuration.TopRowMessageBarColorOne = NormalizeColor(request.TopRowMessageBarColorOne, "#000000");
        configuration.TopRowMessageBarColorTwo = NormalizeColor(request.TopRowMessageBarColorTwo, "#333333");
        configuration.TopRowMessageMarqueeSpeed = NormalizeTitleMarqueeSpeed(request.TopRowMessageMarqueeSpeed);
        UpdateConfiguration(configuration);
        return configuration;
    }

    private static PluginConfiguration CloneConfiguration(PluginConfiguration source)
    {
        return new PluginConfiguration
        {
            JellyfinSectionLabelColor = source.JellyfinSectionLabelColor,
            ManagerSectionLabelColor = source.ManagerSectionLabelColor,
            MediaBarSectionLabelColor = source.MediaBarSectionLabelColor,
            AbyssAccentColor = source.AbyssAccentColor,
            AbyssRadius = source.AbyssRadius,
            AbyssIndicatorColor = source.AbyssIndicatorColor,
            AbyssFontImportUrl = source.AbyssFontImportUrl,
            AbyssFontFamily = source.AbyssFontFamily,
            AbyssLiteMode = source.AbyssLiteMode,
            HeaderTabsColorMode = source.HeaderTabsColorMode,
            HeaderTabsColorOne = source.HeaderTabsColorOne,
            HeaderTabsColorTwo = source.HeaderTabsColorTwo,
            SelectedHeaderTabTextColor = source.SelectedHeaderTabTextColor,
            PlayButtonColorMode = source.PlayButtonColorMode,
            PlayButtonColorOne = source.PlayButtonColorOne,
            PlayButtonColorTwo = source.PlayButtonColorTwo,
            ProgressColorMode = source.ProgressColorMode,
            ProgressColorOne = source.ProgressColorOne,
            ProgressColorTwo = source.ProgressColorTwo,
            SidebarIconColorMode = source.SidebarIconColorMode,
            SidebarIconColorOne = source.SidebarIconColorOne,
            SidebarIconColorTwo = source.SidebarIconColorTwo,
            MyListHeartColorMode = source.MyListHeartColorMode,
            MyListHeartColorOne = source.MyListHeartColorOne,
            MyListHeartColorTwo = source.MyListHeartColorTwo,
            LogoImageDataUrl = source.LogoImageDataUrl,
            MediaBarIntervalSeconds = source.MediaBarIntervalSeconds,
            MediaBarImageType = source.MediaBarImageType,
            EnableMediaBarSlowZoom = source.EnableMediaBarSlowZoom,
            AutoRefreshSections = source.AutoRefreshSections,
            EnableRemoveContinueNextUp = source.EnableRemoveContinueNextUp,
            EnableMyList = source.EnableMyList,
            HideFavorites = source.HideFavorites,
            EnableSeriesInfo = source.EnableSeriesInfo,
            InfiniteScrollLibraryIds = [.. source.InfiniteScrollLibraryIds],
            EnableCollectionsOnDetailPage = source.EnableCollectionsOnDetailPage,
            EnableEnhancedSearch = source.EnableEnhancedSearch,
            EnableBreadcrumbs = source.EnableBreadcrumbs,
            EnableTitleMarquee = source.EnableTitleMarquee,
            TitleMarqueeSpeed = NormalizeTitleMarqueeSpeed(source.TitleMarqueeSpeed),
            EnableTopRow = source.EnableTopRow,
            TopRowPageIds = [.. (source.TopRowPageIds ?? ["home"])],
            TopRowAlwaysShow = source.TopRowAlwaysShow,
            TopRowPersistent = source.TopRowPersistent,
            TopRowLogoShadowColor = NormalizeOptionalColor(source.TopRowLogoShadowColor),
            EnableTopRowMessage = source.EnableTopRowMessage,
            TopRowMessagePageIds = [.. (source.TopRowMessagePageIds ?? ["home"])],
            TopRowMessageAlwaysShow = source.TopRowMessageAlwaysShow,
            TopRowMessagePersistent = source.TopRowMessagePersistent,
            TopRowMessageText = source.TopRowMessageText,
            TopRowMessageFontDataUrl = NormalizeFontDataUrl(source.TopRowMessageFontDataUrl),
            TopRowMessageFontColor = NormalizeColor(source.TopRowMessageFontColor, "#ffffff"),
            TopRowMessageFontShadowColor = NormalizeOptionalColor(source.TopRowMessageFontShadowColor),
            TopRowMessageBarColorMode = NormalizeColorMode(source.TopRowMessageBarColorMode),
            TopRowMessageBarColorOne = NormalizeColor(source.TopRowMessageBarColorOne, "#000000"),
            TopRowMessageBarColorTwo = NormalizeColor(source.TopRowMessageBarColorTwo, "#333333"),
            TopRowMessageMarqueeSpeed = NormalizeTitleMarqueeSpeed(source.TopRowMessageMarqueeSpeed),
            MainTopRowLabelColor = NormalizeColor(source.MainTopRowLabelColor, "#aa5cc3"),
            TopRowTargetLabelColor = NormalizeColor(source.TopRowTargetLabelColor, "#00a4dc"),
            TopRowOverrideOnLabelColor = NormalizeColor(source.TopRowOverrideOnLabelColor, "#35a853"),
            TopRowOverrideOffLabelColor = NormalizeColor(source.TopRowOverrideOffLabelColor, "#777777"),
            TopRows = (source.TopRows ?? []).Select(CloneTopRow).ToList(),
            TopRowSection = CloneSection(source.TopRowSection ?? new HomeScreenSectionDefinition()),
            Sections = source.Sections.Select(CloneSection).ToList(),
            SectionOrder = [.. source.SectionOrder],
            Pages = source.Pages.Select(page => new HomeScreenPageDefinition { Id = page.Id, Name = page.Name }).ToList(),
            PageOrder = [.. source.PageOrder],
            PageLayouts = source.PageLayouts.Select(layout => new HomeScreenPageLayoutDefinition { PageId = layout.PageId, SectionOrder = [.. layout.SectionOrder] }).ToList(),
        };
    }

    private static HomeScreenSectionDefinition CloneSection(HomeScreenSectionDefinition section)
    {
        return new HomeScreenSectionDefinition
        {
            Id = section.Id,
            Name = section.Name,
            PageId = string.IsNullOrWhiteSpace(section.PageId) ? "home" : section.PageId,
            Type = section.Type,
            SourceIds = [.. section.SourceIds],
            ItemIds = [.. section.ItemIds],
            ContentOrder = section.ContentOrder,
            MaxItems = section.MaxItems,
            ArtSize = section.ArtSize,
            ArtType = section.ArtType,
            ArtShape = section.ArtShape,
            DisplayLogosOnly = section.DisplayLogosOnly,
            ShowText = section.ShowText,
            ShowSectionName = section.ShowSectionName,
            IsVisible = section.IsVisible,
            IsMediaBar = section.IsMediaBar,
            DisplayTopCount = section.DisplayTopCount,
            ShowRankNumbers = section.ShowRankNumbers,
            RankNumberColorMode = section.RankNumberColorMode,
            RankNumberColorOne = section.RankNumberColorOne,
            RankNumberColorTwo = section.RankNumberColorTwo,
            RankNumberShadowColor = section.RankNumberShadowColor,
            RankNumberFontDataUrl = section.RankNumberFontDataUrl,
            ActivityMaxItems = section.ActivityMaxItems,
            ActivityMediaType = section.ActivityMediaType,
            Drafts = NormalizeSectionDrafts(section.Drafts),
            RotationIntervalMinutes = section.RotationIntervalMinutes,
            RotationStartUnixMilliseconds = section.RotationStartUnixMilliseconds,
            IsApplied = section.IsApplied,
        };
    }

    /// <summary>Returns normalized Top Rows, migrating the former single-row settings when needed.</summary>
    public static List<TopRowDefinition> GetEffectiveTopRows(PluginConfiguration source)
    {
        var validPageIds = source.Pages.Select(page => page.Id).Append("home").Append("favorites").ToHashSet(StringComparer.Ordinal);
        var legacyMain = new TopRowDefinition
        {
            Id = "main-top-row",
            Name = "Main Top Row",
            IsMain = true,
            EnableTopRow = source.EnableTopRow,
            Persistent = source.TopRowPersistent,
            LogoShadowColor = source.TopRowLogoShadowColor,
            Section = source.TopRowSection ?? new HomeScreenSectionDefinition(),
        };
        return NormalizeTopRows(source.TopRows, legacyMain, validPageIds);
    }

    private static TopRowDefinition CloneTopRow(TopRowDefinition row)
    {
        return new TopRowDefinition
        {
            Id = row.Id,
            Name = row.Name,
            IsMain = row.IsMain,
            EnableTopRow = row.EnableTopRow,
            OverrideMainTopRow = row.OverrideMainTopRow,
            TargetType = row.TargetType,
            TargetId = row.TargetId,
            Persistent = row.Persistent,
            LogoShadowColor = row.LogoShadowColor,
            Section = CloneSection(row.Section ?? new HomeScreenSectionDefinition()),
        };
    }

    private static HomeScreenSectionDefinition NormalizeTopRowSection(HomeScreenSectionDefinition requested, string rowId, bool allowGenres)
    {
        var type = requested.Type is "libraries-in-a-row" || (allowGenres && requested.Type is "genres-in-a-row") ? requested.Type : "multiple-collections-in-a-row";
        // Top Row items are navigation sources as well as their explicit
        // display order. Older settings sometimes populated only one of the
        // two arrays, so retain the union instead of treating an empty
        // SourceIds array as permission to erase a populated ItemIds array.
        var sources = (requested.SourceIds ?? [])
            .Concat(requested.ItemIds ?? [])
            .Where(id => !string.IsNullOrWhiteSpace(id))
            .Distinct(StringComparer.Ordinal)
            .ToList();
        var requestedOrder = (requested.ItemIds ?? []).Where(sources.Contains).Distinct(StringComparer.Ordinal).ToList();
        sources.ForEach(id => { if (!requestedOrder.Contains(id, StringComparer.Ordinal)) requestedOrder.Add(id); });
        return new HomeScreenSectionDefinition
        {
            Id = "top-row-section-" + rowId,
            Name = "Top Row",
            PageId = "home",
            Type = type,
            SourceIds = sources,
            ItemIds = requestedOrder,
            ContentOrder = requested.ContentOrder is "title-ascending" or "title-descending" ? requested.ContentOrder : "manual",
            ArtSize = "extra-small",
            ArtType = NormalizeArtType(requested.ArtType),
            ArtShape = requested.ArtShape is "square" or "circle" ? requested.ArtShape : "wide",
            DisplayLogosOnly = requested.DisplayLogosOnly,
            ShowText = false,
            ShowSectionName = false,
            IsVisible = true,
            IsMediaBar = false,
            IsApplied = sources.Count > 0,
        };
    }

    private static List<TopRowDefinition> NormalizeTopRows(IEnumerable<TopRowDefinition>? requestedRows, TopRowDefinition legacyMain, ISet<string> validPageIds)
    {
        var requested = (requestedRows ?? []).Where(row => row is not null).ToList();
        var requestedMain = requested.FirstOrDefault(row => row.IsMain || string.Equals(row.Id, "main-top-row", StringComparison.Ordinal)) ?? legacyMain;
        // A stale Dashboard page used to be able to submit an empty Main Top
        // Row while saving the independently edited Marquee Message. Recover
        // from the still-populated legacy mirror instead of erasing a working
        // row and presenting an empty Top Row manager after reload.
        var requestedMainSection = requestedMain.Section ?? new HomeScreenSectionDefinition();
        var legacyMainSection = legacyMain.Section ?? new HomeScreenSectionDefinition();
        var recoverLegacyMain = !HasTopRowSources(requestedMainSection) && HasTopRowSources(legacyMainSection);
        var effectiveMain = recoverLegacyMain ? legacyMain : requestedMain;
        var main = new TopRowDefinition
        {
            Id = "main-top-row",
            Name = "Main Top Row",
            IsMain = true,
            EnableTopRow = effectiveMain.EnableTopRow,
            OverrideMainTopRow = false,
            TargetType = "main",
            TargetId = string.Empty,
            Persistent = effectiveMain.Persistent,
            LogoShadowColor = NormalizeOptionalColor(effectiveMain.LogoShadowColor),
            Section = NormalizeTopRowSection(effectiveMain.Section ?? new HomeScreenSectionDefinition(), "main-top-row", false),
        };
        var result = new List<TopRowDefinition> { main };
        var usedIds = new HashSet<string>(StringComparer.Ordinal) { main.Id };
        var usedTargets = new HashSet<string>(StringComparer.Ordinal);
        foreach (var row in requested.Where(row => !ReferenceEquals(row, requestedMain) && !row.IsMain && !string.Equals(row.Id, "main-top-row", StringComparison.Ordinal)))
        {
            var targetType = string.Equals(row.TargetType, "library", StringComparison.Ordinal) ? "library" : "page";
            var targetId = (row.TargetId ?? string.Empty).Trim();
            if (targetId.Length == 0 || (targetType == "page" && !validPageIds.Contains(targetId))) continue;
            var targetKey = targetType + ":" + targetId;
            if (!usedTargets.Add(targetKey)) continue;
            var id = (row.Id ?? string.Empty).Trim();
            if (id.Length == 0 || !usedIds.Add(id))
            {
                do id = "top-row-" + Guid.NewGuid().ToString("N"); while (!usedIds.Add(id));
            }
            result.Add(new TopRowDefinition
            {
                Id = id,
                Name = string.IsNullOrWhiteSpace(row.Name) ? "Top Row" : row.Name.Trim(),
                IsMain = false,
                EnableTopRow = row.EnableTopRow,
                OverrideMainTopRow = row.OverrideMainTopRow,
                TargetType = targetType,
                TargetId = targetId,
                Persistent = row.Persistent,
                LogoShadowColor = NormalizeOptionalColor(row.LogoShadowColor),
                Section = NormalizeTopRowSection(row.Section ?? new HomeScreenSectionDefinition(), id, targetType == "library"),
            });
        }
        return result;
    }

    private static bool HasTopRowSources(HomeScreenSectionDefinition section) =>
        (section.SourceIds?.Any(id => !string.IsNullOrWhiteSpace(id)) ?? false)
        || (section.ItemIds?.Any(id => !string.IsNullOrWhiteSpace(id)) ?? false);

    private static HomeScreenSectionDefinition NormalizeSection(HomeScreenSectionDefinition section, ISet<string> validPageIds)
    {
        var normalized = CloneSection(section);
        var pageId = section.PageId ?? string.Empty;
        normalized.Id = section.Id.Trim();
        normalized.Name = section.Name.Trim();
        normalized.PageId = validPageIds.Contains(pageId) ? pageId : "home";
        normalized.Type = section.Type.Trim();
        normalized.SourceIds = (section.SourceIds ?? []).Where(id => !string.IsNullOrWhiteSpace(id)).Distinct(StringComparer.Ordinal).ToList();
        normalized.ItemIds = (section.ItemIds ?? []).Where(id => !string.IsNullOrWhiteSpace(id)).Distinct(StringComparer.Ordinal).ToList();
        normalized.ContentOrder = string.Equals(normalized.Type, "top-10-50", StringComparison.Ordinal)
            ? "rating-descending"
            : NormalizeContentOrder(section.ContentOrder);
        normalized.MaxItems = NormalizeMaxItems(section.MaxItems);
        normalized.ArtSize = NormalizeArtSize(section.ArtSize);
        normalized.ArtType = NormalizeArtType(section.ArtType);
        normalized.ArtShape = NormalizeArtShape(section.ArtShape);
        normalized.DisplayTopCount = NormalizeDisplayTopCount(section.DisplayTopCount);
        normalized.RankNumberColorMode = NormalizeColorMode(section.RankNumberColorMode);
        normalized.RankNumberColorOne = NormalizeColor(section.RankNumberColorOne, "#f5f5f7");
        normalized.RankNumberColorTwo = NormalizeColor(section.RankNumberColorTwo, "#f5f5f7");
        normalized.RankNumberShadowColor = NormalizeOptionalColor(section.RankNumberShadowColor);
        normalized.RankNumberFontDataUrl = NormalizeFontDataUrl(section.RankNumberFontDataUrl);
        normalized.ActivityMaxItems = Math.Clamp(section.ActivityMaxItems, 1, 100);
        normalized.ActivityMediaType = NormalizeActivityMediaType(section.ActivityMediaType);
        normalized.RotationIntervalMinutes = Math.Clamp(section.RotationIntervalMinutes, 1, 525600);
        normalized.RotationStartUnixMilliseconds = Math.Max(0, section.RotationStartUnixMilliseconds);
        return normalized;
    }

    private static List<HomeScreenPageDefinition> NormalizePages(IEnumerable<HomeScreenPageDefinition>? pages)
    {
        return (pages ?? [])
            .Where(page => !string.IsNullOrWhiteSpace(page.Id) && !string.IsNullOrWhiteSpace(page.Name))
            .Where(page => !string.Equals(page.Id, "home", StringComparison.Ordinal) && !string.Equals(page.Id, "favorites", StringComparison.Ordinal))
            .GroupBy(page => page.Id.Trim(), StringComparer.Ordinal)
            .Select(group => group.First())
            .Select(page => new HomeScreenPageDefinition { Id = page.Id.Trim(), Name = page.Name.Trim() })
            .ToList();
    }

    private static List<string> NormalizePageOrder(IEnumerable<string>? values, IEnumerable<HomeScreenPageDefinition> pages)
    {
        var valid = pages.Select(page => page.Id).Append("home").Append("favorites").ToHashSet(StringComparer.Ordinal);
        var normalized = new List<string> { "home" };
        foreach (var value in values ?? [])
        {
            var raw = (value ?? string.Empty).Trim();
            var hidden = raw.StartsWith("hidden:", StringComparison.Ordinal);
            var id = hidden ? raw[7..] : raw;
            if (string.Equals(id, "home", StringComparison.Ordinal) || !valid.Contains(id) || normalized.Any(item => string.Equals(item.Replace("hidden:", string.Empty, StringComparison.Ordinal), id, StringComparison.Ordinal))) continue;
            normalized.Add(hidden ? "hidden:" + id : id);
        }

        if (!normalized.Any(value => value.EndsWith("favorites", StringComparison.Ordinal))) normalized.Add("favorites");
        foreach (var page in pages)
        {
            if (!normalized.Any(value => string.Equals(value.Replace("hidden:", string.Empty, StringComparison.Ordinal), page.Id, StringComparison.Ordinal))) normalized.Add(page.Id);
        }

        return normalized;
    }

    private static List<string> SetPageVisibility(List<string> order, string pageId, bool visible)
    {
        return order.Select(value =>
        {
            var id = value.StartsWith("hidden:", StringComparison.Ordinal) ? value[7..] : value;
            return string.Equals(id, pageId, StringComparison.Ordinal) && !visible ? "hidden:" + id : id;
        }).ToList();
    }

    private static List<HomeScreenPageLayoutDefinition> NormalizePageLayouts(IEnumerable<HomeScreenPageLayoutDefinition>? layouts, IEnumerable<string>? legacyHomeOrder, ISet<string> validPageIds)
    {
        var result = (layouts ?? [])
            .Where(layout => validPageIds.Contains(layout.PageId ?? string.Empty))
            .GroupBy(layout => layout.PageId, StringComparer.Ordinal)
            .Select(group => group.First())
            .Select(layout => new HomeScreenPageLayoutDefinition
            {
                PageId = layout.PageId,
                SectionOrder = (layout.SectionOrder ?? []).Where(value => !string.IsNullOrWhiteSpace(value)).Distinct(StringComparer.Ordinal).ToList(),
            })
            .ToList();
        var home = result.FirstOrDefault(layout => string.Equals(layout.PageId, "home", StringComparison.Ordinal));
        if (home is null)
        {
            result.Insert(0, new HomeScreenPageLayoutDefinition
            {
                PageId = "home",
                SectionOrder = (legacyHomeOrder ?? []).Where(value => !string.IsNullOrWhiteSpace(value)).Distinct(StringComparer.Ordinal).ToList(),
            });
        }

        foreach (var pageId in validPageIds.Where(id => !result.Any(layout => string.Equals(layout.PageId, id, StringComparison.Ordinal))))
        {
            result.Add(new HomeScreenPageLayoutDefinition { PageId = pageId });
        }

        return result;
    }

    private static string NormalizeColorMode(string? value) => value switch { "vertical-gradient" => "vertical-gradient", "horizontal-gradient" => "horizontal-gradient", "center-gradient" => "center-gradient", _ => "solid" };

    private static int NormalizeDisplayTopCount(int value) => value is 5 or 10 or 20 or 30 or 40 or 50 or 75 or 100 ? value : 10;

    private static int NormalizeMaxItems(int value) => value <= 0 ? 0 : Math.Clamp(value, 1, 10000);

    private static string NormalizeActivityMediaType(string? value) => value switch { "series" => "series", "music-audiobooks" => "music-audiobooks", "books" => "books", _ => "movies" };

    private static string NormalizeFontDataUrl(string? value)
    {
        var font = (value ?? string.Empty).Trim();
        if (font.Length == 0) return string.Empty;
        if (font.Length > 2_800_000) return string.Empty;
        return System.Text.RegularExpressions.Regex.IsMatch(font, "^data:(?:font/(?:ttf|otf)|application/(?:x-font-ttf|x-font-opentype|font-sfnt|octet-stream));base64,[A-Za-z0-9+/=]+$") ? font : string.Empty;
    }

    private static string NormalizeColor(string? value, string fallback) => System.Text.RegularExpressions.Regex.IsMatch(value ?? string.Empty, "^#[0-9a-fA-F]{6}$") ? value! : fallback;

    private static string NormalizeOptionalColor(string? value) => System.Text.RegularExpressions.Regex.IsMatch(value ?? string.Empty, "^#[0-9a-fA-F]{6}$") ? value! : string.Empty;

    private static string NormalizeMediaBarImageType(string? value) => value switch { "backdrop" => "backdrop", "primary" => "primary", "banner" => "banner", "thumb" => "thumb", _ => "abyss-original" };

    private static string NormalizeTitleMarqueeSpeed(string? value) => value switch { "extra-slow" => "extra-slow", "slow" => "slow", "fast" => "fast", "faster" => "faster", _ => "normal" };

    private static List<HomeScreenSectionDraft> NormalizeSectionDrafts(IEnumerable<HomeScreenSectionDraft>? drafts)
    {
        return (drafts ?? [])
            .Where(draft => !string.IsNullOrWhiteSpace(draft.Id)
                && !string.IsNullOrWhiteSpace(draft.SourceId)
                && (string.Equals(draft.SourceType, "collection", StringComparison.Ordinal)
                    || string.Equals(draft.SourceType, "library", StringComparison.Ordinal)
                    || string.Equals(draft.SourceType, "tag", StringComparison.Ordinal)
                    || string.Equals(draft.SourceType, "top", StringComparison.Ordinal)))
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
            "poster" => "poster",
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
            "book" => "book",
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
            "completed-descending" => "completed-descending",
            "completed-ascending" => "completed-ascending",
            "rating-descending" => "rating-descending",
            "random" => "random",
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
