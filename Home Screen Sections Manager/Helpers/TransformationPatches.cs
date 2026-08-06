using Jellyfin.Plugin.HomeScreenSectionsManager.Models;

namespace Jellyfin.Plugin.HomeScreenSectionsManager.Helpers;

/// <summary>Non-destructive transformations registered with File Transformation.</summary>
public static class TransformationPatches
{
    private static int _invocationCount;
    private static long _lastInvocationTicks;

    /// <summary>Gets the number of index responses transformed during this server run.</summary>
    public static int InvocationCount => Volatile.Read(ref _invocationCount);

    /// <summary>Adds the Home Screen Manager client assets to Jellyfin Web's index page.</summary>
    public static string IndexHtml(PatchRequestPayload content)
    {
        Interlocked.Increment(ref _invocationCount);
        Interlocked.Exchange(ref _lastInvocationTicks, DateTimeOffset.UtcNow.UtcTicks);
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

    /// <summary>Gets when the most recent index response was transformed.</summary>
    public static DateTimeOffset? LastInvocationUtc
    {
        get
        {
            var ticks = Interlocked.Read(ref _lastInvocationTicks);
            return ticks <= 0 ? null : new DateTimeOffset(ticks, TimeSpan.Zero);
        }
    }

    /// <summary>Transforms the File Transformation stream without resolving callback services after startup.</summary>
    public static async Task TransformIndexAsync(string path, Stream contents)
    {
        contents.Seek(0, SeekOrigin.Begin);
        using var reader = new StreamReader(contents, leaveOpen: true);
        var html = await reader.ReadToEndAsync().ConfigureAwait(false);
        var transformed = IndexHtml(new PatchRequestPayload { Contents = html });
        contents.Seek(0, SeekOrigin.Begin);
        contents.SetLength(0);
        using var writer = new StreamWriter(contents, leaveOpen: true);
        await writer.WriteAsync(transformed).ConfigureAwait(false);
        await writer.FlushAsync().ConfigureAwait(false);
    }
}
