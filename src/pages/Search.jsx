import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { searchTracks } from '../services/musicApi'
import TrackList from '../components/TrackList/TrackList'
import Skeleton from '../components/Skeleton/Skeleton'
import './Pages.css'

const Icons = {
    Search: () => (
        <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor">
            <path d="M10.533 1.279c-5.18 0-9.407 4.14-9.407 9.279s4.226 9.279 9.407 9.279c2.234 0 4.29-.77 5.907-2.058l4.353 4.353a1 1 0 1 0 1.414-1.414l-4.344-4.344a9.157 9.157 0 0 0 2.077-5.816c0-5.14-4.226-9.28-9.407-9.28zm-7.407 9.279c0-4.006 3.302-7.28 7.407-7.28s7.407 3.274 7.407 7.28-3.302 7.279-7.407 7.279-7.407-3.273-7.407-7.28z" />
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
    const [searchParams, setSearchParams] = useSearchParams()
    const query = searchParams.get('q') || ''
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

    const handleGenreClick = (genreQuery) => {
        setSearchParams({ q: genreQuery })
    }

    return (
        <div className="page search-page">
            {!query ? (
                <>
                    <section className="section">
                        <h1 className="heading-2">Browse All</h1>
                        <div className="genres-grid">
                            {genres.map((genre, index) => (
                                <button
                                    key={index}
                                    className="genre-card"
                                    style={{ backgroundColor: genre.color }}
                                    onClick={() => handleGenreClick(genre.query)}
                                >
                                    <span>{genre.name}</span>
                                </button>
                            ))}
                        </div>
                    </section>
                </>
            ) : (
                <>
                    <section className="section">
                        <h1 className="heading-2">
                            Results for "{query}"
                        </h1>

                        {loading ? (
                            <Skeleton type="track" count={8} />
                        ) : results.length > 0 ? (
                            <TrackList tracks={results} />
                        ) : (
                            <div className="empty-state">
                                <Icons.Search />
                                <h3>No results found</h3>
                                <p>Try different keywords or browse by genre</p>
                            </div>
                        )}
                    </section>
                </>
            )}
        </div>
    )
}

export default Search
