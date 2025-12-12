import { useParams, useNavigate } from 'react-router-dom'
import { useLibraryStore } from '../store/libraryStore'
import { usePlayerStore } from '../store/playerStore'
import TrackList from '../components/TrackList/TrackList'
import './Pages.css'

const Icons = {
    Play: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
        </svg>
    ),
    Shuffle: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z" />
        </svg>
    ),
    Delete: () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
        </svg>
    ),
    Music: () => (
        <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
        </svg>
    ),
    Back: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
        </svg>
    )
}

function Playlist() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { getPlaylist, deletePlaylist } = useLibraryStore()
    const { setQueue, toggleShuffle } = usePlayerStore()

    const playlist = getPlaylist(id)

    if (!playlist) {
        return (
            <div className="page playlist-page">
                <div className="empty-state">
                    <Icons.Music />
                    <h3>Playlist not found</h3>
                    <button className="btn btn-primary" onClick={() => navigate('/library')}>
                        Go to Library
                    </button>
                </div>
            </div>
        )
    }

    const handlePlayAll = () => {
        if (playlist.tracks.length > 0) {
            setQueue(playlist.tracks, 0)
        }
    }

    const handleShuffle = () => {
        if (playlist.tracks.length > 0) {
            const shuffled = [...playlist.tracks].sort(() => Math.random() - 0.5)
            setQueue(shuffled, 0)
        }
    }

    const handleDelete = () => {
        if (confirm(`Delete "${playlist.name}"?`)) {
            deletePlaylist(id)
            navigate('/library')
        }
    }

    return (
        <div className="page playlist-page">
            <button className="back-btn" onClick={() => navigate(-1)}>
                <Icons.Back />
                <span>Back</span>
            </button>

            <div className="playlist-header">
                <div className="playlist-header-image">
                    {playlist.imageUrl ? (
                        <img src={playlist.imageUrl} alt={playlist.name} />
                    ) : (
                        <div className="playlist-header-placeholder">
                            <Icons.Music />
                        </div>
                    )}
                </div>
                <div className="playlist-header-info">
                    <span className="playlist-type">Playlist</span>
                    <h1 className="heading-1">{playlist.name}</h1>
                    {playlist.description && (
                        <p className="playlist-description">{playlist.description}</p>
                    )}
                    <span className="playlist-meta">{playlist.tracks.length} songs</span>
                </div>
            </div>

            <div className="playlist-actions">
                <button
                    className="btn btn-primary btn-icon-lg"
                    onClick={handlePlayAll}
                    disabled={playlist.tracks.length === 0}
                >
                    <Icons.Play />
                </button>
                <button
                    className="btn btn-secondary"
                    onClick={handleShuffle}
                    disabled={playlist.tracks.length === 0}
                >
                    <Icons.Shuffle />
                    Shuffle
                </button>
                <button
                    className="btn btn-ghost delete-btn"
                    onClick={handleDelete}
                >
                    <Icons.Delete />
                </button>
            </div>

            {playlist.tracks.length > 0 ? (
                <TrackList tracks={playlist.tracks} />
            ) : (
                <div className="empty-state">
                    <Icons.Music />
                    <h3>This playlist is empty</h3>
                    <p>Search for songs and add them here</p>
                    <button className="btn btn-primary" onClick={() => navigate('/search')}>
                        Find Songs
                    </button>
                </div>
            )}
        </div>
    )
}

export default Playlist
