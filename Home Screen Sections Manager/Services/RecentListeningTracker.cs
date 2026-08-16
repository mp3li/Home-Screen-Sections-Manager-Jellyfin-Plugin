using MediaBrowser.Controller.Entities;
using MediaBrowser.Controller.Entities.Audio;
using MediaBrowser.Controller.Library;
using MediaBrowser.Controller.Session;
using Microsoft.Extensions.Hosting;

namespace Jellyfin.Plugin.HomeScreenSectionsManager.Services;

/// <summary>Records ordinary music tracks after at least ten seconds of active playback.</summary>
public sealed class RecentListeningTracker : IHostedService
{
    private static readonly TimeSpan ListeningThreshold = TimeSpan.FromSeconds(10);
    private readonly ISessionManager _sessionManager;
    private readonly RecentListeningStore _store;
    private readonly object _sync = new();
    private readonly Dictionary<string, ListeningSession> _sessions = [];

    /// <summary>Initializes a new instance of the <see cref="RecentListeningTracker"/> class.</summary>
    public RecentListeningTracker(ISessionManager sessionManager, RecentListeningStore store)
    {
        _sessionManager = sessionManager;
        _store = store;
    }

    /// <inheritdoc />
    public Task StartAsync(CancellationToken cancellationToken)
    {
        _sessionManager.PlaybackStart += OnPlaybackStart;
        _sessionManager.PlaybackProgress += OnPlaybackProgress;
        _sessionManager.PlaybackStopped += OnPlaybackStopped;
        return Task.CompletedTask;
    }

    /// <inheritdoc />
    public Task StopAsync(CancellationToken cancellationToken)
    {
        _sessionManager.PlaybackStart -= OnPlaybackStart;
        _sessionManager.PlaybackProgress -= OnPlaybackProgress;
        _sessionManager.PlaybackStopped -= OnPlaybackStopped;
        lock (_sync)
        {
            _sessions.Clear();
        }

        return Task.CompletedTask;
    }

    private static bool IsSong(BaseItem? item) => item is Audio && item is not AudioBook;

    private static string SessionKey(PlaybackProgressEventArgs eventArgs)
    {
        if (!string.IsNullOrWhiteSpace(eventArgs.PlaySessionId))
        {
            return eventArgs.PlaySessionId;
        }

        return string.Concat(eventArgs.DeviceId ?? string.Empty, ":", eventArgs.Item?.Id.ToString("N"));
    }

    private void OnPlaybackStart(object? sender, PlaybackProgressEventArgs eventArgs)
    {
        if (!IsSong(eventArgs.Item) || eventArgs.IsAutomated)
        {
            return;
        }

        lock (_sync)
        {
            _sessions[SessionKey(eventArgs)] = new ListeningSession(
                eventArgs.Item.Id,
                eventArgs.Users.Select(user => user.Id).ToHashSet(),
                DateTimeOffset.UtcNow,
                eventArgs.IsPaused);
        }
    }

    private void OnPlaybackProgress(object? sender, PlaybackProgressEventArgs eventArgs) => Update(eventArgs, false);

    private void OnPlaybackStopped(object? sender, PlaybackStopEventArgs eventArgs) => Update(eventArgs, true);

    private void Update(PlaybackProgressEventArgs eventArgs, bool stopped)
    {
        if (!IsSong(eventArgs.Item) || eventArgs.IsAutomated)
        {
            return;
        }

        lock (_sync)
        {
            var key = SessionKey(eventArgs);
            if (!_sessions.TryGetValue(key, out var session))
            {
                session = new ListeningSession(eventArgs.Item.Id, [], DateTimeOffset.UtcNow, eventArgs.IsPaused);
                _sessions[key] = session;
            }

            foreach (var user in eventArgs.Users)
            {
                session.UserIds.Add(user.Id);
            }

            var now = DateTimeOffset.UtcNow;
            if (!session.WasPaused)
            {
                var elapsed = now - session.LastEventAt;
                if (elapsed > TimeSpan.Zero && elapsed < TimeSpan.FromMinutes(2))
                {
                    session.ActivePlayback += elapsed;
                }
            }

            session.LastEventAt = now;
            session.WasPaused = eventArgs.IsPaused;
            if (!session.Recorded && session.ActivePlayback >= ListeningThreshold)
            {
                _store.Record(session.ItemId, session.UserIds, now);
                session.Recorded = true;
            }

            if (stopped)
            {
                _sessions.Remove(key);
            }
        }
    }

    private sealed class ListeningSession
    {
        public ListeningSession(Guid itemId, HashSet<Guid> userIds, DateTimeOffset lastEventAt, bool wasPaused)
        {
            ItemId = itemId;
            UserIds = userIds;
            LastEventAt = lastEventAt;
            WasPaused = wasPaused;
        }

        public Guid ItemId { get; }

        public HashSet<Guid> UserIds { get; }

        public DateTimeOffset LastEventAt { get; set; }

        public TimeSpan ActivePlayback { get; set; }

        public bool WasPaused { get; set; }

        public bool Recorded { get; set; }
    }
}
