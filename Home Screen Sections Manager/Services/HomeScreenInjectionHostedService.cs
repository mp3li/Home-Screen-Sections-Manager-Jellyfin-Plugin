using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Jellyfin.Plugin.HomeScreenSectionsManager.Services;

/// <summary>Registers the client transformation after Jellyfin finishes loading plugins.</summary>
public sealed class HomeScreenInjectionHostedService : BackgroundService
{
    private readonly HomeScreenInjectionService _injection;
    private readonly ILogger<HomeScreenInjectionHostedService> _logger;

    /// <summary>Initializes a new instance of the <see cref="HomeScreenInjectionHostedService"/> class.</summary>
    public HomeScreenInjectionHostedService(HomeScreenInjectionService injection, ILogger<HomeScreenInjectionHostedService> logger)
    {
        _injection = injection;
        _logger = logger;
    }

    /// <inheritdoc />
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        for (var attempt = 1; attempt <= 12 && !stoppingToken.IsCancellationRequested; attempt++)
        {
            if (_injection.TryRegister())
            {
                return;
            }

            await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken).ConfigureAwait(false);
        }

        _logger.LogWarning("File Transformation was not available. Home Screen Manager sections will not appear until that plugin is installed and Jellyfin is restarted.");
    }
}
