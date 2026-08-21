using Jellyfin.Data.Enums;
using Jellyfin.Database.Implementations.Enums;
using MediaBrowser.Controller.Entities;
using MediaBrowser.Controller.Library;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Jellyfin.Plugin.HomeScreenSectionsManager.Api;

/// <summary>Provides one bounded, user-scoped My List query without browser fan-out across libraries.</summary>
[ApiController]
[Authorize]
[Route("HomeScreenSectionsManager")]
public sealed class MyListItemsController : ControllerBase
{
    private readonly ILibraryManager _libraryManager;
    private readonly IUserManager _userManager;

    /// <summary>Initializes a new instance of the <see cref="MyListItemsController"/> class.</summary>
    public MyListItemsController(ILibraryManager libraryManager, IUserManager userManager)
    {
        _libraryManager = libraryManager;
        _userManager = userManager;
    }

    /// <summary>Returns one page of liked item ids for the signed-in user.</summary>
    [HttpGet("my-list-item-ids")]
    public ActionResult<object> Get([FromQuery] int startIndex = 0, [FromQuery] int limit = 16)
    {
        var userIdText = User.Claims.FirstOrDefault(claim =>
            claim.Type.Equals("Jellyfin-UserId", StringComparison.OrdinalIgnoreCase))?.Value;
        if (!Guid.TryParse(userIdText, out var userId))
        {
            return Unauthorized();
        }

        var user = _userManager.GetUserById(userId);
        if (user is null)
        {
            return Unauthorized();
        }

        var result = _libraryManager.GetItemsResult(new InternalItemsQuery(user)
        {
            Recursive = true,
            StartIndex = Math.Max(0, startIndex),
            Limit = Math.Clamp(limit, 1, 100),
            IncludeItemTypes =
            [
                BaseItemKind.Movie,
                BaseItemKind.Series,
                BaseItemKind.Season,
                BaseItemKind.Episode,
                BaseItemKind.Video,
                BaseItemKind.BoxSet,
                BaseItemKind.Playlist,
                BaseItemKind.Audio,
                BaseItemKind.MusicAlbum,
                BaseItemKind.MusicArtist,
                BaseItemKind.Book,
                BaseItemKind.AudioBook,
            ],
            IsLiked = true,
            IsVirtualItem = false,
            EnableTotalRecordCount = true,
            OrderBy = [(ItemSortBy.SortName, SortOrder.Ascending)],
        });

        return Ok(new
        {
            ItemIds = result.Items.Select(item => item.Id.ToString("N")).ToArray(),
            result.TotalRecordCount,
        });
    }
}
