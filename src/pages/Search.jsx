import { useState, useEffect } from 'react'
import { searchTracks } from '../services/musicApi'
import TrackList from '../components/TrackList/TrackList'
import Skeleton from '../components/Skeleton/Skeleton'
import './Pages.css'

const Icons = {
    Search: () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
    )
}

const genres = [
    { name: 'Pop', color: '#8b5cf6', query: 'pop music hits' },
    { name: 'Hip-Hop', color: '#f59e0b', query: 'hip hop rap music' },
    { name: 'Rock', color: '#ef4444', query: 'rock music hits' },
    { name: 'Electronic', color: '#06b6d4', query: 'electronic dance music' },
    { name: 'R&B', color: '#ec4899', query: 'r&b soul music' },
    { name: 'Jazz', color: '#84cc16', query: 'jazz music classics' },
    { name: 'Classical', color: '#a855f7', query: 'classical music' },
    { name: 'Country', color: '#f97316', query: 'country music hits' },
    { name: 'Latin', color: '#14b8a6', query: 'latin music reggaeton' },
    { name: 'Indie', color: '#6366f1', query: 'indie alternative music' },
    { name: 'K-Pop', color: '#f472b6', query: 'kpop korean music' },
    { name: 'Chill', color: '#22d3ee', query: 'chill lofi music' },
]

function Search() {
    const [query, setQuery] = useState('')
    const [inputValue, setInputValue] = useState('')
    const [results, setResults] = useState([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (query) {
            performSearch(query)
        }
    }, [query])

    const performSearch = async (searchQuery) => {
        setLoading(true)
        const tracks = await searchTracks(searchQuery)
        setResults(tracks)
        setLoading(false)
    }

    const handleSearchSubmit = (e) => {
        e.preventDefault()
        if (inputValue.trim()) {
            setQuery(inputValue.trim())
        }
    }

    const handleGenreClick = (genreQuery) => {
        setQuery(genreQuery)
        setInputValue(genreQuery)
    }

    const clearSearch = () => {
        setQuery('')
        setInputValue('')
        setResults([])
    }

    return (
        <div className="aero-page">
            {/* Search Bar */}
            <form className="aero-search-bar" onSubmit={handleSearchSubmit}>
                <div className="aero-search-icon">
                    <Icons.Search />
                </div>
                <input
                    type="text"
                    placeholder="What do you want to listen to?"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    className="aero-search-input"
                />
                {inputValue && (
                    <button type="button" className="aero-search-clear" onClick={clearSearch}>
                        ✕
                    </button>
                )}
            </form>

            {!query ? (
                <>
                    <section className="aero-section">
                        <h2 className="aero-section-title">Browse Genres</h2>
                        <div className="aero-genres-grid">
                            {genres.map((genre) => (
                                <button
                                    key={genre.name}
                                    className="aero-genre-card"
                                    style={{
                                        background: `linear-gradient(135deg, ${genre.color}dd, ${genre.color}88)`,
                                        boxShadow: `0 4px 20px ${genre.color}40`
                                    }}
                                    onClick={() => handleGenreClick(genre.query)}
                                >
                                    {genre.name}
                                </button>
                            ))}
                        </div>
                    </section>
                </>
            ) : (
                <section className="aero-section">
                    <div className="aero-search-header">
                        <h2 className="aero-section-title">Results for "{query}"</h2>
                        <button className="aero-clear-btn" onClick={clearSearch}>
                            Clear
                        </button>
                    </div>

                    {loading ? (
                        <div className="aero-skeleton-list">
                            {[...Array(6)].map((_, i) => (
                                <Skeleton key={i} height={64} />
                            ))}
                        </div>
                    ) : results.length > 0 ? (
                        <TrackList tracks={results} />
                    ) : (
                        <div className="aero-empty-state">
                            <p>No results found</p>
                        </div>
                    )}
                </section>
            )}
        </div>
    )
}

export default Search
