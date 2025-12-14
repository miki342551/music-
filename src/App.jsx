import { useState, useEffect, useMemo } from 'react'
import Player from './components/Player/Player'
import LyricsOverlay from './components/LyricsOverlay/LyricsOverlay'
import SplashScreen from './components/SplashScreen/SplashScreen'
import Settings from './components/Settings/Settings'
import Home from './pages/Home'
import Search from './pages/Search'
import Library from './pages/Library'
import Artist from './pages/Artist'
import Album from './pages/Album'
import { usePlayerStore } from './store/playerStore'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { hapticLight } from './utils/haptics'
import './App.css'

// Navigation Icons
const Icons = {
    Home: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
        </svg>
    ),
    Search: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
        </svg>
    ),
    Library: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 5h-3v5.5a2.5 2.5 0 0 1-5 0 2.5 2.5 0 0 1 2.5-2.5c.57 0 1.08.19 1.5.51V5h4v2zM4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6z" />
        </svg>
    ),
    Settings: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
        </svg>
    )
}

// Extract dominant color from image
function extractDominantColor(imageUrl, callback) {
    if (!imageUrl) return
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        canvas.width = 50
        canvas.height = 50
        ctx.drawImage(img, 0, 0, 50, 50)
        try {
            const data = ctx.getImageData(0, 0, 50, 50).data
            let r = 0, g = 0, b = 0, count = 0
            for (let i = 0; i < data.length; i += 40) {
                r += data[i]
                g += data[i + 1]
                b += data[i + 2]
                count++
            }
            r = Math.round(r / count)
            g = Math.round(g / count)
            b = Math.round(b / count)
            callback(`rgb(${r}, ${g}, ${b})`)
        } catch (e) {
            callback('#1DB954')
        }
    }
    img.onerror = () => callback('#1DB954')
    img.src = imageUrl
}

function App() {
    const showLyrics = usePlayerStore(state => state.showLyrics)
    const currentTrack = usePlayerStore(state => state.currentTrack)
    const isPlaying = usePlayerStore(state => state.isPlaying)
    const [showSplash, setShowSplash] = useState(true)
    const [activeTab, setActiveTab] = useState('home')
    const [showSettings, setShowSettings] = useState(false)
    const [showPlayer, setShowPlayer] = useState(false)
    const [accentColor, setAccentColor] = useState('#1DB954')

    // Artist/Album navigation
    const [viewingArtist, setViewingArtist] = useState(null)
    const [viewingAlbum, setViewingAlbum] = useState(null)

    // Initialize keyboard shortcuts
    useKeyboardShortcuts()

    // Extract accent color from current track artwork
    useEffect(() => {
        if (currentTrack?.thumbnail) {
            extractDominantColor(currentTrack.thumbnail, (color) => {
                setAccentColor(color)
            })
        } else {
            setAccentColor('#1DB954')
        }
    }, [currentTrack?.thumbnail])

    // Apply accent color to CSS variable
    useEffect(() => {
        document.documentElement.style.setProperty('--accent-dynamic', accentColor)
    }, [accentColor])

    // Hide splash after loading
    const handleSplashFinish = () => {
        setShowSplash(false)
    }

    const handleTabChange = (tab) => {
        hapticLight()
        setActiveTab(tab)
        setShowPlayer(false)
        setViewingArtist(null)
        setViewingAlbum(null)
    }

    const openArtist = (artistName) => {
        setViewingArtist(artistName)
        setViewingAlbum(null)
    }

    const openAlbum = (albumName, artistName) => {
        setViewingAlbum({ name: albumName, artist: artistName })
    }

    const closeArtistAlbum = () => {
        setViewingArtist(null)
        setViewingAlbum(null)
    }

    return (
        <div className="premium-app">
            {showSplash && <SplashScreen onFinish={handleSplashFinish} duration={2500} />}
            {showLyrics && <LyricsOverlay />}
            {showSettings && <Settings isOpen={showSettings} onClose={() => setShowSettings(false)} />}

            {/* Dynamic Gradient Background */}
            <div
                className="premium-bg"
                style={{
                    background: currentTrack
                        ? `linear-gradient(180deg, ${accentColor}40 0%, transparent 40%)`
                        : 'transparent',
                    opacity: currentTrack ? 1 : 0
                }}
            />

            {/* Main Content Area */}
            <main className="premium-content">
                {viewingArtist && (
                    <Artist
                        artist={viewingArtist}
                        onClose={closeArtistAlbum}
                        onAlbumClick={openAlbum}
                    />
                )}
                {viewingAlbum && !viewingArtist && (
                    <Album
                        albumName={viewingAlbum.name}
                        artistName={viewingAlbum.artist}
                        onClose={closeArtistAlbum}
                        onArtistClick={openArtist}
                    />
                )}
                {!viewingArtist && !viewingAlbum && activeTab === 'home' && !showPlayer && <Home />}
                {!viewingArtist && !viewingAlbum && activeTab === 'search' && !showPlayer && (
                    <Search onArtistClick={openArtist} onAlbumClick={openAlbum} />
                )}
                {!viewingArtist && !viewingAlbum && activeTab === 'library' && !showPlayer && <Library />}
                {showPlayer && <Player />}
            </main>

            {/* Mini Player (when track is playing and not in full player) */}
            {currentTrack && !showPlayer && (
                <div
                    className="mini-player"
                    onClick={() => setShowPlayer(true)}
                >
                    <img
                        src={currentTrack.thumbnail}
                        alt={currentTrack.title}
                        className="mini-player-art"
                    />
                    <div className="mini-player-info">
                        <span className="mini-player-title">{currentTrack.title}</span>
                        <span className="mini-player-artist">{currentTrack.artist}</span>
                    </div>
                    <div className={`mini-player-indicator ${isPlaying ? 'playing' : ''}`}>
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                </div>
            )}

            {/* Full Player Close Button */}
            {showPlayer && (
                <button
                    className="player-close-btn"
                    onClick={() => setShowPlayer(false)}
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z" />
                    </svg>
                </button>
            )}

            {/* Bottom Navigation */}
            <nav className={`premium-nav ${showPlayer ? 'hidden' : ''}`}>
                <button
                    className={`nav-item ${activeTab === 'home' ? 'active' : ''}`}
                    onClick={() => handleTabChange('home')}
                >
                    <div className="nav-icon">
                        <Icons.Home />
                    </div>
                    <span>Home</span>
                </button>
                <button
                    className={`nav-item ${activeTab === 'search' ? 'active' : ''}`}
                    onClick={() => handleTabChange('search')}
                >
                    <div className="nav-icon">
                        <Icons.Search />
                    </div>
                    <span>Search</span>
                </button>
                <button
                    className={`nav-item ${activeTab === 'library' ? 'active' : ''}`}
                    onClick={() => handleTabChange('library')}
                >
                    <div className="nav-icon">
                        <Icons.Library />
                    </div>
                    <span>Library</span>
                </button>
                <button
                    className="nav-item"
                    onClick={() => { hapticLight(); setShowSettings(true) }}
                >
                    <div className="nav-icon">
                        <Icons.Settings />
                    </div>
                    <span>Settings</span>
                </button>
            </nav>
        </div>
    )
}

export default App
