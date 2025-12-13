import { useState } from 'react'
import { useLibraryStore } from '../store/libraryStore'
import { usePlayerStore } from '../store/playerStore'
import TrackList from '../components/TrackList/TrackList'
import './Pages.css'

const Icons = {
    Heart: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>
    ),
    Play: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
        </svg>
    ),
    Music: () => (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
        </svg>
    )
}

function Library() {
    const { likedSongs, playlists } = useLibraryStore()
    const { setQueue } = usePlayerStore()
    const [activeTab, setActiveTab] = useState('liked')
    const [selectedPlaylist, setSelectedPlaylist] = useState(null)

    const handlePlayAll = () => {
        if (likedSongs.length > 0) {
            setQueue(likedSongs, 0)
        }
    }

    const handlePlaylistClick = (playlist) => {
        setSelectedPlaylist(playlist)
    }

    const handleBackFromPlaylist = () => {
        setSelectedPlaylist(null)
    }

    // Show selected playlist
    if (selectedPlaylist) {
        return (
            <div className="aero-page">
                <button className="aero-clear-btn" onClick={handleBackFromPlaylist} style={{ marginBottom: 16 }}>
                    ← Back to Library
                </button>
                <div className="aero-library-header">
                    <div className="aero-library-icon">
                        {selectedPlaylist.imageUrl ? (
                            <img src={selectedPlaylist.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 12 }} />
                        ) : '🎵'}
                    </div>
                    <div className="aero-library-info">
                        <h2>{selectedPlaylist.name}</h2>
                        <p>{selectedPlaylist.tracks.length} songs</p>
                    </div>
                    <button
                        className="aero-play-btn-sm"
                        onClick={() => selectedPlaylist.tracks.length > 0 && setQueue(selectedPlaylist.tracks, 0)}
                    >
                        <Icons.Play />
                    </button>
                </div>
                {selectedPlaylist.tracks.length > 0 ? (
                    <TrackList tracks={selectedPlaylist.tracks} />
                ) : (
                    <div className="aero-empty-state">
                        <p>No songs in this playlist</p>
                    </div>
                )}
            </div>
        )
    }

    return (
        <div className="aero-page">
            <section className="aero-section">
                <h2 className="aero-section-title">Your Library</h2>

                <div className="aero-library-tabs">
                    <button
                        className={`aero-library-tab ${activeTab === 'liked' ? 'active' : ''}`}
                        onClick={() => setActiveTab('liked')}
                    >
                        Liked Songs
                    </button>
                    <button
                        className={`aero-library-tab ${activeTab === 'playlists' ? 'active' : ''}`}
                        onClick={() => setActiveTab('playlists')}
                    >
                        Playlists
                    </button>
                </div>

                {activeTab === 'liked' && (
                    <>
                        {likedSongs.length > 0 ? (
                            <>
                                <div className="aero-library-header">
                                    <div className="aero-library-icon">❤️</div>
                                    <div className="aero-library-info">
                                        <h2>Liked Songs</h2>
                                        <p>{likedSongs.length} songs</p>
                                    </div>
                                    <button className="aero-play-btn-sm" onClick={handlePlayAll}>
                                        <Icons.Play />
                                    </button>
                                </div>
                                <TrackList tracks={likedSongs} />
                            </>
                        ) : (
                            <div className="aero-empty-state">
                                <div style={{ fontSize: 48, marginBottom: 16 }}>❤️</div>
                                <h3 style={{ color: 'var(--aero-text)', marginBottom: 8 }}>Songs you like will appear here</h3>
                                <p>Save songs by tapping the heart icon</p>
                            </div>
                        )}
                    </>
                )}

                {activeTab === 'playlists' && (
                    <>
                        {playlists.length > 0 ? (
                            <div className="aero-playlists-grid">
                                {playlists.map(playlist => (
                                    <button
                                        key={playlist.id}
                                        className="aero-playlist-card"
                                        onClick={() => handlePlaylistClick(playlist)}
                                    >
                                        <div className="aero-playlist-image">
                                            {playlist.imageUrl ? (
                                                <img src={playlist.imageUrl} alt={playlist.name} />
                                            ) : '🎵'}
                                        </div>
                                        <div className="aero-playlist-name">{playlist.name}</div>
                                        <div className="aero-playlist-count">{playlist.tracks.length} songs</div>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="aero-empty-state">
                                <div style={{ fontSize: 48, marginBottom: 16 }}>🎵</div>
                                <h3 style={{ color: 'var(--aero-text)', marginBottom: 8 }}>No playlists yet</h3>
                                <p>Create playlists to organize your music</p>
                            </div>
                        )}
                    </>
                )}
            </section>
        </div>
    )
}

export default Library
