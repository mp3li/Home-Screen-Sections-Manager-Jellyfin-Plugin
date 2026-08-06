using System.Text.Json.Serialization;

namespace Jellyfin.Plugin.HomeScreenSectionsManager.Models;

/// <summary>File Transformation callback payload.</summary>
public sealed class PatchRequestPayload
{
    /// <summary>Gets or sets the current file contents.</summary>
    [JsonPropertyName("contents")]
    public string? Contents { get; set; }
}
