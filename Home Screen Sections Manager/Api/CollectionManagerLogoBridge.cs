using System.Collections;
using System.Reflection;
using System.Text.Json;

namespace Jellyfin.Plugin.HomeScreenSectionsManager.Api;

/// <summary>
/// Reads the source-logo selections saved by Collection Manager without taking a
/// compile-time dependency on that optional plugin.
/// </summary>
internal static class CollectionManagerLogoBridge
{
    private const string CollectionManagerPluginType = "Jellyfin.Plugin.CollectionManager.Plugin";
    private const string MediaTaggingManagerPluginType = "Jellyfin.Plugin.MediaTaggingManager.Plugin";

    /// <summary>Returns collection ids which currently have a source logo selected.</summary>
    public static string[] GetSelectedCollectionIds()
    {
        try
        {
            return GetSelections()
                .Select(selection => Value(selection, "CollectionId")?.ToString())
                .Select(id => Guid.TryParse(id, out var parsedId) ? parsedId.ToString("N") : null)
                .Where(id => id is not null)
                .Select(id => id!)
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToArray();
        }
        catch
        {
            // Collection Manager is optional. Its absence or an incompatible
            // future configuration must never prevent Jellyfin Home loading.
            return [];
        }
    }

    /// <summary>Opens the exact source logo selected for one collection.</summary>
    public static SourceLogoFile? Open(string collectionId)
    {
        try
        {
            return OpenCore(collectionId);
        }
        catch
        {
            // A missing optional plugin or source file should omit one logo,
            // never fail the signed-in user's home screen.
            return null;
        }
    }

    private static SourceLogoFile? OpenCore(string collectionId)
    {
        if (!Guid.TryParse(collectionId, out var parsedCollectionId))
        {
            return null;
        }

        var selection = GetSelections().FirstOrDefault(candidate =>
            Guid.TryParse(Value(candidate, "CollectionId")?.ToString(), out var candidateId)
            && candidateId == parsedCollectionId);
        if (selection is null)
        {
            return null;
        }

        var importedAssetId = Value(selection, "ImportedLogoAssetId")?.ToString()?.Trim();
        if (!string.IsNullOrWhiteSpace(importedAssetId))
        {
            return OpenImportedLogo(importedAssetId);
        }

        var kind = Value(selection, "LogoKind")?.ToString()?.Trim();
        var name = Value(selection, "LogoName")?.ToString()?.Trim();
        return string.IsNullOrWhiteSpace(kind) || string.IsNullOrWhiteSpace(name)
            ? null
            : OpenMediaTaggingLogo(kind, name);
    }

    private static IEnumerable<object> GetSelections()
    {
        var configuration = Value(PluginInstance(CollectionManagerPluginType), "Configuration");
        return Value(configuration, "CollectionLogoSelections") is IEnumerable selections
            ? selections.Cast<object>()
            : [];
    }

    private static SourceLogoFile? OpenImportedLogo(string assetId)
    {
        if (!Guid.TryParseExact(assetId, "N", out _))
        {
            return null;
        }

        var root = Value(PluginInstance(CollectionManagerPluginType), "DataFolderPath")?.ToString();
        if (string.IsNullOrWhiteSpace(root))
        {
            return null;
        }

        var directory = Path.Combine(root, "collection-art-assets", "images");
        return OpenMatchingFile(directory, assetId + ".*");
    }

    private static SourceLogoFile? OpenMediaTaggingLogo(string kind, string name)
    {
        var root = Value(PluginInstance(MediaTaggingManagerPluginType), "DataFolderPath")?.ToString();
        if (string.IsNullOrWhiteSpace(root))
        {
            return null;
        }

        var directory = Path.Combine(root, "provider-network-logos");
        var indexPath = Path.Combine(directory, "index.json");
        if (!File.Exists(indexPath))
        {
            return null;
        }

        try
        {
            using var index = JsonDocument.Parse(File.ReadAllText(indexPath));
            var requestedKey = kind + ":" + NormalizeLogoName(kind, name);
            var entry = index.RootElement.EnumerateObject().FirstOrDefault(candidate =>
                string.Equals(candidate.Name, requestedKey, StringComparison.OrdinalIgnoreCase));
            if (string.IsNullOrWhiteSpace(entry.Name)
                || !entry.Value.TryGetProperty("FileName", out var fileNameProperty))
            {
                return null;
            }

            var fileName = Path.GetFileName(fileNameProperty.GetString());
            if (string.IsNullOrWhiteSpace(fileName))
            {
                return null;
            }

            var path = Path.Combine(directory, fileName);
            var contentType = entry.Value.TryGetProperty("ContentType", out var contentTypeProperty)
                ? contentTypeProperty.GetString()
                : null;
            return File.Exists(path)
                ? new SourceLogoFile(File.OpenRead(path), contentType ?? MimeType(path))
                : null;
        }
        catch (JsonException)
        {
            return null;
        }
        catch (IOException)
        {
            return null;
        }
    }

    private static SourceLogoFile? OpenMatchingFile(string directory, string pattern)
    {
        if (!Directory.Exists(directory))
        {
            return null;
        }

        var path = Directory.EnumerateFiles(directory, pattern).FirstOrDefault();
        return path is null ? null : new SourceLogoFile(File.OpenRead(path), MimeType(path));
    }

    private static object? PluginInstance(string fullTypeName)
    {
        var type = AppDomain.CurrentDomain.GetAssemblies()
            .Select(assembly => assembly.GetType(fullTypeName, throwOnError: false, ignoreCase: false))
            .FirstOrDefault(candidate => candidate is not null);
        return type?.GetProperty("Instance", BindingFlags.Public | BindingFlags.Static)?.GetValue(null);
    }

    private static object? Value(object? instance, string propertyName) => instance?.GetType()
        .GetProperty(propertyName, BindingFlags.Public | BindingFlags.Instance | BindingFlags.IgnoreCase)
        ?.GetValue(instance);

    private static string NormalizeLogoName(string kind, string name)
    {
        var trimmed = name.Trim();
        if (!string.Equals(kind, "Provider", StringComparison.OrdinalIgnoreCase))
        {
            return trimmed;
        }

        return trimmed.ToLowerInvariant() switch
        {
            "apple tv plus" => "Apple TV+",
            "disney plus" or "disney +" => "Disney+",
            "discovery plus" or "discovery +" => "Discovery+",
            _ => trimmed,
        };
    }

    private static string MimeType(string path) => Path.GetExtension(path).ToLowerInvariant() switch
    {
        ".png" => "image/png",
        ".jpg" or ".jpeg" => "image/jpeg",
        ".webp" => "image/webp",
        ".gif" => "image/gif",
        ".svg" => "image/svg+xml",
        _ => "application/octet-stream",
    };
}

/// <summary>An opened source-logo stream and its MIME type.</summary>
internal sealed record SourceLogoFile(Stream Stream, string ContentType);
