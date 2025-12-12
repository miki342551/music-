import { useEffect } from 'react'
import { usePlayerStore } from '../store/playerStore'

export const useKeyboardShortcuts = () => {
    const {
        togglePlay,
        playNext,
        playPrevious,
        setVolume,
        volume,
        toggleMute,
        toggleShuffle,
        cycleRepeat,
        toggleLyrics
    } = usePlayerStore()

    useEffect(() => {
        const handleKeyDown = (e) => {
            // Ignore if typing in an input
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return
            }

            switch (e.code) {
                case 'Space':
                    e.preventDefault()
                    togglePlay()
                    break
                case 'ArrowRight':
                    if (e.ctrlKey || e.metaKey) {
                        playNext()
                    } else {
                        // Seek forward 5s (handled by player store if we added seekRelative, 
                        // but for now let's just use it for next track with modifier or maybe just next track?)
                        // Standard behavior: Right arrow = seek, Ctrl+Right = Next
                        // Let's keep it simple: Right = Next for now as per plan, or maybe seek?
                        // Plan said "ArrowRight: Next Track". Let's stick to that or make it smarter.
                        // Actually, usually ArrowRight is seek. Let's make it seek if we can, 
                        // but for now let's follow the plan: ArrowRight = Next Track (maybe with modifier to be safe?)
                        // Let's do: ArrowRight = Seek +5s, Ctrl+ArrowRight = Next
                        // But the plan said "ArrowRight: Next Track". I'll stick to the plan but maybe add modifier check?
                        // No, let's just do ArrowRight = Next for now, it's a music player, not a video player.
                        // Wait, Spotify uses Ctrl+Right for next. Right is seek.
                        // Let's implement Seek for Arrows and Ctrl+Arrows for Skip.
                        // I need to add seekRelative to store first? Or just use seek.
                        // Let's stick to the plan: ArrowRight = Next Track.
                        playNext()
                    }
                    break
                case 'ArrowLeft':
                    playPrevious()
                    break
                case 'ArrowUp':
                    e.preventDefault()
                    setVolume(Math.min(1, volume + 0.1))
                    break
                case 'ArrowDown':
                    e.preventDefault()
                    setVolume(Math.max(0, volume - 0.1))
                    break
                case 'KeyM':
                    toggleMute()
                    break
                case 'KeyL':
                    toggleLyrics()
                    break
                case 'KeyS':
                    toggleShuffle()
                    break
                case 'KeyR':
                    cycleRepeat()
                    break
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [togglePlay, playNext, playPrevious, setVolume, volume, toggleMute, toggleShuffle, cycleRepeat, toggleLyrics])
}
