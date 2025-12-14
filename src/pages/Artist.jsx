import { useState, useEffect } from 'react'
import { usePlayerStore } from '../store/playerStore'
import { useLibraryStore } from '../store/libraryStore'
import { searchTracks } from '../services/musicApi'
import TrackList from '../components/TrackList/TrackList'
import Skeleton from '../components/Skeleton/Skeleton'
import './Pages.css'

function Artist({ artist, onClose, onAlbumClick }) {
    const { setQueue, startRadio } = usePlayerStore()
    const [tracks, setTracks] = useState([])
    const [loading, setLoading] = useState(true)
    const [artistInfo, setArtistInfo] = useState(null)

    useEffect(() => {
        const fetchArtistData = async () => {
            setLoading(true)
            try {
                // Search for artist's top tracks
                const results = await searchTracks(`${artist} top songs`)
                setTracks(results.slice(0, 15))

                // Generate artist info from results
                if (results.length > 0) {
                    setArtistInfo({
                        name: artist,
                        image: results[0]?.thumbnail,
                        monthlyListeners: `${Math.floor(Math.random() * 50 + 10)}M monthly listeners`
                    })
                }
            } catch (error) {
                console.error('Failed to load artist:', error)
            }
            setLoading(false)
        }

        if (artist) {
            fetchArtistData()
        }
    }, [artist])

    const handlePlayAll = () => {
        if (tracks.length > 0) {
            setQueue(tracks, 0)
        }
    }

    const handleStartRadio = () => {
        if (tracks.length > 0) {
            startRadio(tracks[0])
        }
    }

    if (!artist) return null

    return (
        <div className="artist-page">
            {/* Header */}
            <div className="artist-header">
                <button className="back-btn" onClick={onClose}>
                    ← Back
                </button>
            </div>

            {/* Artist Hero */}
            <div
                className="artist-hero"
                style={{
                    backgroundImage: artistInfo?.image
                        ? `linear-gradient(transparent, rgba(0,0,0,0.8)), url(${artistInfo.image})`
                        : 'linear-gradient(135deg, #1DB954 0%, #191414 100%)'
                }}
            >
                <div className="artist-hero-content">
                    <span className="artist-verified">✓ Verified Artist</span>
                    <h1 className="artist-name">{artist}</h1>
                    <p className="artist-listeners">{artistInfo?.monthlyListeners || 'Loading...'}</p>
                </div>
            </div>

            {/* Actions */}
            <div className="artist-actions">
                <button className="play-btn-large" onClick={handlePlayAll}>
                    ▶ Play
                </button>
                <button className="action-btn-outline" onClick={handleStartRadio}>
                    📻 Radio
                </button>
            </div>

            {/* Popular Tracks */}
            <section className="aero-section">
                <h2 className="aero-section-title">Popular</h2>
                {loading ? (
                    <div className="aero-skeleton-list">
                        {[...Array(5)].map((_, i) => (
                            <Skeleton key={i} height={64} />
                        ))}
                    </div>
                ) : (
                    <TrackList tracks={tracks.slice(0, 5)} showIndex={true} />
                )}
            </section>

            {/* Discography */}
            <section className="aero-section">
                <h2 className="aero-section-title">Discography</h2>
                <div className="discography-grid">
                    {!loading && tracks.slice(0, 6).map((track, index) => (
                        <div
                            key={track.videoId || index}
                            className="album-card"
                            onClick={() => onAlbumClick && onAlbumClick(track.album || track.title, artist)}
                        >
                            <img src={track.thumbnail} alt={track.album || track.title} />
                            <span className="album-card-title">{track.album || track.title}</span>
                            <span className="album-card-type">Album</span>
                        </div>
                    ))}
                </div>
            </section>

            {/* More by Artist */}
            {tracks.length > 5 && (
                <section className="aero-section">
                    <h2 className="aero-section-title">More by {artist}</h2>
                    <TrackList tracks={tracks.slice(5, 10)} showIndex={false} />
                </section>
            )}
        </div>
    )
}

export default Artist
