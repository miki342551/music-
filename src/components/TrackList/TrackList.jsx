import { usePlayerStore } from '../../store/playerStore'
import { useLibraryStore } from '../../store/libraryStore'
import { formatDuration } from '../../services/musicApi'
import './TrackList.css'

const Icons = {
    Play: () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
        </svg>
    ),
    Pause: () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
        </svg>
    ),
    Heart: () => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>
    ),
    HeartFilled: () => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>
    ),
    MoreVert: () => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
        </svg>
    ),
    Equalizer: () => (
        <div className="equalizer">
            <span></span>
            <span></span>
            <span></span>
        </div>
    )
}

function TrackList({ tracks, showIndex = true, showAlbum = false }) {
    const { currentTrack, isPlaying, playTrack, setQueue, togglePlay } = usePlayerStore()
    const { isLiked, toggleLike, addToRecentlyPlayed } = useLibraryStore()

    const handlePlay = (track, index) => {
        if (currentTrack?.videoId === track.videoId) {
            togglePlay()
        } else {
            setQueue(tracks, index)
            addToRecentlyPlayed(track)
        }
    }

    if (!tracks || tracks.length === 0) {
        return (
            <div className="track-list-empty">
                <p>No tracks to display</p>
            </div>
        )
    }

    return (
        <div className="track-list">
            <div className="track-list-header">
                {showIndex && <div className="track-col index">#</div>}
                <div className="track-col title">Title</div>
                {showAlbum && <div className="track-col album">Album</div>}
                <div className="track-col duration">Duration</div>
            </div>

            <div className="track-list-body">
                {tracks.map((track, index) => {
                    const isCurrentTrack = currentTrack?.videoId === track.videoId
                    const liked = isLiked(track.videoId)

                    return (
                        <div
                            key={track.videoId || index}
                            className={`track-item ${isCurrentTrack ? 'active' : ''}`}
                            onDoubleClick={() => handlePlay(track, index)}
                        >
                            {showIndex && (
                                <div className="track-col index">
                                    <span className="track-number">{index + 1}</span>
                                    <button
                                        className="track-play-btn"
                                        onClick={() => handlePlay(track, index)}
                                    >
                                        {isCurrentTrack && isPlaying ? (
                                            <Icons.Equalizer />
                                        ) : (
                                            <Icons.Play />
                                        )}
                                    </button>
                                </div>
                            )}

                            <div className="track-col title">
                                <div className="track-thumb">
                                    <img src={track.thumbnail} alt={track.title} />
                                </div>
                                <div className="track-info">
                                    <span className={`track-title ${isCurrentTrack ? 'playing' : ''}`}>
                                        {track.title}
                                    </span>
                                    <span className="track-artist">{track.artist}</span>
                                </div>
                            </div>

                            {showAlbum && (
                                <div className="track-col album">
                                    <span>{track.album || '-'}</span>
                                </div>
                            )}

                            <div className="track-col duration">
                                <button
                                    className={`track-like-btn ${liked ? 'liked' : ''}`}
                                    onClick={() => toggleLike(track)}
                                >
                                    {liked ? <Icons.HeartFilled /> : <Icons.Heart />}
                                </button>
                                <span className="track-duration">{formatDuration(track.duration)}</span>
                                <button className="track-more-btn">
                                    <Icons.MoreVert />
                                </button>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

export default TrackList
