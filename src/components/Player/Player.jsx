import React, { useRef, useEffect, useState } from 'react'
import { usePlayerStore } from '../../store/playerStore'
import { useLibraryStore } from '../../store/libraryStore'
import { formatDuration } from '../../services/musicApi'
import { hapticLight, hapticMedium, hapticSuccess } from '../../utils/haptics'
import './Player.css'

const Icons = {
    Play: () => (
        <svg width="36" height="36" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
        </svg>
    ),
    Pause: () => (
        <svg width="36" height="36" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
        </svg>
    ),
    SkipPrev: () => (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
        </svg>
    ),
    SkipNext: () => (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
        </svg>
    ),
    Heart: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
    ),
    HeartFilled: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
    ),
    Shuffle: () => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="16 3 21 3 21 8" />
            <line x1="4" y1="20" x2="21" y2="3" />
            <polyline points="21 16 21 21 16 21" />
            <line x1="15" y1="15" x2="21" y2="21" />
            <line x1="4" y1="4" x2="9" y2="9" />
        </svg>
    ),
    Repeat: () => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="17 1 21 5 17 9" />
            <path d="M3 11V9a4 4 0 0 1 4-4h14" />
            <polyline points="7 23 3 19 7 15" />
            <path d="M21 13v2a4 4 0 0 1-4 4H3" />
        </svg>
    )
}

function Player() {
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
    const canvasRef = useRef(null)
    const animationRef = useRef(null)

    // Swipe handling
    const touchStartRef = useRef({ x: 0, y: 0 })
    const [swipeOffset, setSwipeOffset] = useState(0)

    const handleTouchStart = (e) => {
        touchStartRef.current = {
            x: e.touches[0].clientX,
            y: e.touches[0].clientY
        }
    }

    const handleTouchMove = (e) => {
        const deltaX = e.touches[0].clientX - touchStartRef.current.x
        setSwipeOffset(deltaX * 0.3)
    }

    const handleTouchEnd = (e) => {
        const deltaX = e.changedTouches[0].clientX - touchStartRef.current.x
        if (deltaX > 80) {
            hapticLight()
            playPrevious()
        } else if (deltaX < -80) {
            hapticLight()
            playNext()
        }
        setSwipeOffset(0)
    }

    const handleSeek = (e) => {
        const rect = e.currentTarget.getBoundingClientRect()
        const percent = (e.clientX - rect.left) / rect.width
        seek(percent * duration)
    }

    const handlePlayClick = () => {
        hapticMedium()
        togglePlay()
    }

    // Audio visualization effect
    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        const resize = () => {
            canvas.width = canvas.offsetWidth * 2
            canvas.height = canvas.offsetHeight * 2
            ctx.scale(2, 2)
        }
        resize()
        window.addEventListener('resize', resize)

        let time = 0
        const animate = () => {
            const width = canvas.offsetWidth
            const height = canvas.offsetHeight

            ctx.clearRect(0, 0, width, height)

            // Draw spectrum bars
            const bars = 32
            const barWidth = width / bars
            const centerY = height / 2

            for (let i = 0; i < bars; i++) {
                // Simulated audio reactivity
                const baseHeight = Math.sin(time * 0.02 + i * 0.3) * 30 +
                    Math.sin(time * 0.05 + i * 0.5) * 20
                const height1 = isPlaying ? Math.abs(baseHeight) + 10 : 5

                const x = i * barWidth + barWidth / 2

                // Gradient from blue to purple
                const gradient = ctx.createLinearGradient(x, centerY - height1, x, centerY + height1)
                gradient.addColorStop(0, 'rgba(100, 0, 255, 0.6)')
                gradient.addColorStop(0.5, 'rgba(0, 170, 255, 0.8)')
                gradient.addColorStop(1, 'rgba(100, 0, 255, 0.6)')

                ctx.fillStyle = gradient
                ctx.fillRect(x - barWidth * 0.3, centerY - height1, barWidth * 0.6, height1 * 2)

                // Glow effect
                ctx.shadowColor = 'rgba(0, 170, 255, 0.5)'
                ctx.shadowBlur = 10
            }

            time++
            animationRef.current = requestAnimationFrame(animate)
        }

        animate()

        return () => {
            window.removeEventListener('resize', resize)
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current)
            }
        }
    }, [isPlaying])

    const progress = duration ? (currentTime / duration) * 100 : 0
    const liked = currentTrack ? isLiked(currentTrack.videoId) : false

    if (!currentTrack) {
        return (
            <div className="aero-player empty">
                <div className="aero-player-empty">
                    <div className="aero-player-empty-icon">🎵</div>
                    <h2>No track playing</h2>
                    <p>Search for music or select from your library</p>
                </div>
            </div>
        )
    }

    return (
        <div
            className="aero-player"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            {/* Background Visualization */}
            <canvas ref={canvasRef} className="aero-visualization" />

            {/* Album Art Background Blur */}
            <div
                className="aero-art-bg"
                style={{ backgroundImage: `url(${currentTrack.thumbnail})` }}
            />

            {/* Album Art */}
            <div
                className="aero-album-art"
                style={{ transform: `translateX(${swipeOffset}px)` }}
            >
                <img src={currentTrack.thumbnail} alt={currentTrack.title} />
                <div className="aero-album-reflection" />
            </div>

            {/* Track Info */}
            <div className="aero-track-info">
                <h2 className="aero-track-title">{currentTrack.title}</h2>
                <p className="aero-track-artist">{currentTrack.artist}</p>
            </div>

            {/* Progress Bar */}
            <div className="aero-progress-container">
                <div className="aero-progress-bar" onClick={handleSeek}>
                    <div className="aero-progress-fill" style={{ width: `${progress}%` }}>
                        <div className="aero-progress-glow" />
                    </div>
                </div>
                <div className="aero-progress-time">
                    <span>{formatDuration(currentTime)}</span>
                    <span>{formatDuration(duration)}</span>
                </div>
            </div>

            {/* Main Controls */}
            <div className="aero-controls">
                <button
                    className={`aero-control-btn secondary ${shuffle ? 'active' : ''}`}
                    onClick={() => { hapticLight(); toggleShuffle() }}
                >
                    <Icons.Shuffle />
                </button>

                <button
                    className="aero-control-btn"
                    onClick={() => { hapticLight(); playPrevious() }}
                >
                    <Icons.SkipPrev />
                </button>

                <button
                    className={`aero-play-btn ${isPlaying ? 'playing' : ''}`}
                    onClick={handlePlayClick}
                    disabled={isLoading}
                >
                    <div className="aero-play-ring" />
                    <div className="aero-play-inner">
                        {isLoading ? (
                            <div className="aero-spinner" />
                        ) : isPlaying ? (
                            <Icons.Pause />
                        ) : (
                            <Icons.Play />
                        )}
                    </div>
                </button>

                <button
                    className="aero-control-btn"
                    onClick={() => { hapticLight(); playNext() }}
                >
                    <Icons.SkipNext />
                </button>

                <button
                    className={`aero-control-btn secondary ${repeat !== 'off' ? 'active' : ''}`}
                    onClick={() => { hapticLight(); cycleRepeat() }}
                >
                    <Icons.Repeat />
                </button>
            </div>

            {/* Like Button */}
            <button
                className={`aero-like-btn ${liked ? 'liked' : ''}`}
                onClick={() => { hapticSuccess(); toggleLike(currentTrack) }}
            >
                {liked ? <Icons.HeartFilled /> : <Icons.Heart />}
            </button>
        </div>
    )
}

export default Player
