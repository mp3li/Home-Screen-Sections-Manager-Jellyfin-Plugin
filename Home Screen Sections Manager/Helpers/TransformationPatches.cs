using Jellyfin.Plugin.HomeScreenSectionsManager.Models;

namespace Jellyfin.Plugin.HomeScreenSectionsManager.Helpers;

/// <summary>Non-destructive transformations registered with File Transformation.</summary>
public static class TransformationPatches
{
    /// <summary>Adds the Home Screen Manager client assets to Jellyfin Web's index page.</summary>
    public static string IndexHtml(PatchRequestPayload content)
    {
        var html = content.Contents ?? string.Empty;
        if (html.Contains("data-home-screen-manager-client", StringComparison.Ordinal))
        {
            return html;
        }

        var version = Plugin.Instance?.Version?.ToString() ?? "0";
        var stylesheet = $"<link data-home-screen-manager-client rel=\"stylesheet\" href=\"../HomeScreenSectionsManager/client.css?v={version}\" />";
        var script = $"<script data-home-screen-manager-client src=\"../HomeScreenSectionsManager/client.js?v={version}\" defer></script>";
        return html
            .Replace("</head>", stylesheet + "</head>", StringComparison.Ordinal)
            .Replace("</body>", script + "</body>", StringComparison.Ordinal);
    }
}
