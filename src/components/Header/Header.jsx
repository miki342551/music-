import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { getSearchSuggestions } from '../../services/musicApi'
import './Header.css'

const Icons = {
    ChevronLeft: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
        </svg>
    ),
    ChevronRight: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z" />
        </svg>
    ),
    Search: () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M10.533 1.279c-5.18 0-9.407 4.14-9.407 9.279s4.226 9.279 9.407 9.279c2.234 0 4.29-.77 5.907-2.058l4.353 4.353a1 1 0 1 0 1.414-1.414l-4.344-4.344a9.157 9.157 0 0 0 2.077-5.816c0-5.14-4.226-9.28-9.407-9.28zm-7.407 9.279c0-4.006 3.302-7.28 7.407-7.28s7.407 3.274 7.407 7.28-3.302 7.279-7.407 7.279-7.407-3.273-7.407-7.28z" />
        </svg>
    ),
    Close: () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
    ),
    User: () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
        </svg>
    )
}

function Header() {
    const navigate = useNavigate()
    const location = useLocation()
    const [searchQuery, setSearchQuery] = useState('')
    const [suggestions, setSuggestions] = useState([])
    const [showSuggestions, setShowSuggestions] = useState(false)
    const [selectedIndex, setSelectedIndex] = useState(-1)
    const searchRef = useRef(null)
    const isSearchPage = location.pathname === '/search'

    // Debounce timer ref
    const debounceRef = useRef(null)

    // Fetch suggestions when query changes
    useEffect(() => {
        if (debounceRef.current) {
            clearTimeout(debounceRef.current)
        }

        if (searchQuery.length < 2) {
            setSuggestions([])
            return
        }

        debounceRef.current = setTimeout(async () => {
            const results = await getSearchSuggestions(searchQuery)
            setSuggestions(results)
            setSelectedIndex(-1)
        }, 200)

        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current)
            }
        }
    }, [searchQuery])

    // Close suggestions when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (searchRef.current && !searchRef.current.contains(e.target)) {
                setShowSuggestions(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleSearch = (e) => {
        e.preventDefault()
        if (searchQuery.trim()) {
            navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
            setShowSuggestions(false)
        }
    }

    const handleSuggestionClick = (suggestion) => {
        setSearchQuery(suggestion)
        navigate(`/search?q=${encodeURIComponent(suggestion)}`)
        setShowSuggestions(false)
    }

    const handleKeyDown = (e) => {
        if (!showSuggestions || suggestions.length === 0) return

        if (e.key === 'ArrowDown') {
            e.preventDefault()
            setSelectedIndex(prev =>
                prev < suggestions.length - 1 ? prev + 1 : prev
            )
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setSelectedIndex(prev => prev > 0 ? prev - 1 : -1)
        } else if (e.key === 'Enter' && selectedIndex >= 0) {
            e.preventDefault()
            handleSuggestionClick(suggestions[selectedIndex])
        } else if (e.key === 'Escape') {
            setShowSuggestions(false)
        }
    }

    const clearSearch = () => {
        setSearchQuery('')
        setSuggestions([])
    }

    return (
        <header className="header glass">
            <div className="header-nav">
                <button
                    className="header-nav-btn"
                    onClick={() => navigate(-1)}
                    title="Go back"
                >
                    <Icons.ChevronLeft />
                </button>
                <button
                    className="header-nav-btn"
                    onClick={() => navigate(1)}
                    title="Go forward"
                >
                    <Icons.ChevronRight />
                </button>
            </div>

            <form className="header-search" onSubmit={handleSearch} ref={searchRef}>
                <div className="search-input-wrapper">
                    <Icons.Search />
                    <input
                        type="text"
                        placeholder="What do you want to listen to?"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={() => {
                            setShowSuggestions(true)
                            if (!isSearchPage) navigate('/search')
                        }}
                        onKeyDown={handleKeyDown}
                    />
                    {searchQuery && (
                        <button
                            type="button"
                            className="search-clear"
                            onClick={clearSearch}
                        >
                            <Icons.Close />
                        </button>
                    )}
                </div>

                {showSuggestions && suggestions.length > 0 && (
                    <div className="search-suggestions">
                        {suggestions.map((suggestion, index) => (
                            <button
                                key={index}
                                type="button"
                                className={`suggestion-item ${index === selectedIndex ? 'selected' : ''}`}
                                onClick={() => handleSuggestionClick(suggestion)}
                                onMouseEnter={() => setSelectedIndex(index)}
                            >
                                <Icons.Search />
                                <span>{suggestion}</span>
                            </button>
                        ))}
                    </div>
                )}
            </form>

            <div className="header-actions">
                <button className="header-user-btn">
                    <Icons.User />
                </button>
            </div>
        </header>
    )
}

export default Header
