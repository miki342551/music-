import React, { useRef, useState, useEffect } from 'react'
import { usePlayerStore } from '../../store/playerStore'
import { useLibraryStore } from '../../store/libraryStore'
import { formatDuration } from '../../services/musicApi'
import { hapticLight, hapticMedium, hapticSuccess } from '../../utils/haptics'
import './Player.css'

// Icons - Enhanced for visibility
const Icons = {
    Back: () => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
        </svg>
    ),
    Info: () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
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
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
    ),
    HeartFilled: () => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>
    ),
    Volume: () => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
        </svg>
    ),
    Repeat: () => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" />
        </svg>
    ),
    Queue: () => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z" />
        </svg>
    ),
    More: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
        </svg>
    ),
    MusicNote: () => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
        </svg>
    )
}

function Player({ onClose }) {
    const {
        currentTrack,
        isPlaying,
        currentTime,
        duration,
        repeat,
        isLoading,
        togglePlay,
        playNext,
        playPrevious,
        seek,
        cycleRepeat
    } = usePlayerStore()

    const { isLiked, toggleLike } = useLibraryStore()

    const [showQueue, setShowQueue] = useState(false)
    const progressRef = useRef(null)

    const handleSeek = (e) => {
        if (!progressRef.current) return
        const rect = progressRef.current.getBoundingClientRect()
        const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
        seek(percent * duration)
    }

    const handleTouchSeek = (e) => {
        if (!progressRef.current) return
        const touch = e.touches[0]
        const rect = progressRef.current.getBoundingClientRect()
        const percent = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width))
        seek(percent * duration)
    }

    const handlePlayClick = () => {
        hapticMedium()
        togglePlay()
    }

    const progress = duration ? (currentTime / duration) * 100 : 0
    const liked = currentTrack ? isLiked(currentTrack) : false
    const remainingTime = duration - currentTime

    if (!currentTrack) {
        return (
            <div className="neo-player">
                <div className="neo-player-empty">
                    <div className="neo-empty-icon">🎵</div>
                    <h2>No track playing</h2>
                    <p>Search for music to start listening</p>
                </div>
            </div>
        )
    }

    return (
        <div className="neo-player">
            {/* Top Bar */}
            <div className="neo-top-bar">
                <button className="neo-icon-btn" onClick={onClose}>
                    <Icons.Back />
                </button>
                <span className="neo-now-playing">Now Playing</span>
                <button className="neo-icon-btn">
                    <Icons.Info />
                </button>
            </div>

            {/* Album Art */}
            <div className="neo-album-container">
                <img
                    src={currentTrack.thumbnail}
                    alt={currentTrack.title}
                    className="neo-album-art"
                />
            </div>

            {/* Track Info Card */}
            <div className="neo-track-card">
                <img
                    src={currentTrack.thumbnail}
                    alt=""
                    className="neo-track-thumb"
                />
                <div className="neo-track-info">
                    <span className="neo-track-artist">{currentTrack.artist}</span>
                    <span className="neo-track-title">{currentTrack.title}</span>
                </div>
                <button className="neo-follow-btn">Follow</button>
            </div>

            {/* Progress Bar */}
            <div className="neo-progress-section">
                <div
                    ref={progressRef}
                    className="neo-progress-bar"
                    onClick={handleSeek}
                    onTouchMove={handleTouchSeek}
                >
                    <div
                        className="neo-progress-fill"
                        style={{ width: `${progress}%` }}
                    />
                </div>
                <div className="neo-time">
                    <span>{formatDuration(currentTime)}</span>
                    <span>-{formatDuration(remainingTime)}</span>
                </div>
            </div>

            {/* Control Pad Area */}
            <div className="neo-controls-area">
                {/* Left - Options */}
                <button className="neo-side-btn">
                    <Icons.More />
                </button>

                {/* Center - Circular Control Pad */}
                <div className="neo-control-pad">
                    {/* Heart - Top */}
                    <button
                        className={`neo-pad-btn neo-pad-top ${liked ? 'liked' : ''}`}
                        onClick={() => { hapticSuccess(); toggleLike(currentTrack) }}
                    >
                        {liked ? <Icons.HeartFilled /> : <Icons.Heart />}
                    </button>

                    {/* Previous - Left */}
                    <button
                        className="neo-pad-btn neo-pad-left"
                        onClick={() => { hapticLight(); playPrevious() }}
                    >
                        <Icons.SkipPrev />
                    </button>

                    {/* Play/Pause - Center */}
                    <button
                        className="neo-play-btn"
                        onClick={handlePlayClick}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <div className="neo-spinner" />
                        ) : isPlaying ? (
                            <Icons.Pause />
                        ) : (
                            <Icons.Play />
                        )}
                    </button>

                    {/* Next - Right */}
                    <button
                        className="neo-pad-btn neo-pad-right"
                        onClick={() => { hapticLight(); playNext() }}
                    >
                        <Icons.SkipNext />
                    </button>

                    {/* Volume - Bottom */}
                    <button className="neo-pad-btn neo-pad-bottom">
                        <Icons.Volume />
                    </button>
                </div>

                {/* Right - Queue */}
                <button className="neo-side-btn" onClick={() => setShowQueue(!showQueue)}>
                    <Icons.Queue />
                </button>
            </div>

            {/* Bottom Secondary Controls */}
            <div className="neo-secondary-controls">
                <button
                    className={`neo-secondary-btn ${repeat !== 'off' ? 'active' : ''}`}
                    onClick={() => { hapticLight(); cycleRepeat() }}
                >
                    <Icons.Repeat />
                </button>
                <button className="neo-secondary-btn">
                    <Icons.MusicNote />
                </button>
            </div>

            {/* Home Indicator */}
            <div className="neo-home-indicator" />
        </div>
    )
}

export default Player
