using System.Reflection;
using System.Runtime.Loader;
using Jellyfin.Plugin.HomeScreenSectionsManager.Helpers;
using Microsoft.Extensions.Logging;

namespace Jellyfin.Plugin.HomeScreenSectionsManager.Services;

/// <summary>Registers the non-destructive Jellyfin Web transformation used by the home-screen client.</summary>
public sealed class HomeScreenInjectionService
{
    private const string TransformationId = "72ab14a5-1e83-4ee9-b1bb-8a52406e2706";
    private readonly ILogger<HomeScreenInjectionService> _logger;
    private readonly object _registrationLock = new();
    private object? _writeService;
    private MethodInfo? _updateTransformation;
    private Delegate? _callback;
    private bool _loggedSuccess;

    /// <summary>Initializes a new instance of the <see cref="HomeScreenInjectionService"/> class.</summary>
    public HomeScreenInjectionService(ILogger<HomeScreenInjectionService> logger)
    {
        _logger = logger;
    }

    /// <summary>Gets whether the current server run has a registered transformation callback.</summary>
    public bool IsRegistered { get; private set; }

    /// <summary>Gets the most recent registration failure.</summary>
    public string? LastError { get; private set; }

    /// <summary>Attempts to register the index transformation with File Transformation.</summary>
    public bool TryRegister()
    {
        try
        {
            lock (_registrationLock)
            {
                if (_writeService is null || _updateTransformation is null || _callback is null)
                {
                    var assembly = AssemblyLoadContext.All
                        .SelectMany(context => context.Assemblies)
                        .FirstOrDefault(candidate => candidate.FullName?.Contains(".FileTransformation", StringComparison.Ordinal) == true);
                    var pluginType = assembly?.GetType("Jellyfin.Plugin.FileTransformation.FileTransformationPlugin");
                    var pluginInstance = pluginType?.GetProperty("Instance", BindingFlags.Public | BindingFlags.Static)?.GetValue(null);
                    var serviceProvider = pluginType?.GetProperty("ServiceProvider", BindingFlags.Public | BindingFlags.Instance)?.GetValue(pluginInstance) as IServiceProvider;
                    var writeServiceType = assembly?.GetType("Jellyfin.Plugin.FileTransformation.Library.IWebFileTransformationWriteService");
                    _writeService = writeServiceType is null ? null : serviceProvider?.GetService(writeServiceType);
                    _updateTransformation = writeServiceType?.GetMethod("UpdateTransformation", BindingFlags.Public | BindingFlags.Instance);
                    var callbackType = _updateTransformation?.GetParameters().ElementAtOrDefault(2)?.ParameterType;
                    var callbackMethod = typeof(TransformationPatches).GetMethod(nameof(TransformationPatches.TransformIndexAsync), BindingFlags.Public | BindingFlags.Static);
                    _callback = callbackType is null || callbackMethod is null ? null : Delegate.CreateDelegate(callbackType, callbackMethod);
                }

                if (_writeService is null || _updateTransformation is null || _callback is null)
                {
                    IsRegistered = false;
                    LastError = "File Transformation's write service is not available.";
                    return false;
                }

                _updateTransformation.Invoke(_writeService, [Guid.Parse(TransformationId), "index\\.html", _callback]);
                IsRegistered = true;
                LastError = null;
                if (!_loggedSuccess)
                {
                    _loggedSuccess = true;
                    _logger.LogInformation("Registered the Home Screen Manager Jellyfin Web stream transformation.");
                }

                return true;
            }
        }
        catch (Exception exception)
        {
            IsRegistered = false;
            LastError = exception.GetBaseException().Message;
            _logger.LogWarning(exception, "Could not register the Home Screen Manager Jellyfin Web transformation.");
            return false;
        }
    }
}
