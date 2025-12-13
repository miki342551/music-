import React, { useState } from 'react'
import { usePlayerStore } from '../../store/playerStore'
import { useLibraryStore } from '../../store/libraryStore'
import { formatDuration } from '../../services/musicApi'
import { hapticLight, hapticMedium, hapticSuccess } from '../../utils/haptics'
import './Player.css'

const Icons = {
    Back: () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
    ),
    Info: () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
    ),
    Play: () => (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
        </svg>
    ),
    Pause: () => (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
        </svg>
    ),
    SkipPrev: () => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
        </svg>
    ),
    SkipNext: () => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
        </svg>
    ),
    Heart: () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
    ),
    HeartFilled: () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
    ),
    Volume: () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
        </svg>
    ),
    Repeat: () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="17 1 21 5 17 9" />
            <path d="M3 11V9a4 4 0 0 1 4-4h14" />
            <polyline points="7 23 3 19 7 15" />
            <path d="M21 13v2a4 4 0 0 1-4 4H3" />
        </svg>
    ),
    List: () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="8" y1="6" x2="21" y2="6" />
            <line x1="8" y1="12" x2="21" y2="12" />
            <line x1="8" y1="18" x2="21" y2="18" />
            <line x1="3" y1="6" x2="3.01" y2="6" />
            <line x1="3" y1="12" x2="3.01" y2="12" />
            <line x1="3" y1="18" x2="3.01" y2="18" />
        </svg>
    ),
    More: () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="1" />
            <circle cx="19" cy="12" r="1" />
            <circle cx="5" cy="12" r="1" />
        </svg>
    ),
    Music: () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18V5l12-2v13" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="16" r="3" />
        </svg>
    )
}

function Player({ onExpand }) {
    const {
        currentTrack,
        isPlaying,
        currentTime,
        duration,
        shuffle,
        repeat,
        isLoading,
        togglePlay,
        playNext,
        playPrevious,
        seek,
        toggleShuffle,
        cycleRepeat
    } = usePlayerStore()

    const { isLiked, toggleLike } = useLibraryStore()

    // Swipe handler
    const touchStartRef = React.useRef({ x: 0, y: 0 })
    const handlePlayerTouchStart = (e) => {
        touchStartRef.current = {
            x: e.touches[0].clientX,
            y: e.touches[0].clientY
        }
    }
    const handlePlayerTouchEnd = (e) => {
        const deltaY = touchStartRef.current.y - e.changedTouches[0].clientY
        if (deltaY > 50) {
            hapticLight()
            onExpand?.()
        }
    }

    const handleSeek = (e) => {
        const rect = e.currentTarget.getBoundingClientRect()
        const percent = (e.clientX - rect.left) / rect.width
        seek(percent * duration)
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

    if (!currentTrack) {
        return (
            <div className="player-container empty">
                <div className="player-empty-state">
                    <span>No track playing</span>
                </div>
            </div>
        )
    }

    return (
        <div
            className="player-container"
            onTouchStart={handlePlayerTouchStart}
            onTouchEnd={handlePlayerTouchEnd}
        >
            {/* Top Bar */}
            <div className="player-topbar">
                <button className="player-icon-btn" onClick={onExpand}>
                    <Icons.Back />
                </button>
                <span className="player-header-title">Now Playing</span>
                <button className="player-icon-btn">
                    <Icons.Info />
                </button>
            </div>

            {/* Album Art */}
            <div className="player-artwork" onClick={onExpand}>
                <img
                    src={currentTrack.thumbnail}
                    alt={currentTrack.title}
                />
            </div>

            {/* Track Info */}
            <div className="player-track-section">
                <div className="player-track-left">
                    <img
                        src={currentTrack.thumbnail}
                        alt=""
                        className="player-mini-art"
                    />
                    <div className="player-track-text">
                        <span className="player-track-title">{currentTrack.title}</span>
                        <span className="player-track-artist">{currentTrack.artist}</span>
                    </div>
                </div>
                <button className="player-follow-btn">Follow</button>
            </div>

            {/* Progress */}
            <div className="player-progress-section">
                <div className="player-progress-track" onClick={handleSeek}>
                    <div className="player-progress-fill" style={{ width: `${progress}%` }} />
                    <div className="player-progress-handle" style={{ left: `${progress}%` }} />
                </div>
                <div className="player-time-labels">
                    <span>{formatDuration(currentTime)}</span>
                    <span>-{formatDuration(duration - currentTime)}</span>
                </div>
            </div>

            {/* Control Pad */}
            <div className="player-control-wrapper">
                {/* Side Controls Left */}
                <button
                    className="player-side-btn left"
                    onClick={() => handleControlClick(() => { })}
                >
                    <Icons.More />
                </button>

                {/* Main Control Pad */}
                <div className="player-control-pad">
                    {/* Top: Heart */}
                    <button
                        className={`player-pad-btn top ${liked ? 'active' : ''}`}
                        onClick={() => {
                            hapticSuccess()
                            toggleLike(currentTrack)
                        }}
                    >
                        {liked ? <Icons.HeartFilled /> : <Icons.Heart />}
                    </button>

                    {/* Left: Previous */}
                    <button
                        className="player-pad-btn left"
                        onClick={() => handleControlClick(playPrevious)}
                    >
                        <Icons.SkipPrev />
                    </button>

                    {/* Center: Play */}
                    <button
                        className="player-pad-btn center"
                        onClick={handlePlayClick}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <div className="player-loading-spinner" />
                        ) : isPlaying ? (
                            <Icons.Pause />
                        ) : (
                            <Icons.Play />
                        )}
                    </button>

                    {/* Right: Next */}
                    <button
                        className="player-pad-btn right"
                        onClick={() => handleControlClick(playNext)}
                    >
                        <Icons.SkipNext />
                    </button>

                    {/* Bottom: Volume */}
                    <button className="player-pad-btn bottom">
                        <Icons.Volume />
                    </button>
                </div>

                {/* Side Controls Right */}
                <button className="player-side-btn right">
                    <Icons.List />
                </button>
            </div>

            {/* Bottom Controls */}
            <div className="player-bottom-controls">
                <button
                    className={`player-icon-btn ${repeat !== 'off' ? 'active' : ''}`}
                    onClick={() => handleControlClick(cycleRepeat)}
                >
                    <Icons.Repeat />
                </button>
                <button className="player-icon-btn">
                    <Icons.Volume />
                </button>
                <button className="player-icon-btn">
                    <Icons.Music />
                </button>
            </div>
        </div>
    )
}

export default Player
