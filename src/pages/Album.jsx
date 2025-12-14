import { useState, useEffect } from 'react'
import { usePlayerStore } from '../store/playerStore'
import { searchTracks } from '../services/musicApi'
import TrackList from '../components/TrackList/TrackList'
import Skeleton from '../components/Skeleton/Skeleton'
import './Pages.css'

function Album({ albumName, artistName, onClose, onArtistClick }) {
    const { setQueue } = usePlayerStore()
    const [tracks, setTracks] = useState([])
    const [loading, setLoading] = useState(true)
    const [albumInfo, setAlbumInfo] = useState(null)

    useEffect(() => {
        const fetchAlbumData = async () => {
            setLoading(true)
            try {
                // Search for album tracks
                const query = artistName
                    ? `${artistName} ${albumName}`
                    : albumName
                const results = await searchTracks(query)
                setTracks(results.slice(0, 12))

                // Generate album info
                if (results.length > 0) {
                    const totalDuration = results.reduce((acc, t) => acc + (t.duration || 0), 0)
                    setAlbumInfo({
                        name: albumName,
                        artist: artistName || results[0]?.artist || 'Unknown Artist',
                        image: results[0]?.thumbnail,
                        year: new Date().getFullYear(),
                        trackCount: results.length,
                        duration: Math.floor(totalDuration / 60)
                    })
                }
            } catch (error) {
                console.error('Failed to load album:', error)
            }
            setLoading(false)
        }

        if (albumName) {
            fetchAlbumData()
        }
    }, [albumName, artistName])

    const handlePlayAll = () => {
        if (tracks.length > 0) {
            setQueue(tracks, 0)
        }
    }

    const handleShuffle = () => {
        if (tracks.length > 0) {
            const shuffled = [...tracks].sort(() => Math.random() - 0.5)
            setQueue(shuffled, 0)
        }
    }

    if (!albumName) return null

    return (
        <div className="album-page">
            {/* Header */}
            <div className="album-header">
                <button className="back-btn" onClick={onClose}>
                    ← Back
                </button>
            </div>

            {/* Album Hero */}
            <div className="album-hero">
                <div className="album-hero-art">
                    {albumInfo?.image ? (
                        <img src={albumInfo.image} alt={albumName} />
                    ) : (
                        <div className="album-placeholder">💿</div>
                    )}
                </div>
                <div className="album-hero-info">
                    <span className="album-type">Album</span>
                    <h1 className="album-title">{albumName}</h1>
                    <div className="album-meta">
                        <span
                            className="album-artist-link"
                            onClick={() => onArtistClick && onArtistClick(albumInfo?.artist || artistName)}
                        >
                            {albumInfo?.artist || artistName}
                        </span>
                        <span className="album-details">
                            • {albumInfo?.year} • {albumInfo?.trackCount} songs, {albumInfo?.duration} min
                        </span>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="album-actions">
                <button className="play-btn-large" onClick={handlePlayAll}>
                    ▶ Play
                </button>
                <button className="action-btn-outline" onClick={handleShuffle}>
                    🔀 Shuffle
                </button>
            </div>

            {/* Track List */}
            <section className="aero-section">
                {loading ? (
                    <div className="aero-skeleton-list">
                        {[...Array(8)].map((_, i) => (
                            <Skeleton key={i} height={64} />
                        ))}
                    </div>
                ) : (
                    <TrackList tracks={tracks} showIndex={true} showAlbum={false} />
                )}
            </section>

            {/* Album Footer */}
            {albumInfo && (
                <div className="album-footer">
                    <p>{albumInfo.year} • {albumInfo.trackCount} songs</p>
                </div>
            )}
        </div>
    )
}

export default Album
