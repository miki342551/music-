import { useState, useEffect } from 'react'
import Player from './components/Player/Player'
import LyricsOverlay from './components/LyricsOverlay/LyricsOverlay'
import SplashScreen from './components/SplashScreen/SplashScreen'
import Search from './pages/Search'
import Library from './pages/Library'
import { usePlayerStore } from './store/playerStore'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { hapticLight } from './utils/haptics'
import './App.css'

function App() {
    const showLyrics = usePlayerStore(state => state.showLyrics)
    const currentTrack = usePlayerStore(state => state.currentTrack)
    const [showSplash, setShowSplash] = useState(true)
    const [activeTab, setActiveTab] = useState('nowplaying')

    // Initialize keyboard shortcuts
    useKeyboardShortcuts()

    // Hide splash after loading
    const handleSplashFinish = () => {
        setShowSplash(false)
    }

    const handleTabChange = (tab) => {
        hapticLight()
        setActiveTab(tab)
    }

    // Auto-switch to now playing when track starts
    useEffect(() => {
        if (currentTrack && activeTab !== 'nowplaying') {
            // Optionally auto-switch
        }
    }, [currentTrack])

    return (
        <div className="aero-app">
            {showSplash && <SplashScreen onFinish={handleSplashFinish} duration={2500} />}
            {showLyrics && <LyricsOverlay />}

            {/* Animated Background */}
            <div className="aero-bg">
                <div className="aero-bg-gradient" />
                <div className="aero-bg-particles" />
            </div>

            {/* Tab Navigation */}
            <nav className="aero-tabs">
                <button
                    className={`aero-tab ${activeTab === 'nowplaying' ? 'active' : ''}`}
                    onClick={() => handleTabChange('nowplaying')}
                >
                    Now Playing
                </button>
                <button
                    className={`aero-tab ${activeTab === 'search' ? 'active' : ''}`}
                    onClick={() => handleTabChange('search')}
                >
                    Search
                </button>
                <button
                    className={`aero-tab ${activeTab === 'library' ? 'active' : ''}`}
                    onClick={() => handleTabChange('library')}
                >
                    Library
                </button>
            </nav>

            {/* Content Area */}
            <main className="aero-content">
                {activeTab === 'nowplaying' && <Player />}
                {activeTab === 'search' && <Search />}
                {activeTab === 'library' && <Library />}
            </main>
        </div>
    )
}

export default App
