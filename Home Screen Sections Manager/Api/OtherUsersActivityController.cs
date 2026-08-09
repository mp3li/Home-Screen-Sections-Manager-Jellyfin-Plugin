using Jellyfin.Data.Enums;
using Jellyfin.Database.Implementations.Enums;
using MediaBrowser.Controller.Entities;
using MediaBrowser.Controller.Library;
using MediaBrowser.Controller.Session;
using MediaBrowser.Model.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Jellyfin.Plugin.HomeScreenSectionsManager.Api;

/// <summary>Builds privacy-preserving, item-only activity suggestions across Jellyfin users.</summary>
[ApiController]
[Authorize]
[Route("HomeScreenSectionsManager")]
public sealed class OtherUsersActivityController : ControllerBase
{
    private readonly ILibraryManager _libraryManager;
    private readonly IUserManager _userManager;
    private static readonly object CacheLock = new();
    private static readonly Dictionary<string, ActivityCacheEntry> Cache = [];
    private readonly ISessionManager _sessionManager;

    /// <summary>Initializes a new instance of the <see cref="OtherUsersActivityController"/> class.</summary>
    public OtherUsersActivityController(ILibraryManager libraryManager, IUserManager userManager, ISessionManager sessionManager)
    {
        _libraryManager = libraryManager;
        _userManager = userManager;
        _sessionManager = sessionManager;
    }

    /// <summary>Returns a randomized set of recently played or currently playing item ids across users.</summary>
    [HttpGet("other-users-items")]
    public ActionResult<object> GetOtherUsersItems([FromQuery] string mediaType = "movies", [FromQuery] int limit = 20)
    {
        var normalizedLimit = Math.Clamp(limit, 1, 100);
        var normalizedMediaType = NormalizeMediaType(mediaType);
        var cacheKey = normalizedMediaType + ":" + normalizedLimit;
        lock (CacheLock)
        {
            if (Cache.TryGetValue(cacheKey, out var cached) && DateTimeOffset.UtcNow - cached.CreatedAt < TimeSpan.FromSeconds(60))
            {
                return Ok(new { ItemIds = cached.ItemIds });
            }
        }

        var includeTypes = IncludedTypes(normalizedMediaType);
        var ids = new HashSet<Guid>();

        foreach (var session in _sessionManager.Sessions)
        {
            var item = session.NowPlayingItem;
            if (item is not null && includeTypes.Contains(item.Type))
            {
                ids.Add(ActivityItemId(normalizedMediaType, item.Id, item));
            }
        }

        foreach (var user in _userManager.GetUsers())
        {
            var result = _libraryManager.GetItemsResult(new InternalItemsQuery(user)
            {
                Recursive = true,
                Limit = normalizedLimit,
                IncludeItemTypes = includeTypes,
                IsPlayed = true,
                IsVirtualItem = false,
                EnableTotalRecordCount = false,
                OrderBy = [(ItemSortBy.DatePlayed, SortOrder.Descending)],
            });

            foreach (var item in result.Items)
            {
                ids.Add(ActivityItemId(normalizedMediaType, item.Id, item));
            }
        }

        var randomized = ids.Where(id => id != Guid.Empty).OrderBy(_ => Random.Shared.Next()).Take(normalizedLimit).Select(id => id.ToString("N")).ToArray();
        lock (CacheLock)
        {
            Cache[cacheKey] = new ActivityCacheEntry(DateTimeOffset.UtcNow, randomized);
        }

        return Ok(new { ItemIds = randomized });
    }

    private static Guid ActivityItemId(string mediaType, Guid fallbackId, object item)
    {
        if (mediaType != "series")
        {
            return fallbackId;
        }

        var value = item.GetType().GetProperty("SeriesId")?.GetValue(item);
        if (value is Guid seriesId && seriesId != Guid.Empty)
        {
            return seriesId;
        }

        return Guid.TryParse(Convert.ToString(value, System.Globalization.CultureInfo.InvariantCulture), out seriesId) && seriesId != Guid.Empty ? seriesId : fallbackId;
    }

    private static string NormalizeMediaType(string? mediaType)
    {
        return mediaType switch
        {
            "series" => "series",
            "music-audiobooks" => "music-audiobooks",
            "books" => "books",
            _ => "movies",
        };
    }

    private sealed record ActivityCacheEntry(DateTimeOffset CreatedAt, string[] ItemIds);

    private static BaseItemKind[] IncludedTypes(string? mediaType)
    {
        return mediaType switch
        {
            "series" => [BaseItemKind.Series, BaseItemKind.Episode],
            "music-audiobooks" => [BaseItemKind.Audio, BaseItemKind.AudioBook, BaseItemKind.MusicAlbum],
            "books" => [BaseItemKind.Book],
            _ => [BaseItemKind.Movie],
        };
    }
}
