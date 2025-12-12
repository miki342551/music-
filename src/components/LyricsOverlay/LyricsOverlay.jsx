import { useState, useEffect, useRef } from 'react'
import { usePlayerStore } from '../../store/playerStore'
import { getLyrics, getCurrentLyricIndex } from '../../services/lyricsApi'
import './LyricsOverlay.css'

const Icons = {
    Close: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
        </svg>
    ),
    MusicNote: () => (
        <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
        </svg>
    )
}

function LyricsOverlay() {
    const { currentTrack, currentTime, duration, toggleLyrics } = usePlayerStore()
    const [lyrics, setLyrics] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const lyricsRef = useRef(null)
    const activeLineRef = useRef(null)

    // Fetch lyrics when track changes
    useEffect(() => {
        if (!currentTrack) return

        const fetchLyrics = async () => {
            setLoading(true)
            setError(null)

            try {
                const data = await getLyrics(
                    currentTrack.title,
                    currentTrack.artist,
                    duration
                )

                if (data?.syncedLyrics) {
                    setLyrics({ type: 'synced', lines: data.syncedLyrics })
                } else if (data?.plainLyrics) {
                    setLyrics({ type: 'plain', text: data.plainLyrics })
                } else {
                    setLyrics(null)
                    setError('No lyrics found')
                }
            } catch (err) {
                setError('Failed to fetch lyrics')
            } finally {
                setLoading(false)
            }
        }

        fetchLyrics()
    }, [currentTrack?.videoId, duration])

    // Auto-scroll to active line
    useEffect(() => {
        if (activeLineRef.current && lyricsRef.current) {
            const container = lyricsRef.current
            const activeLine = activeLineRef.current
            const containerRect = container.getBoundingClientRect()
            const lineRect = activeLine.getBoundingClientRect()

            const scrollTo = activeLine.offsetTop - container.offsetHeight / 2 + lineRect.height / 2

            container.scrollTo({
                top: scrollTo,
                behavior: 'smooth'
            })
        }
    }, [currentTime])

    const currentIndex = lyrics?.type === 'synced'
        ? getCurrentLyricIndex(lyrics.lines, currentTime)
        : -1

    return (
        <div className="lyrics-overlay">
            {/* Background */}
            <div
                className="lyrics-background"
                style={{
                    backgroundImage: currentTrack?.thumbnail
                        ? `url(${currentTrack.thumbnail})`
                        : 'none'
                }}
            />

            {/* Header */}
            <div className="lyrics-header">
                <div className="lyrics-track-info">
                    {currentTrack && (
                        <>
                            <span className="lyrics-track-title">{currentTrack.title}</span>
                            <span className="lyrics-track-artist">{currentTrack.artist}</span>
                        </>
                    )}
                </div>
                <button className="lyrics-close-btn" onClick={toggleLyrics}>
                    <Icons.Close />
                </button>
            </div>

            {/* Content */}
            <div className="lyrics-content" ref={lyricsRef}>
                {loading && (
                    <div className="lyrics-loading">
                        <div className="loading-spinner large" />
                        <span>Loading lyrics...</span>
                    </div>
                )}

                {error && !loading && (
                    <div className="lyrics-error">
                        <Icons.MusicNote />
                        <span>{error}</span>
                    </div>
                )}

                {lyrics?.type === 'synced' && (
                    <div className="lyrics-synced">
                        {lyrics.lines.map((line, index) => (
                            <p
                                key={index}
                                ref={index === currentIndex ? activeLineRef : null}
                                className={`lyrics-line ${index === currentIndex ? 'active' : ''} ${index < currentIndex ? 'past' : ''}`}
                            >
                                {line.text}
                            </p>
                        ))}
                    </div>
                )}

                {lyrics?.type === 'plain' && (
                    <div className="lyrics-plain">
                        {lyrics.text.split('\n').map((line, index) => (
                            <p key={index} className="lyrics-line plain">
                                {line || '\u00A0'}
                            </p>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

export default LyricsOverlay
