import React, { useRef, useState, useEffect } from 'react'
import { usePlayerStore } from '../../store/playerStore'
import { useLibraryStore } from '../../store/libraryStore'
import { formatDuration } from '../../services/musicApi'
import { hapticLight, hapticMedium, hapticSuccess } from '../../utils/haptics'
import './Player.css'

// Icons - Pixel-perfect SF Pro style
const Icons = {
    Back: () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
        </svg>
    ),
    Info: () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
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
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
    ),
    HeartFilled: () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>
    ),
    Volume: () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
        </svg>
    ),
    Repeat: () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" />
        </svg>
    ),
    Queue: () => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z" />
        </svg>
    ),
    More: () => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="6" cy="12" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="18" cy="12" r="2" />
        </svg>
    ),
    MusicNote: () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
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
        cycleRepeat,
        lyrics,
        showLyrics,
        toggleLyrics
    } = usePlayerStore()

    const { isLiked, toggleLike } = useLibraryStore()
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

    // Auto-scroll lyrics
    const lyricsRef = useRef(null)
    useEffect(() => {
        if (showLyrics && lyrics && lyrics.syncedLyrics) {
            const activeLineIndex = lyrics.syncedLyrics.findIndex((line, index) => {
                const nextLine = lyrics.syncedLyrics[index + 1]
                return currentTime >= line.seconds && (!nextLine || currentTime < nextLine.seconds)
            })

            if (activeLineIndex !== -1 && lyricsRef.current) {
                const activeEl = lyricsRef.current.children[activeLineIndex]
                if (activeEl) {
                    activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
                }
            }
        }
    }, [currentTime, showLyrics, lyrics])

    const progress = duration ? (currentTime / duration) * 100 : 0
    const liked = currentTrack ? isLiked(currentTrack) : false
    const remainingTime = duration - currentTime

    if (!currentTrack) {
        return (
            <div className="player">
                <div className="player-empty">
                    <div className="empty-icon">🎵</div>
                    <h2>No track playing</h2>
                    <p>Search for music to start listening</p>
                </div>
            </div>
        )
    }

    return (
        <div className="player">
            {/* Top Bar */}
            <div className="player-top-bar">
                <button className="top-btn" onClick={onClose}>
                    <Icons.Back />
                </button>
                <span className="now-playing-text">Now Playing</span>
                <button className="top-btn">
                    <Icons.Info />
                </button>
            </div>

            {/* Album Art */}
            <div className="album-container">
                <img
                    src={currentTrack.thumbnail}
                    alt={currentTrack.title}
                    className="album-art"
                />
            </div>

            {/* Track Info Card */}
            <div className="track-card">
                <img
                    src={currentTrack.thumbnail}
                    alt=""
                    className="track-thumb"
                />
                <div className="track-info">
                    <span className="track-artist">{currentTrack.artist}</span>
                    <span className="track-title">{currentTrack.title}</span>
                </div>
                <button className="follow-btn">Follow</button>
            </div>

            {/* Lyrics Overlay */}
            {showLyrics && (
                <div className="lyrics-overlay" onClick={toggleLyrics}>
                    <div className="lyrics-content" ref={lyricsRef} onClick={e => e.stopPropagation()}>
                        {lyrics ? (
                            lyrics.syncedLyrics ? (
                                lyrics.syncedLyrics.map((line, index) => {
                                    const isActive = currentTime >= line.seconds &&
                                        (!lyrics.syncedLyrics[index + 1] || currentTime < lyrics.syncedLyrics[index + 1].seconds)
                                    return (
                                        <p key={index} className={`lyric-line ${isActive ? 'active' : ''}`}>
                                            {line.content}
                                        </p>
                                    )
                                })
                            ) : (
                                <p className="lyrics-plain">{lyrics.plainLyrics || 'No lyrics available'}</p>
                            )
                        ) : (
                            <div className="lyrics-loading">
                                <div className="spinner" />
                                <p>Loading lyrics...</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Progress Bar */}
            <div className="progress-section">
                <div
                    ref={progressRef}
                    className="progress-bar"
                    onClick={handleSeek}
                    onTouchMove={handleTouchSeek}
                >
                    <div
                        className="progress-fill"
                        style={{ width: `${progress}%` }}
                    />
                </div>
                <div className="time-display">
                    <span>{formatDuration(currentTime)}</span>
                    <span>-{formatDuration(remainingTime)}</span>
                </div>
            </div>

            {/* Main Controls Area */}
            <div className="controls-area">
                {/* Left - More Options */}
                <button className="side-btn">
                    <Icons.More />
                </button>

                {/* Center - Circular Control Pad */}
                <div className="control-pad">
                    {/* Heart - Top */}
                    <button
                        className={`pad-btn pad-top ${liked ? 'liked' : ''}`}
                        onClick={() => { hapticSuccess(); toggleLike(currentTrack) }}
                    >
                        {liked ? <Icons.HeartFilled /> : <Icons.Heart />}
                    </button>

                    {/* Previous - Left */}
                    <button
                        className="pad-btn pad-left"
                        onClick={() => { hapticLight(); playPrevious() }}
                    >
                        <Icons.SkipPrev />
                    </button>

                    {/* Play/Pause - Center */}
                    <button
                        className="play-btn"
                        onClick={handlePlayClick}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <div className="spinner" />
                        ) : isPlaying ? (
                            <Icons.Pause />
                        ) : (
                            <Icons.Play />
                        )}
                    </button>

                    {/* Next - Right */}
                    <button
                        className="pad-btn pad-right"
                        onClick={() => { hapticLight(); playNext() }}
                    >
                        <Icons.SkipNext />
                    </button>

                    {/* Volume - Bottom */}
                    <button className="pad-btn pad-bottom">
                        <Icons.Volume />
                    </button>
                </div>

                {/* Right - Queue */}
                <button className="side-btn">
                    <Icons.Queue />
                </button>
            </div>

            {/* Secondary Controls */}
            <div className="secondary-controls">
                <button
                    className={`secondary-btn ${repeat !== 'off' ? 'active' : ''}`}
                    onClick={() => { hapticLight(); cycleRepeat() }}
                >
                    <Icons.Repeat />
                </button>
                <button
                    className={`secondary-btn ${showLyrics ? 'active' : ''}`}
                    onClick={() => { hapticLight(); toggleLyrics() }}
                >
                    <Icons.MusicNote />
                </button>
            </div>

            {/* Home Indicator */}
            <div className="home-indicator" />
        </div>
    )
}

export default Player
