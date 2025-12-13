import { useState, useEffect } from 'react'
import './SplashScreen.css'

function SplashScreen({ onFinish, duration = 2000 }) {
    const [fadeOut, setFadeOut] = useState(false)

    useEffect(() => {
        const fadeTimer = setTimeout(() => {
            setFadeOut(true)
        }, duration - 500)

        const finishTimer = setTimeout(() => {
            onFinish?.()
        }, duration)

        return () => {
            clearTimeout(fadeTimer)
            clearTimeout(finishTimer)
        }
    }, [duration, onFinish])

    return (
        <div className={`splash-screen ${fadeOut ? 'fade-out' : ''}`}>
            <div className="splash-content">
                {/* Logo */}
                <div className="splash-logo">
                    <svg width="80" height="80" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                    </svg>
                </div>

                {/* App Name */}
                <h1 className="splash-title">GE'EZ</h1>
                <p className="splash-subtitle">music</p>

                {/* Loading indicator */}
                <div className="splash-loader">
                    <div className="splash-loader-bar" />
                </div>
            </div>

            {/* Gradient background */}
            <div className="splash-bg-gradient" />
        </div>
    )
}

export default SplashScreen
