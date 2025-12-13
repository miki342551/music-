import { useRef, useState } from 'react'

/**
 * Custom hook for handling swipe gestures on elements
 * @param {Object} options - Configuration options
 * @param {Function} options.onSwipeLeft - Callback for left swipe
 * @param {Function} options.onSwipeRight - Callback for right swipe
 * @param {Function} options.onSwipeUp - Callback for up swipe
 * @param {Function} options.onSwipeDown - Callback for down swipe
 * @param {number} options.threshold - Minimum distance for swipe (default: 50px)
 * @returns {Object} Touch event handlers and swipe state
 */
export function useSwipe({
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    threshold = 50
} = {}) {
    const touchStartRef = useRef({ x: 0, y: 0 })
    const [swiping, setSwiping] = useState(false)
    const [swipeOffset, setSwipeOffset] = useState({ x: 0, y: 0 })

    const handleTouchStart = (e) => {
        const touch = e.touches[0]
        touchStartRef.current = { x: touch.clientX, y: touch.clientY }
        setSwiping(true)
    }

    const handleTouchMove = (e) => {
        if (!swiping) return

        const touch = e.touches[0]
        const deltaX = touch.clientX - touchStartRef.current.x
        const deltaY = touch.clientY - touchStartRef.current.y

        setSwipeOffset({ x: deltaX, y: deltaY })
    }

    const handleTouchEnd = () => {
        if (!swiping) return

        const { x, y } = swipeOffset
        const absX = Math.abs(x)
        const absY = Math.abs(y)

        // Determine if it's a horizontal or vertical swipe
        if (absX > absY && absX >= threshold) {
            if (x > 0 && onSwipeRight) {
                onSwipeRight()
            } else if (x < 0 && onSwipeLeft) {
                onSwipeLeft()
            }
        } else if (absY > absX && absY >= threshold) {
            if (y > 0 && onSwipeDown) {
                onSwipeDown()
            } else if (y < 0 && onSwipeUp) {
                onSwipeUp()
            }
        }

        setSwiping(false)
        setSwipeOffset({ x: 0, y: 0 })
    }

    return {
        handlers: {
            onTouchStart: handleTouchStart,
            onTouchMove: handleTouchMove,
            onTouchEnd: handleTouchEnd,
        },
        swiping,
        swipeOffset,
    }
}

export default useSwipe
