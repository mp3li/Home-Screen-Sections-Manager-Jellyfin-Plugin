using Jellyfin.Plugin.HomeScreenSectionsManager.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Jellyfin.Plugin.HomeScreenSectionsManager.Api;

/// <summary>Returns recent music listening history for the signed-in user only.</summary>
[ApiController]
[Authorize]
[Route("HomeScreenSectionsManager")]
public sealed class RecentListeningController : ControllerBase
{
    private readonly RecentListeningStore _store;

    /// <summary>Initializes a new instance of the <see cref="RecentListeningController"/> class.</summary>
    public RecentListeningController(RecentListeningStore store)
    {
        _store = store;
    }

    /// <summary>Gets songs that this user listened to for at least ten seconds.</summary>
    [HttpGet("recent-listening")]
    public ActionResult<object> Get([FromQuery] int limit = 200)
    {
        var userIdText = User.Claims.FirstOrDefault(claim => claim.Type.Equals("Jellyfin-UserId", StringComparison.OrdinalIgnoreCase))?.Value;
        if (!Guid.TryParse(userIdText, out var userId))
        {
            return Unauthorized();
        }

        return Ok(new { ItemIds = _store.GetSongIds(userId, Math.Clamp(limit, 1, 500)).Select(id => id.ToString("N")).ToArray() });
    }
}
