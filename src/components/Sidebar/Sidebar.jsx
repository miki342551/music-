import { NavLink, useNavigate } from 'react-router-dom'
import { useLibraryStore } from '../../store/libraryStore'
import { useState } from 'react'
import './Sidebar.css'

// Icons
const Icons = {
    Home: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12.5 3.247a1 1 0 0 0-1 0L4 7.577V20h4.5v-6a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1v6H20V7.577l-7.5-4.33zm-2-1.732a3 3 0 0 1 3 0l7.5 4.33a2 2 0 0 1 1 1.732V21a1 1 0 0 1-1 1h-6.5a1 1 0 0 1-1-1v-6h-3v6a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V7.577a2 2 0 0 1 1-1.732l7.5-4.33z" />
        </svg>
    ),
    Search: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M10.533 1.279c-5.18 0-9.407 4.14-9.407 9.279s4.226 9.279 9.407 9.279c2.234 0 4.29-.77 5.907-2.058l4.353 4.353a1 1 0 1 0 1.414-1.414l-4.344-4.344a9.157 9.157 0 0 0 2.077-5.816c0-5.14-4.226-9.28-9.407-9.28zm-7.407 9.279c0-4.006 3.302-7.28 7.407-7.28s7.407 3.274 7.407 7.28-3.302 7.279-7.407 7.279-7.407-3.273-7.407-7.28z" />
        </svg>
    ),
    Library: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 22a1 1 0 0 1-1-1V3a1 1 0 0 1 2 0v18a1 1 0 0 1-1 1zM15.5 2.134A1 1 0 0 0 14 3v18a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V6.464a1 1 0 0 0-.5-.866l-6-3.464zM21 7.2V20h-5V4.2l5 3zM7.5 2.134A1 1 0 0 0 6 3v18a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V6.464a1 1 0 0 0-.5-.866l-6-3.464zM13 7.2V20H8V4.2l5 3z" />
        </svg>
    ),
    Heart: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>
    ),
    Plus: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 4a1 1 0 0 1 1 1v6h6a1 1 0 1 1 0 2h-6v6a1 1 0 1 1-2 0v-6H5a1 1 0 1 1 0-2h6V5a1 1 0 0 1 1-1z" />
        </svg>
    ),
    Music: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
        </svg>
    )
}

function Sidebar() {
    const { playlists, createPlaylist, likedSongs } = useLibraryStore()
    const [showNewPlaylist, setShowNewPlaylist] = useState(false)
    const [newPlaylistName, setNewPlaylistName] = useState('')
    const navigate = useNavigate()

    const handleCreatePlaylist = () => {
        if (newPlaylistName.trim()) {
            const id = createPlaylist(newPlaylistName.trim())
            setNewPlaylistName('')
            setShowNewPlaylist(false)
            navigate(`/playlist/${id}`)
        }
    }

    return (
        <aside className="sidebar">
            <div className="sidebar-logo">
                <div className="logo-icon">
                    <Icons.Music />
                </div>
                <span className="logo-text">GE'EZ music</span>
            </div>

            <nav className="sidebar-nav">
                <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                    <Icons.Home />
                    <span>Home</span>
                </NavLink>
                <NavLink to="/search" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                    <Icons.Search />
                    <span>Search</span>
                </NavLink>
                <NavLink to="/library" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                    <Icons.Library />
                    <span>Your Library</span>
                </NavLink>
            </nav>

            <div className="sidebar-library">
                <div className="library-header">
                    <button
                        className="create-playlist-btn"
                        onClick={() => setShowNewPlaylist(!showNewPlaylist)}
                        title="Create Playlist"
                    >
                        <Icons.Plus />
                        <span>Create Playlist</span>
                    </button>
                </div>

                {showNewPlaylist && (
                    <div className="new-playlist-form">
                        <input
                            type="text"
                            placeholder="Playlist name"
                            value={newPlaylistName}
                            onChange={(e) => setNewPlaylistName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleCreatePlaylist()}
                            autoFocus
                        />
                        <button onClick={handleCreatePlaylist}>Create</button>
                    </div>
                )}

                <NavLink
                    to="/library?tab=liked"
                    className={({ isActive }) => `library-item liked-songs ${isActive ? 'active' : ''}`}
                >
                    <div className="liked-songs-icon">
                        <Icons.Heart />
                    </div>
                    <div className="library-item-info">
                        <span className="library-item-name">Liked Songs</span>
                        <span className="library-item-count">{likedSongs.length} songs</span>
                    </div>
                </NavLink>

                <div className="playlists-list">
                    {playlists.map(playlist => (
                        <NavLink
                            key={playlist.id}
                            to={`/playlist/${playlist.id}`}
                            className={({ isActive }) => `library-item ${isActive ? 'active' : ''}`}
                        >
                            <div className="playlist-thumb">
                                {playlist.imageUrl ? (
                                    <img src={playlist.imageUrl} alt={playlist.name} />
                                ) : (
                                    <Icons.Music />
                                )}
                            </div>
                            <div className="library-item-info">
                                <span className="library-item-name">{playlist.name}</span>
                                <span className="library-item-count">{playlist.tracks.length} songs</span>
                            </div>
                        </NavLink>
                    ))}
                </div>
            </div>
        </aside>
    )
}

export default Sidebar
