using System.Text.Json;

namespace Jellyfin.Plugin.HomeScreenSectionsManager.Services;

/// <summary>Persists per-user songs that reached the recent-listening threshold.</summary>
public sealed class RecentListeningStore
{
    private const int MaximumSongsPerUser = 500;
    private readonly object _sync = new();
    private Dictionary<string, List<RecentListeningEntry>>? _entries;

    /// <summary>Records a qualifying song for each user and moves it to the newest position.</summary>
    public void Record(Guid songId, IEnumerable<Guid> userIds, DateTimeOffset listenedAt)
    {
        if (songId == Guid.Empty)
        {
            return;
        }

        lock (_sync)
        {
            EnsureLoaded();
            foreach (var userId in userIds.Where(id => id != Guid.Empty).Distinct())
            {
                var key = userId.ToString("N");
                if (!_entries!.TryGetValue(key, out var entries))
                {
                    entries = [];
                    _entries[key] = entries;
                }

                entries.RemoveAll(entry => entry.ItemId == songId);
                entries.Insert(0, new RecentListeningEntry(songId, listenedAt));
                if (entries.Count > MaximumSongsPerUser)
                {
                    entries.RemoveRange(MaximumSongsPerUser, entries.Count - MaximumSongsPerUser);
                }
            }

            Save();
        }
    }

    /// <summary>Gets qualifying song ids from newest to oldest for one user.</summary>
    public IReadOnlyList<Guid> GetSongIds(Guid userId, int limit)
    {
        lock (_sync)
        {
            EnsureLoaded();
            return _entries!.TryGetValue(userId.ToString("N"), out var entries)
                ? entries.OrderByDescending(entry => entry.ListenedAt).Take(Math.Clamp(limit, 1, MaximumSongsPerUser)).Select(entry => entry.ItemId).ToArray()
                : [];
        }
    }

    private static string StorePath => Path.Combine(
        Plugin.Instance?.DataFolderPath ?? throw new InvalidOperationException("Home Screen Manager's plugin data folder is unavailable."),
        "recent-listening.json");

    private void EnsureLoaded()
    {
        if (_entries is not null)
        {
            return;
        }

        try
        {
            _entries = File.Exists(StorePath)
                ? JsonSerializer.Deserialize<Dictionary<string, List<RecentListeningEntry>>>(File.ReadAllText(StorePath)) ?? []
                : [];
        }
        catch
        {
            _entries = [];
        }
    }

    private void Save()
    {
        Directory.CreateDirectory(Path.GetDirectoryName(StorePath)!);
        var temporaryPath = StorePath + ".tmp";
        File.WriteAllText(temporaryPath, JsonSerializer.Serialize(_entries));
        File.Move(temporaryPath, StorePath, true);
    }

    private sealed record RecentListeningEntry(Guid ItemId, DateTimeOffset ListenedAt);
}
