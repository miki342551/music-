import { useState, useEffect } from 'react'
import { useLibraryStore } from '../store/libraryStore'
import { usePlayerStore } from '../store/playerStore'
import { getTrendingTracks, searchTracks, getRelatedTracks } from '../services/musicApi'
import TrackList from '../components/TrackList/TrackList'
import Skeleton from '../components/Skeleton/Skeleton'
import './Pages.css'

function Home() {
    const { recentlyPlayed, likedSongs } = useLibraryStore()
    const { setQueue, startRadio } = usePlayerStore()
    const [trending, setTrending] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchTrending = async () => {
            try {
                const results = await getTrendingTracks()
                setTrending(results.slice(0, 10))
            } catch (e) {
                const results = await searchTracks('trending music 2024')
                setTrending(results.slice(0, 10))
            }
            setLoading(false)
        }
        fetchTrending()
    }, [])

    // Generate personalized radio mixes based on user's history
    const generateRadioMixes = () => {
        const mixes = []

        // Mix based on recently played
        if (recentlyPlayed.length > 0) {
            const seedTrack = recentlyPlayed[0]
            mixes.push({
                id: 'recent-mix',
                title: 'Your Mix',
                subtitle: 'Based on recent listens',
                seedTrack,
                gradient: 'linear-gradient(135deg, #1DB954 0%, #191414 100%)',
                thumbnail: seedTrack.thumbnail
            })
        }

        // Mix based on liked songs
        if (likedSongs.length > 0) {
            const seedTrack = likedSongs[0]
            mixes.push({
                id: 'liked-mix',
                title: 'Liked Radio',
                subtitle: 'Songs you love',
                seedTrack,
                gradient: 'linear-gradient(135deg, #E91E63 0%, #9C27B0 100%)',
                thumbnail: seedTrack.thumbnail
            })
        }

        // Discovery mix - random from trending
        if (trending.length > 0) {
            const seedTrack = trending[Math.floor(Math.random() * trending.length)]
            mixes.push({
                id: 'discover-mix',
                title: 'Discover Weekly',
                subtitle: 'New music for you',
                seedTrack,
                gradient: 'linear-gradient(135deg, #7C3AED 0%, #2563EB 100%)',
                thumbnail: seedTrack?.thumbnail || null
            })
        }

        // Chill mix
        if (recentlyPlayed.length > 2) {
            const seedTrack = recentlyPlayed[2]
            mixes.push({
                id: 'chill-mix',
                title: 'Chill Mix',
                subtitle: 'Relax and unwind',
                seedTrack,
                gradient: 'linear-gradient(135deg, #06B6D4 0%, #3B82F6 100%)',
                thumbnail: seedTrack.thumbnail
            })
        }

        return mixes
    }

    const radioMixes = generateRadioMixes()

    const handleRadioMix = (mix) => {
        if (mix.seedTrack) {
            startRadio(mix.seedTrack)
        }
    }

    // Spotify-style quick picks
    const quickPicks = [
        { title: 'Pop Hits', query: 'pop hits 2024', color: '#8b5cf6' },
        { title: 'Hip Hop', query: 'hip hop rap 2024', color: '#f59e0b' },
        { title: 'Rock', query: 'rock music hits', color: '#ef4444' },
        { title: 'Electronic', query: 'electronic dance music', color: '#06b6d4' },
        { title: 'R&B Soul', query: 'r&b soul music', color: '#ec4899' },
        { title: 'Chill Vibes', query: 'chill lofi music', color: '#22d3ee' },
    ]

    const handleQuickPick = async (query) => {
        const results = await searchTracks(query)
        if (results.length) {
            setQueue(results, 0)
        }
    }

    const greeting = getGreeting()

    return (
        <div className="aero-page home-page">
            {/* Greeting */}
            <section className="home-greeting">
                <h1>{greeting}</h1>
            </section>

            {/* Quick Pick Cards - Spotify 2-column grid */}
            <section className="home-quick-picks">
                {quickPicks.map((pick, index) => (
                    <button
                        key={index}
                        className="quick-pick-card"
                        onClick={() => handleQuickPick(pick.query)}
                    >
                        <div
                            className="quick-pick-icon"
                            style={{ background: pick.color }}
                        />
                        <span className="quick-pick-title">{pick.title}</span>
                    </button>
                ))}
            </section>

            {/* Made For You - Radio Mixes */}
            {radioMixes.length > 0 && (
                <section className="aero-section">
                    <h2 className="aero-section-title">Made For You</h2>
                    <div className="home-horizontal-scroll">
                        {radioMixes.map((mix) => (
                            <div
                                key={mix.id}
                                className="radio-mix-card"
                                onClick={() => handleRadioMix(mix)}
                            >
                                <div
                                    className="radio-mix-artwork"
                                    style={{ background: mix.gradient }}
                                >
                                    {mix.thumbnail && (
                                        <img src={mix.thumbnail} alt="" />
                                    )}
                                    <div className="radio-mix-overlay">
                                        <span className="radio-icon">📻</span>
                                    </div>
                                </div>
                                <span className="radio-mix-title">{mix.title}</span>
                                <span className="radio-mix-subtitle">{mix.subtitle}</span>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Recently Played */}
            {recentlyPlayed.length > 0 && (
                <section className="aero-section">
                    <h2 className="aero-section-title">Recently Played</h2>
                    <div className="home-horizontal-scroll">
                        {recentlyPlayed.slice(0, 8).map((track, index) => (
                            <div
                                key={track.videoId || index}
                                className="home-card"
                                onClick={() => setQueue(recentlyPlayed, index)}
                            >
                                <img src={track.thumbnail} alt={track.title} />
                                <span className="home-card-title">{track.title}</span>
                                <span className="home-card-artist">{track.artist}</span>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Trending Now */}
            <section className="aero-section">
                <h2 className="aero-section-title">Trending Now</h2>
                {loading ? (
                    <div className="aero-skeleton-list">
                        {[...Array(5)].map((_, i) => (
                            <Skeleton key={i} height={64} />
                        ))}
                    </div>
                ) : (
                    <TrackList tracks={trending} showIndex={false} />
                )}
            </section>

            {/* Liked Songs */}
            {likedSongs.length > 0 && (
                <section className="aero-section">
                    <h2 className="aero-section-title">Liked Songs</h2>
                    <TrackList tracks={likedSongs.slice(0, 5)} showIndex={false} />
                </section>
            )}
        </div>
    )
}

function getGreeting() {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
}

export default Home
