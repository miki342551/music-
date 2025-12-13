import { useState, useRef } from 'react'
import { useLibraryStore } from '../../store/libraryStore'
import { usePlayerStore } from '../../store/playerStore'
import { hapticLight, hapticSuccess } from '../../utils/haptics'
import './SwipeableTrack.css'

const Icons = {
    Heart: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>
    ),
    Queue: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z" />
        </svg>
    )
}

function SwipeableTrack({ track, children, onLike, onAddToQueue }) {
    const [swipeOffset, setSwipeOffset] = useState(0)
    const [swiping, setSwiping] = useState(false)
    const touchStartRef = useRef({ x: 0, y: 0, time: 0 })
    const containerRef = useRef(null)

    const { isLiked, toggleLike } = useLibraryStore()
    const { addToQueue } = usePlayerStore()

    const SWIPE_THRESHOLD = 80
    const liked = isLiked(track.videoId)

    const handleTouchStart = (e) => {
        const touch = e.touches[0]
        touchStartRef.current = {
            x: touch.clientX,
            y: touch.clientY,
            time: Date.now()
        }
        setSwiping(true)
    }

    const handleTouchMove = (e) => {
        if (!swiping) return

        const touch = e.touches[0]
        const deltaX = touch.clientX - touchStartRef.current.x
        const deltaY = Math.abs(touch.clientY - touchStartRef.current.y)

        // Only allow horizontal swipe if vertical movement is minimal
        if (deltaY > 30) {
            setSwiping(false)
            setSwipeOffset(0)
            return
        }

        // Limit swipe distance
        const clampedOffset = Math.max(-120, Math.min(120, deltaX))
        setSwipeOffset(clampedOffset)

        // Trigger haptic when crossing threshold
        if (Math.abs(clampedOffset) >= SWIPE_THRESHOLD && Math.abs(swipeOffset) < SWIPE_THRESHOLD) {
            hapticLight()
        }
    }

    const handleTouchEnd = () => {
        if (!swiping) return

        if (swipeOffset >= SWIPE_THRESHOLD) {
            // Swipe right - Like
            toggleLike(track)
            hapticSuccess()
            if (onLike) onLike(track)
        } else if (swipeOffset <= -SWIPE_THRESHOLD) {
            // Swipe left - Add to queue
            addToQueue(track)
            hapticSuccess()
            if (onAddToQueue) onAddToQueue(track)
        }

        setSwiping(false)
        setSwipeOffset(0)
    }

    const actionOpacity = Math.min(1, Math.abs(swipeOffset) / SWIPE_THRESHOLD)

    return (
        <div className="swipeable-track-container" ref={containerRef}>
            {/* Background actions */}
            <div className="swipe-action swipe-action-left" style={{ opacity: swipeOffset > 0 ? actionOpacity : 0 }}>
                <span className={`swipe-icon ${liked ? 'liked' : ''}`}>
                    <Icons.Heart />
                </span>
                <span>{liked ? 'Unlike' : 'Like'}</span>
            </div>
            <div className="swipe-action swipe-action-right" style={{ opacity: swipeOffset < 0 ? actionOpacity : 0 }}>
                <span className="swipe-icon">
                    <Icons.Queue />
                </span>
                <span>Add to Queue</span>
            </div>

            {/* Main content */}
            <div
                className="swipeable-track-content"
                style={{
                    transform: `translateX(${swipeOffset}px)`,
                    transition: swiping ? 'none' : 'transform 0.3s ease'
                }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                {children}
            </div>
        </div>
    )
}

export default SwipeableTrack
