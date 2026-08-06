using System.Reflection;
using System.Runtime.Loader;
using System.Text.Json;
using Jellyfin.Plugin.HomeScreenSectionsManager.Helpers;
using Microsoft.Extensions.Logging;

namespace Jellyfin.Plugin.HomeScreenSectionsManager.Services;

/// <summary>Registers the non-destructive Jellyfin Web transformation used by the home-screen client.</summary>
public sealed class HomeScreenInjectionService
{
    private const string TransformationId = "72ab14a5-1e83-4ee9-b1bb-8a52406e2706";
    private readonly ILogger<HomeScreenInjectionService> _logger;

    /// <summary>Initializes a new instance of the <see cref="HomeScreenInjectionService"/> class.</summary>
    public HomeScreenInjectionService(ILogger<HomeScreenInjectionService> logger)
    {
        _logger = logger;
    }

    /// <summary>Attempts to register the index transformation with File Transformation.</summary>
    public bool TryRegister()
    {
        try
        {
            var assembly = AssemblyLoadContext.All
                .SelectMany(context => context.Assemblies)
                .FirstOrDefault(candidate => candidate.FullName?.Contains(".FileTransformation", StringComparison.Ordinal) == true);
            var interfaceType = assembly?.GetType("Jellyfin.Plugin.FileTransformation.PluginInterface");
            var method = interfaceType?.GetMethod("RegisterTransformation", BindingFlags.Public | BindingFlags.Static);
            var payloadType = method?.GetParameters().SingleOrDefault()?.ParameterType;
            var parse = payloadType?.GetMethod("Parse", BindingFlags.Public | BindingFlags.Static, [typeof(string)]);
            if (method is null || payloadType is null || parse is null)
            {
                return false;
            }

            var json = JsonSerializer.Serialize(new Dictionary<string, string>
            {
                ["id"] = TransformationId,
                ["fileNamePattern"] = "index\\.html",
                ["callbackAssembly"] = GetType().Assembly.FullName ?? string.Empty,
                ["callbackClass"] = typeof(TransformationPatches).FullName ?? string.Empty,
                ["callbackMethod"] = nameof(TransformationPatches.IndexHtml),
            });
            var payload = parse.Invoke(null, [json]);
            var result = method.Invoke(null, [payload]);
            var success = result is not bool registered || registered;
            if (success)
            {
                _logger.LogInformation("Registered the Home Screen Manager Jellyfin Web transformation.");
            }

            return success;
        }
        catch (Exception exception)
        {
            _logger.LogWarning(exception, "Could not register the Home Screen Manager Jellyfin Web transformation.");
            return false;
        }
    }
}
