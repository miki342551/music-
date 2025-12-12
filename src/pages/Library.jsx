import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
        <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
        </svg>
    )
}

function Library() {
    const { likedSongs, playlists } = useLibraryStore()
    const { setQueue } = usePlayerStore()
    const navigate = useNavigate()
    const [activeTab, setActiveTab] = useState('liked')

    const handlePlayAll = () => {
        if (likedSongs.length > 0) {
            setQueue(likedSongs, 0)
        }
    }

    return (
        <div className="page library-page">
            <section className="section">
                <h1 className="heading-2">Your Library</h1>

                <div className="library-tabs">
                    <button
                        className={`tab ${activeTab === 'liked' ? 'active' : ''}`}
                        onClick={() => setActiveTab('liked')}
                    >
                        Liked Songs
                    </button>
                    <button
                        className={`tab ${activeTab === 'playlists' ? 'active' : ''}`}
                        onClick={() => setActiveTab('playlists')}
                    >
                        Playlists
                    </button>
                </div>

                {activeTab === 'liked' && (
                    <>
                        {likedSongs.length > 0 ? (
                            <>
                                <div className="library-header-card liked-header">
                                    <div className="liked-header-bg">
                                        <Icons.Heart />
                                    </div>
                                    <div className="liked-header-content">
                                        <span className="liked-label">Playlist</span>
                                        <h2 className="heading-1">Liked Songs</h2>
                                        <span className="liked-count">{likedSongs.length} songs</span>
                                    </div>
                                    <button className="play-all-btn" onClick={handlePlayAll}>
                                        <Icons.Play />
                                    </button>
                                </div>
                                <TrackList tracks={likedSongs} />
                            </>
                        ) : (
                            <div className="empty-state">
                                <Icons.Heart />
                                <h3>Songs you like will appear here</h3>
                                <p>Save songs by tapping the heart icon</p>
                            </div>
                        )}
                    </>
                )}

                {activeTab === 'playlists' && (
                    <>
                        {playlists.length > 0 ? (
                            <div className="playlists-grid">
                                {playlists.map(playlist => (
                                    <button
                                        key={playlist.id}
                                        className="playlist-card"
                                        onClick={() => navigate(`/playlist/${playlist.id}`)}
                                    >
                                        <div className="playlist-card-image">
                                            {playlist.imageUrl ? (
                                                <img src={playlist.imageUrl} alt={playlist.name} />
                                            ) : (
                                                <Icons.Music />
                                            )}
                                        </div>
                                        <div className="playlist-card-info">
                                            <span className="playlist-card-name">{playlist.name}</span>
                                            <span className="playlist-card-count">{playlist.tracks.length} songs</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="empty-state">
                                <Icons.Music />
                                <h3>Create your first playlist</h3>
                                <p>Click the + button in the sidebar to get started</p>
                            </div>
                        )}
                    </>
                )}
            </section>
        </div>
    )
}

export default Library
