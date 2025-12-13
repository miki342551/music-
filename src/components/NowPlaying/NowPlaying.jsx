import { useState, useEffect, useRef } from 'react'
import { usePlayerStore } from '../../store/playerStore'
import { useLibraryStore } from '../../store/libraryStore'
import { formatDuration } from '../../services/musicApi'
import { hapticLight, hapticMedium, hapticSuccess } from '../../utils/haptics'
import './NowPlaying.css'

const Icons = {
    Back: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
    ),
    Info: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
    ),
    Play: () => (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
        </svg>
    ),
    Pause: () => (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
        </svg>
    ),
    SkipPrev: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
        </svg>
    ),
    SkipNext: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
        </svg>
    ),
    Heart: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
    ),
    HeartFilled: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="none">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
    ),
    Volume: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
        </svg>
    ),
    Shuffle: () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="16 3 21 3 21 8" />
            <line x1="4" y1="20" x2="21" y2="3" />
            <polyline points="21 16 21 21 16 21" />
            <line x1="15" y1="15" x2="21" y2="21" />
            <line x1="4" y1="4" x2="9" y2="9" />
        </svg>
    ),
    Repeat: () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="17 1 21 5 17 9" />
            <path d="M3 11V9a4 4 0 0 1 4-4h14" />
            <polyline points="7 23 3 19 7 15" />
            <path d="M21 13v2a4 4 0 0 1-4 4H3" />
        </svg>
    ),
    List: () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="8" y1="6" x2="21" y2="6" />
            <line x1="8" y1="12" x2="21" y2="12" />
            <line x1="8" y1="18" x2="21" y2="18" />
            <line x1="3" y1="6" x2="3.01" y2="6" />
            <line x1="3" y1="12" x2="3.01" y2="12" />
            <line x1="3" y1="18" x2="3.01" y2="18" />
        </svg>
    ),
    More: () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="1" />
            <circle cx="19" cy="12" r="1" />
            <circle cx="5" cy="12" r="1" />
        </svg>
    )
}

function NowPlaying({ isOpen, onClose }) {
    const {
        currentTrack,
        isPlaying,
        currentTime,
        duration,
        shuffle,
        repeat,
        togglePlay,
        playNext,
        playPrevious,
        seek,
        toggleShuffle,
        cycleRepeat
    } = usePlayerStore()

    const { isLiked, toggleLike } = useLibraryStore()
    const [touchStart, setTouchStart] = useState(null)
    const [isDragging, setIsDragging] = useState(false)

    const handleSeek = (e) => {
        const rect = e.currentTarget.getBoundingClientRect()
        const percent = (e.clientX - rect.left) / rect.width
        seek(percent * duration)
    }

    const handleTouchStart = (e) => {
        setTouchStart(e.touches[0].clientY)
    }

    const handleTouchMove = (e) => {
        if (!touchStart) return
        const diff = e.touches[0].clientY - touchStart
        if (diff > 100) {
            onClose()
            setTouchStart(null)
        }
    }

    const handleControlClick = (action) => {
        hapticLight()
        action()
    }

    const handlePlayClick = () => {
        hapticMedium()
        togglePlay()
    }

    const progress = duration ? (currentTime / duration) * 100 : 0
    const liked = currentTrack ? isLiked(currentTrack.videoId) : false

    if (!currentTrack) return null

    return (
        <div
            className={`now-playing ${isOpen ? 'open' : ''}`}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
        >
            {/* Top Bar */}
            <div className="np-top-bar">
                <button className="np-icon-btn" onClick={onClose}>
                    <Icons.Back />
                </button>
                <span className="np-header-title">Now Playing</span>
                <button className="np-icon-btn">
                    <Icons.Info />
                </button>
            </div>

            {/* Album Art */}
            <div className="np-art-wrapper">
                <div className="np-art-shadow" />
                <img
                    className="np-art-image"
                    src={currentTrack.thumbnail?.replace('mqdefault', 'maxresdefault') || currentTrack.thumbnail}
                    alt={currentTrack.title}
                />
            </div>

            {/* Track Info */}
            <div className="np-track-info">
                <div className="np-text-content">
                    <h2 className="np-title-text">{currentTrack.title}</h2>
                    <div className="np-artist-row">
                        <p className="np-artist-text">{currentTrack.artist}</p>
                        <button className="np-follow-btn">Follow</button>
                    </div>
                </div>
            </div>

            {/* Progress */}
            <div className="np-progress-section">
                <div className="np-progress-track" onClick={handleSeek}>
                    <div className="np-progress-fill" style={{ width: `${progress}%` }} />
                    <div className="np-progress-handle" style={{ left: `${progress}%` }} />
                </div>
                <div className="np-time-labels">
                    <span>{formatDuration(currentTime)}</span>
                    <span>{formatDuration(duration)}</span>
                </div>
            </div>

            {/* Control Pad */}
            <div className="np-control-pad-container">
                <div className="np-control-pad">
                    {/* Top: Heart */}
                    <button
                        className={`np-pad-btn top ${liked ? 'active' : ''}`}
                        onClick={() => {
                            hapticSuccess()
                            toggleLike(currentTrack)
                        }}
                    >
                        {liked ? <Icons.HeartFilled /> : <Icons.Heart />}
                    </button>

                    {/* Left: Previous */}
                    <button
                        className="np-pad-btn left"
                        onClick={() => handleControlClick(playPrevious)}
                    >
                        <Icons.SkipPrev />
                    </button>

                    {/* Center: Play */}
                    <button
                        className="np-pad-btn center"
                        onClick={handlePlayClick}
                    >
                        {isPlaying ? <Icons.Pause /> : <Icons.Play />}
                    </button>

                    {/* Right: Next */}
                    <button
                        className="np-pad-btn right"
                        onClick={() => handleControlClick(playNext)}
                    >
                        <Icons.SkipNext />
                    </button>

                    {/* Bottom: Volume */}
                    <button className="np-pad-btn bottom">
                        <Icons.Volume />
                    </button>
                </div>
            </div>

            {/* Bottom Controls */}
            <div className="np-bottom-controls">
                <button
                    className={`np-icon-btn ${shuffle ? 'active' : ''}`}
                    onClick={() => handleControlClick(toggleShuffle)}
                >
                    <Icons.Shuffle />
                </button>
                <button className="np-icon-btn">
                    <Icons.More />
                </button>
                <button className="np-icon-btn">
                    <Icons.List />
                </button>
                <button
                    className={`np-icon-btn ${repeat !== 'off' ? 'active' : ''}`}
                    onClick={() => handleControlClick(cycleRepeat)}
                >
                    <Icons.Repeat />
                </button>
            </div>
        </div>
    )
}

export default NowPlaying
