import { useState, useEffect } from 'react'
import { useLibraryStore } from '../store/libraryStore'
import { usePlayerStore } from '../store/playerStore'
import { getTrendingTracks, searchTracks } from '../services/musicApi'
import TrackList from '../components/TrackList/TrackList'
import './Pages.css'

function Home() {
    const { recentlyPlayed, likedSongs } = useLibraryStore()
    const { setQueue } = usePlayerStore()
    const [trending, setTrending] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchTrending = async () => {
            // Fetch some trending tracks
            const results = await searchTracks('trending music 2024')
            setTrending(results.slice(0, 10))
            setLoading(false)
        }
        fetchTrending()
    }, [])

    const quickPicks = [
        { title: 'Pop Hits', query: 'pop hits 2024', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
        { title: 'Hip Hop', query: 'hip hop 2024', gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
        { title: 'Electronic', query: 'electronic music', gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
        { title: 'Rock', query: 'rock music hits', gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' },
        { title: 'R&B', query: 'r&b music 2024', gradient: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)' },
        { title: 'Chill', query: 'chill vibes music', gradient: 'linear-gradient(135deg, #d299c2 0%, #fef9d7 100%)' },
    ]

    const handleQuickPick = async (query) => {
        const results = await searchTracks(query)
        if (results.length) {
            setQueue(results, 0)
        }
    }

    return (
        <div className="page home-page">
            {/* Hero Section */}
            <section className="hero-section">
                <h1 className="heading-1">Good {getTimeOfDay()}!</h1>
                <p className="text-muted">Ready to discover some music?</p>
            </section>

            {/* Quick Picks */}
            <section className="section">
                <h2 className="section-title">Quick Picks</h2>
                <div className="quick-picks-grid">
                    {quickPicks.map((pick, index) => (
                        <button
                            key={index}
                            className="quick-pick-card"
                            style={{ background: pick.gradient }}
                            onClick={() => handleQuickPick(pick.query)}
                        >
                            <span>{pick.title}</span>
                        </button>
                    ))}
                </div>
            </section>

            {/* Recently Played */}
            {recentlyPlayed.length > 0 && (
                <section className="section">
                    <h2 className="section-title">Recently Played</h2>
                    <TrackList tracks={recentlyPlayed.slice(0, 5)} />
                </section>
            )}

            {/* Trending */}
            <section className="section">
                <h2 className="section-title">Trending Now</h2>
                {loading ? (
                    <div className="loading-container">
                        <div className="loading-spinner" />
                    </div>
                ) : (
                    <TrackList tracks={trending} />
                )}
            </section>

            {/* Liked Songs Preview */}
            {likedSongs.length > 0 && (
                <section className="section">
                    <h2 className="section-title">Your Liked Songs</h2>
                    <TrackList tracks={likedSongs.slice(0, 5)} />
                </section>
            )}
        </div>
    )
}

function getTimeOfDay() {
    const hour = new Date().getHours()
    if (hour < 12) return 'Morning'
    if (hour < 18) return 'Afternoon'
    return 'Evening'
}

export default Home
