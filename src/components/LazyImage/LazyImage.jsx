import { useState, useRef, useEffect } from 'react'
import './LazyImage.css'

/**
 * LazyImage component with intersection observer for lazy loading
 * Includes placeholder shimmer effect and smooth fade-in
 */
function LazyImage({
    src,
    alt = '',
    className = '',
    placeholder = null,
    threshold = 0.1
}) {
    const [isLoaded, setIsLoaded] = useState(false)
    const [isInView, setIsInView] = useState(false)
    const [error, setError] = useState(false)
    const imgRef = useRef(null)

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsInView(true)
                    observer.disconnect()
                }
            },
            { threshold, rootMargin: '50px' }
        )

        if (imgRef.current) {
            observer.observe(imgRef.current)
        }

        return () => observer.disconnect()
    }, [threshold])

    const handleLoad = () => {
        setIsLoaded(true)
    }

    const handleError = () => {
        setError(true)
        setIsLoaded(true)
    }

    return (
        <div ref={imgRef} className={`lazy-image-container ${className}`}>
            {/* Placeholder/Shimmer */}
            {!isLoaded && (
                <div className="lazy-image-placeholder shimmer">
                    {placeholder}
                </div>
            )}

            {/* Actual Image */}
            {isInView && (
                <img
                    src={error ? '/favicon.svg' : src}
                    alt={alt}
                    className={`lazy-image ${isLoaded ? 'loaded' : ''}`}
                    onLoad={handleLoad}
                    onError={handleError}
                />
            )}
        </div>
    )
}

export default LazyImage
