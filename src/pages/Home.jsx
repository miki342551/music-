import { useState, useEffect } from 'react'
import { useLibraryStore } from '../store/libraryStore'
import { usePlayerStore } from '../store/playerStore'
import { getTrendingTracks, searchTracks, getRelatedTracks, getMadeForYou } from '../services/musicApi'
import TrackList from '../components/TrackList/TrackList'
import Skeleton from '../components/Skeleton/Skeleton'
import './Pages.css'

function Home() {
    const { recentlyPlayed, likedSongs } = useLibraryStore()
    const { setQueue, startRadio, playTrack } = usePlayerStore()
    const [trending, setTrending] = useState([])
    const [loading, setLoading] = useState(true)
    const [madeForYouMixes, setMadeForYouMixes] = useState([])
    const [mixesLoading, setMixesLoading] = useState(true)

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

    // Fetch personalized "Made For You" mixes from Spotify
    useEffect(() => {
        const fetchMadeForYou = async () => {
            setMixesLoading(true)
            const mixes = []

            // Get seed tracks from liked songs and recently played
            const seedTracks = [
                ...likedSongs.slice(0, 3),
                ...recentlyPlayed.filter(t => t.spotifyId).slice(0, 2)
            ]

            if (seedTracks.length === 0) {
                // No history - use trending as seeds
                if (trending.length > 0) {
                    const discoverMix = await getMadeForYou(trending.slice(0, 5), 'discovery')
                    if (discoverMix.length > 0) {
                        mixes.push({
                            id: 'discover',
                            title: 'Discover Weekly',
                            subtitle: 'New music for you',
                            tracks: discoverMix,
                            gradient: 'linear-gradient(135deg, #7C3AED 0%, #2563EB 100%)',
                            thumbnail: discoverMix[0]?.thumbnail
                        })
                    }
                }
                setMadeForYouMixes(mixes)
                setMixesLoading(false)
                return
            }

            // Your Mix - Based on your taste
            const yourMix = await getMadeForYou(seedTracks, 'default')
            if (yourMix.length > 0) {
                mixes.push({
                    id: 'your-mix',
                    title: 'Your Mix',
                    subtitle: 'Made for you',
                    tracks: yourMix,
                    gradient: 'linear-gradient(135deg, #1DB954 0%, #191414 100%)',
                    thumbnail: yourMix[0]?.thumbnail
                })
            }

            // Chill Mix
            const chillMix = await getMadeForYou(seedTracks, 'chill')
            if (chillMix.length > 0) {
                mixes.push({
                    id: 'chill-mix',
                    title: 'Chill Mix',
                    subtitle: 'Relax and unwind',
                    tracks: chillMix,
                    gradient: 'linear-gradient(135deg, #06B6D4 0%, #3B82F6 100%)',
                    thumbnail: chillMix[0]?.thumbnail
                })
            }

            // Discover Mix - Less mainstream
            const discoverMix = await getMadeForYou(seedTracks, 'discovery')
            if (discoverMix.length > 0) {
                mixes.push({
                    id: 'discover',
                    title: 'Discover Weekly',
                    subtitle: 'Hidden gems for you',
                    tracks: discoverMix,
                    gradient: 'linear-gradient(135deg, #7C3AED 0%, #2563EB 100%)',
                    thumbnail: discoverMix[0]?.thumbnail
                })
            }

            // Energy Mix
            const energyMix = await getMadeForYou(seedTracks, 'energetic')
            if (energyMix.length > 0) {
                mixes.push({
                    id: 'energy-mix',
                    title: 'Energy Boost',
                    subtitle: 'Get pumped up',
                    tracks: energyMix,
                    gradient: 'linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)',
                    thumbnail: energyMix[0]?.thumbnail
                })
            }

            setMadeForYouMixes(mixes)
            setMixesLoading(false)
        }

        // Only fetch when we have seed data
        if (likedSongs.length > 0 || recentlyPlayed.length > 0 || trending.length > 0) {
            fetchMadeForYou()
        } else {
            setMixesLoading(false)
        }
    }, [likedSongs.length, recentlyPlayed.length, trending.length])

    const handleMixClick = (mix) => {
        if (mix.tracks && mix.tracks.length > 0) {
            setQueue(mix.tracks, 0)
            playTrack(mix.tracks[0])
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

            {/* Made For You - Spotify Personalized Mixes */}
            <section className="aero-section">
                <h2 className="aero-section-title">Made For You</h2>
                {mixesLoading ? (
                    <div className="home-horizontal-scroll">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="radio-mix-card">
                                <Skeleton height={140} style={{ borderRadius: '12px' }} />
                            </div>
                        ))}
                    </div>
                ) : madeForYouMixes.length > 0 ? (
                    <div className="home-horizontal-scroll">
                        {madeForYouMixes.map((mix) => (
                            <div
                                key={mix.id}
                                className="radio-mix-card"
                                onClick={() => handleMixClick(mix)}
                            >
                                <div
                                    className="radio-mix-artwork"
                                    style={{ background: mix.gradient }}
                                >
                                    {mix.thumbnail && (
                                        <img src={mix.thumbnail} alt="" />
                                    )}
                                    <div className="radio-mix-overlay">
                                        <span className="radio-icon">🎵</span>
                                    </div>
                                </div>
                                <span className="radio-mix-title">{mix.title}</span>
                                <span className="radio-mix-subtitle">{mix.subtitle}</span>
                                <span className="radio-mix-count">{mix.tracks?.length || 0} songs</span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="aero-empty-hint">Like some songs to get personalized mixes!</p>
                )}
            </section>

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
