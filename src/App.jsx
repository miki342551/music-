import { useState, useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar/Sidebar'
import Header from './components/Header/Header'
import Player from './components/Player/Player'
import BottomNav from './components/BottomNav/BottomNav'
import SplashScreen from './components/SplashScreen/SplashScreen'
import Home from './pages/Home'
import Search from './pages/Search'
import Library from './pages/Library'
import Playlist from './pages/Playlist'
import LyricsOverlay from './components/LyricsOverlay/LyricsOverlay'
import { usePlayerStore } from './store/playerStore'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import './App.css'

function App() {
    const showLyrics = usePlayerStore(state => state.showLyrics)
    const [showSplash, setShowSplash] = useState(true)

    // Initialize keyboard shortcuts
    useKeyboardShortcuts()

    // Hide splash after loading
    const handleSplashFinish = () => {
        setShowSplash(false)
    }

    return (
        <div className="app">
            {showSplash && <SplashScreen onFinish={handleSplashFinish} duration={2500} />}
            {showLyrics && <LyricsOverlay />}
            <div className="app-container">
                <Sidebar />
                <main className="main-content">
                    <Header />
                    <div className="content-area">
                        <Routes>
                            <Route path="/" element={<Home />} />
                            <Route path="/search" element={<Search />} />
                            <Route path="/library" element={<Library />} />
                            <Route path="/playlist/:id" element={<Playlist />} />
                        </Routes>
                    </div>
                </main>
            </div>
            <Player />
            <BottomNav />
        </div>
    )
}

export default App

