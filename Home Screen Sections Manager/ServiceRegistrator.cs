using Jellyfin.Plugin.HomeScreenSectionsManager.Services;
using MediaBrowser.Controller;
using MediaBrowser.Controller.Plugins;
using Microsoft.Extensions.DependencyInjection;

namespace Jellyfin.Plugin.HomeScreenSectionsManager;

/// <summary>Registers Home Screen Manager services with Jellyfin.</summary>
public sealed class ServiceRegistrator : IPluginServiceRegistrator
{
    /// <inheritdoc />
    public void RegisterServices(IServiceCollection serviceCollection, IServerApplicationHost applicationHost)
    {
        serviceCollection.AddSingleton<HomeScreenInjectionService>();
        serviceCollection.AddHostedService<HomeScreenInjectionHostedService>();
    }
}
