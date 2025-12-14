import { useState } from 'react'
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
    Radio: () => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3.24 6.15C2.51 6.43 2 7.17 2 8v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8c0-1.11-.89-2-2-2H8.3l8.26-3.34L15.88 1 3.24 6.15zM7 20c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm13-8h-2v-2h-2v2H4V8h16v4z" />
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

function TrackList({ tracks, showIndex = true, showAlbum = true, onArtistClick }) {
    const { currentTrack, isPlaying, playTrack, setQueue, togglePlay, startRadio, addToQueue } = usePlayerStore()
    const { isLiked, toggleLike, addToRecentlyPlayed } = useLibraryStore()
    const [contextMenu, setContextMenu] = useState(null)

    // Get unique track identifier (prefer spotifyId, fallback to videoId)
    const getTrackId = (track) => track?.spotifyId || track?.videoId

    const handleArtistClick = (e, artist) => {
        e.stopPropagation()
        if (onArtistClick && artist) {
            onArtistClick(artist)
        }
    }

    const handlePlay = (track, index) => {
        const currentId = getTrackId(currentTrack)
        const trackId = getTrackId(track)

        if (currentId && trackId && currentId === trackId) {
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
                    const trackId = getTrackId(track)
                    const currentId = getTrackId(currentTrack)
                    const isCurrentTrack = trackId && currentId && trackId === currentId
                    const liked = isLiked(track)

                    return (
                        <div
                            key={trackId || `track-${index}`}
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
                                    <span
                                        className={`track-artist ${onArtistClick ? 'clickable' : ''}`}
                                        onClick={(e) => handleArtistClick(e, track.artist)}
                                    >
                                        {track.artist}
                                    </span>
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
                                <button
                                    className="track-radio-btn"
                                    onClick={(e) => { e.stopPropagation(); startRadio(track) }}
                                    title="Start Radio"
                                >
                                    <Icons.Radio />
                                </button>
                                <span className="track-duration">{formatDuration(track.duration)}</span>
                                <div className="track-more-wrapper">
                                    <button
                                        className="track-more-btn"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            setContextMenu(contextMenu === index ? null : index)
                                        }}
                                    >
                                        <Icons.MoreVert />
                                    </button>
                                    {contextMenu === index && (
                                        <div className="track-context-menu">
                                            <button onClick={(e) => {
                                                e.stopPropagation()
                                                addToQueue(track)
                                                setContextMenu(null)
                                            }}>
                                                ➕ Add to Queue
                                            </button>
                                            <button onClick={(e) => {
                                                e.stopPropagation()
                                                startRadio(track)
                                                setContextMenu(null)
                                            }}>
                                                📻 Start Radio
                                            </button>
                                            <button onClick={(e) => {
                                                e.stopPropagation()
                                                toggleLike(track)
                                                setContextMenu(null)
                                            }}>
                                                {liked ? '💔 Remove from Liked' : '❤️ Add to Liked'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
            {/* Close context menu when clicking outside */}
            {contextMenu !== null && (
                <div
                    className="context-menu-overlay"
                    onClick={() => setContextMenu(null)}
                />
            )}
        </div>
    )
}

export default TrackList
