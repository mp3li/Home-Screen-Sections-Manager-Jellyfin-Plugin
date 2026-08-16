using Jellyfin.Plugin.HomeScreenSectionsManager.Services;
using MediaBrowser.Controller;
using MediaBrowser.Controller.Plugins;
using Microsoft.Extensions.DependencyInjection;

namespace Jellyfin.Plugin.HomeScreenSectionsManager;

/// <summary>Registers recent-listening services with Jellyfin.</summary>
public sealed class ServiceRegistrator : IPluginServiceRegistrator
{
    /// <inheritdoc />
    public void RegisterServices(IServiceCollection serviceCollection, IServerApplicationHost applicationHost)
    {
        serviceCollection.AddSingleton<RecentListeningStore>();
        serviceCollection.AddHostedService<RecentListeningTracker>();
    }
}
