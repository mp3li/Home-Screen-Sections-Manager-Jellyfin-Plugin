using Jellyfin.Data.Enums;
using MediaBrowser.Controller.Entities;
using MediaBrowser.Controller.Entities.Movies;
using MediaBrowser.Controller.Library;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Jellyfin.Plugin.HomeScreenSectionsManager.Api;

/// <summary>Provides bounded detail-page collection membership data without browser request fan-out.</summary>
[ApiController]
[Authorize]
[Route("HomeScreenSectionsManager")]
public sealed class DetailCollectionsController : ControllerBase
{
    private readonly ILibraryManager _libraryManager;

    /// <summary>Initializes a new instance of the <see cref="DetailCollectionsController"/> class.</summary>
    public DetailCollectionsController(ILibraryManager libraryManager)
    {
        _libraryManager = libraryManager;
    }

    /// <summary>Returns the collection ids containing one Jellyfin item.</summary>
    [HttpGet("items/{itemId:guid}/collections")]
    public ActionResult<object> GetCollections(Guid itemId)
    {
        var ids = _libraryManager
            .GetItemList(new InternalItemsQuery { IncludeItemTypes = [BaseItemKind.BoxSet] })
            .OfType<BoxSet>()
            .Where(collection => ContainsItem(collection, itemId))
            .OrderBy(collection => collection.SortName ?? collection.Name, StringComparer.OrdinalIgnoreCase)
            .Select(collection => collection.Id.ToString("N"))
            .ToArray();

        return Ok(new { ItemIds = ids });
    }

    private static bool ContainsItem(BoxSet collection, Guid itemId)
    {
        try
        {
            return collection.GetLinkedChildren().Any(child => child.Id == itemId);
        }
        catch
        {
            return false;
        }
    }
}
