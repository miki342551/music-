import { Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar/Sidebar'
import Header from './components/Header/Header'
import Player from './components/Player/Player'
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

    // Initialize keyboard shortcuts
    useKeyboardShortcuts()

    return (
        <div className="app">
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
        </div>
    )
}

export default App
