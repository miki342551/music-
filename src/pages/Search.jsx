import { useState, useEffect, useRef } from 'react'
import { searchTracks, getSearchSuggestions } from '../services/musicApi'
import TrackList from '../components/TrackList/TrackList'
import Skeleton from '../components/Skeleton/Skeleton'
import './Pages.css'

const Icons = {
    Search: () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
    ),
    Clock: () => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12,6 12,12 16,14" />
        </svg>
    ),
    TrendingUp: () => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="23,6 13.5,15.5 8.5,10.5 1,18" />
            <polyline points="17,6 23,6 23,12" />
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
    const [suggestions, setSuggestions] = useState([])
    const [showSuggestions, setShowSuggestions] = useState(false)
    const [recentSearches, setRecentSearches] = useState([])
    const searchRef = useRef(null)
    const debounceRef = useRef(null)

    // Load recent searches from localStorage
    useEffect(() => {
        const saved = localStorage.getItem('recentSearches')
        if (saved) {
            setRecentSearches(JSON.parse(saved).slice(0, 5))
        }
    }, [])

    // Fetch suggestions as user types
    useEffect(() => {
        if (debounceRef.current) {
            clearTimeout(debounceRef.current)
        }

        if (inputValue.length < 2) {
            setSuggestions([])
            return
        }

        debounceRef.current = setTimeout(async () => {
            const results = await getSearchSuggestions(inputValue)
            setSuggestions(results.slice(0, 8))
        }, 300) // 300ms debounce

        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current)
            }
        }
    }, [inputValue])

    // Close suggestions when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setShowSuggestions(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    useEffect(() => {
        if (query) {
            performSearch(query)
        }
    }, [query])

    const performSearch = async (searchQuery) => {
        setLoading(true)
        setShowSuggestions(false)
        const tracks = await searchTracks(searchQuery)
        setResults(tracks)
        setLoading(false)

        // Save to recent searches
        const updated = [searchQuery, ...recentSearches.filter(s => s !== searchQuery)].slice(0, 5)
        setRecentSearches(updated)
        localStorage.setItem('recentSearches', JSON.stringify(updated))
    }

    const handleSearchSubmit = (e) => {
        e.preventDefault()
        if (inputValue.trim()) {
            setQuery(inputValue.trim())
        }
    }

    const handleSuggestionClick = (suggestion) => {
        setInputValue(suggestion)
        setQuery(suggestion)
        setShowSuggestions(false)
    }

    const handleGenreClick = (genreQuery) => {
        setQuery(genreQuery)
        setInputValue(genreQuery)
    }

    const clearSearch = () => {
        setQuery('')
        setInputValue('')
        setResults([])
        setSuggestions([])
    }

    const clearRecentSearches = () => {
        setRecentSearches([])
        localStorage.removeItem('recentSearches')
    }

    return (
        <div className="aero-page">
            {/* Search Bar */}
            <div className="aero-search-container" ref={searchRef}>
                <form className="aero-search-bar" onSubmit={handleSearchSubmit}>
                    <div className="aero-search-icon">
                        <Icons.Search />
                    </div>
                    <input
                        type="text"
                        placeholder="What do you want to listen to?"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onFocus={() => setShowSuggestions(true)}
                        className="aero-search-input"
                        autoComplete="off"
                    />
                    {inputValue && (
                        <button type="button" className="aero-search-clear" onClick={clearSearch}>
                            ✕
                        </button>
                    )}
                </form>

                {/* Suggestions Dropdown */}
                {showSuggestions && (suggestions.length > 0 || (recentSearches.length > 0 && !inputValue)) && (
                    <div className="aero-suggestions-dropdown">
                        {/* Show recent searches when input is empty */}
                        {!inputValue && recentSearches.length > 0 && (
                            <div className="aero-suggestions-section">
                                <div className="aero-suggestions-header">
                                    <span>Recent searches</span>
                                    <button onClick={clearRecentSearches} className="aero-suggestions-clear">
                                        Clear
                                    </button>
                                </div>
                                {recentSearches.map((recent, index) => (
                                    <button
                                        key={index}
                                        className="aero-suggestion-item"
                                        onClick={() => handleSuggestionClick(recent)}
                                    >
                                        <Icons.Clock />
                                        <span>{recent}</span>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Show suggestions when typing */}
                        {inputValue && suggestions.length > 0 && (
                            <div className="aero-suggestions-section">
                                {suggestions.map((suggestion, index) => (
                                    <button
                                        key={index}
                                        className="aero-suggestion-item"
                                        onClick={() => handleSuggestionClick(suggestion)}
                                    >
                                        <Icons.TrendingUp />
                                        <span>{suggestion}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

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

