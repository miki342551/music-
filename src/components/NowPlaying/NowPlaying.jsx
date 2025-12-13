import { useState, useEffect } from 'react'
import { usePlayerStore } from '../../store/playerStore'
import { useLibraryStore } from '../../store/libraryStore'
import { formatDuration } from '../../services/musicApi'
import './NowPlaying.css'

const Icons = {
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
        <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
        </svg>
    ),
    SkipNext: () => (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
        </svg>
    ),
    Heart: () => (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>
    ),
    HeartFilled: () => (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>
    ),
    ChevronDown: () => (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
            <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" />
        </svg>
    ),
    Shuffle: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z" />
        </svg>
    ),
    Repeat: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" />
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

    const progress = duration ? (currentTime / duration) * 100 : 0
    const liked = currentTrack ? isLiked(currentTrack.videoId) : false

    if (!currentTrack) return null

    return (
        <div
            className={`now-playing ${isOpen ? 'open' : ''}`}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
        >
            {/* Background gradient */}
            <div
                className="now-playing-bg"
                style={{
                    backgroundImage: `url(${currentTrack.thumbnail})`
                }}
            />

            {/* Header */}
            <div className="now-playing-header">
                <button className="np-close-btn" onClick={onClose}>
                    <Icons.ChevronDown />
                </button>
                <span className="np-title">Now Playing</span>
                <div style={{ width: 48 }} />
            </div>

            {/* Album Art */}
            <div className="np-artwork-container">
                <img
                    className="np-artwork"
                    src={currentTrack.thumbnail?.replace('mqdefault', 'maxresdefault') || currentTrack.thumbnail}
                    alt={currentTrack.title}
                />
            </div>

            {/* Track Info */}
            <div className="np-info">
                <h2 className="np-track-title">{currentTrack.title}</h2>
                <p className="np-track-artist">{currentTrack.artist}</p>
            </div>

            {/* Progress Bar */}
            <div className="np-progress-container">
                <div className="np-progress-bar" onClick={handleSeek}>
                    <div className="np-progress-fill" style={{ width: `${progress}%` }} />
                    <div className="np-progress-thumb" style={{ left: `${progress}%` }} />
                </div>
                <div className="np-time">
                    <span>{formatDuration(currentTime)}</span>
                    <span>{formatDuration(duration)}</span>
                </div>
            </div>

            {/* Controls */}
            <div className="np-controls">
                <button
                    className={`np-btn secondary ${shuffle ? 'active' : ''}`}
                    onClick={toggleShuffle}
                >
                    <Icons.Shuffle />
                </button>
                <button className="np-btn" onClick={playPrevious}>
                    <Icons.SkipPrev />
                </button>
                <button className="np-btn play" onClick={togglePlay}>
                    {isPlaying ? <Icons.Pause /> : <Icons.Play />}
                </button>
                <button className="np-btn" onClick={playNext}>
                    <Icons.SkipNext />
                </button>
                <button
                    className={`np-btn secondary ${repeat !== 'off' ? 'active' : ''}`}
                    onClick={cycleRepeat}
                >
                    <Icons.Repeat />
                </button>
            </div>

            {/* Actions */}
            <div className="np-actions">
                <button
                    className={`np-action-btn ${liked ? 'liked' : ''}`}
                    onClick={() => toggleLike(currentTrack)}
                >
                    {liked ? <Icons.HeartFilled /> : <Icons.Heart />}
                </button>
            </div>
        </div>
    )
}

export default NowPlaying
