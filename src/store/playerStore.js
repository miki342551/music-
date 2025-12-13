import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Audio element singleton
let audioElement = null

const getAudio = () => {
    if (!audioElement) {
        audioElement = new Audio()
        audioElement.volume = 0.7
    }
    return audioElement
}

export const usePlayerStore = create(
    persist(
        (set, get) => ({
            // Current track
            currentTrack: null,

            // Queue
            queue: [],
            queueIndex: 0,

            // Playback state
            isPlaying: false,
            currentTime: 0,
            duration: 0,
            volume: 0.7,
            isMuted: false,

            // Modes
            shuffle: false,
            repeat: 'off', // 'off', 'all', 'one'

            // UI state
            showLyrics: false,
            isLoading: false,
            error: null,

            // Initialize audio listeners
            initAudio: () => {
                const audio = getAudio()

                audio.addEventListener('timeupdate', () => {
                    set({ currentTime: audio.currentTime })
                })

                audio.addEventListener('loadedmetadata', () => {
                    set({ duration: audio.duration, isLoading: false })
                })

                audio.addEventListener('ended', () => {
                    get().playNext()
                })

                audio.addEventListener('error', (e) => {
                    console.error('Audio error:', e)
                    set({ error: 'Failed to play track', isLoading: false })
                })

                audio.addEventListener('play', () => set({ isPlaying: true }))
                audio.addEventListener('pause', () => set({ isPlaying: false }))
            },

            // Play a track
            playTrack: async (track, addToQueue = false) => {
                const audio = getAudio()
                set({ isLoading: true, error: null, currentTrack: track })

                try {
                    // Get stream URL from API
                    const response = await fetch(`https://music-production-4deb.up.railway.app/api/stream/${track.videoId}`)
                    const data = await response.json()

                    if (!data.url) {
                        throw new Error('No stream URL found')
                    }

                    audio.src = data.url
                    await audio.play()

                    if (addToQueue) {
                        const { queue, queueIndex } = get()
                        set({
                            queue: [...queue.slice(0, queueIndex + 1), track, ...queue.slice(queueIndex + 1)],
                            queueIndex: queueIndex + 1
                        })
                    }

                    // Prefetch next track to warm up server cache
                    get().prefetchNext()
                } catch (error) {
                    console.error('Error playing track:', error)
                    set({ error: error.message, isLoading: false })
                }
            },

            // Prefetch next track
            prefetchNext: () => {
                const { queue, queueIndex, shuffle, repeat } = get()
                let nextIndex = queueIndex + 1

                if (shuffle) {
                    // In shuffle mode, we can't easily predict, but we could pick a random one?
                    // For now, let's just prefetch the next linear one as a fallback
                }

                if (nextIndex < queue.length) {
                    const nextTrack = queue[nextIndex]
                    console.log('Prefetching:', nextTrack.title)
                    fetch(`https://music-production-4deb.up.railway.app/api/stream/${nextTrack.videoId}`).catch(() => { })
                } else if (repeat === 'all' && queue.length > 0) {
                    const nextTrack = queue[0]
                    fetch(`https://music-production-4deb.up.railway.app/api/stream/${nextTrack.videoId}`).catch(() => { })
                }
            },

            // Play/Pause toggle
            togglePlay: () => {
                const audio = getAudio()
                if (audio.paused) {
                    audio.play()
                } else {
                    audio.pause()
                }
            },

            // Pause playback
            pause: () => {
                getAudio().pause()
            },

            // Resume playback
            play: () => {
                getAudio().play()
            },

            // Seek to position
            seek: (time) => {
                const audio = getAudio()
                audio.currentTime = time
                set({ currentTime: time })
            },

            // Set volume
            setVolume: (volume) => {
                const audio = getAudio()
                audio.volume = volume
                set({ volume, isMuted: volume === 0 })
            },

            // Toggle mute
            toggleMute: () => {
                const audio = getAudio()
                const { volume, isMuted } = get()
                if (isMuted) {
                    audio.volume = volume || 0.7
                    set({ isMuted: false })
                } else {
                    audio.volume = 0
                    set({ isMuted: true })
                }
            },

            // Play next track
            playNext: () => {
                const { queue, queueIndex, repeat, shuffle } = get()

                if (repeat === 'one') {
                    const audio = getAudio()
                    audio.currentTime = 0
                    audio.play()
                    return
                }

                let nextIndex = queueIndex + 1

                if (shuffle) {
                    nextIndex = Math.floor(Math.random() * queue.length)
                }

                if (nextIndex >= queue.length) {
                    if (repeat === 'all') {
                        nextIndex = 0
                    } else {
                        return
                    }
                }

                if (queue[nextIndex]) {
                    set({ queueIndex: nextIndex })
                    get().playTrack(queue[nextIndex])
                }
            },

            // Play previous track
            playPrevious: () => {
                const audio = getAudio()
                const { queue, queueIndex } = get()

                // If more than 3 seconds in, restart the track
                if (audio.currentTime > 3) {
                    audio.currentTime = 0
                    return
                }

                const prevIndex = queueIndex - 1
                if (prevIndex >= 0 && queue[prevIndex]) {
                    set({ queueIndex: prevIndex })
                    get().playTrack(queue[prevIndex])
                }
            },

            // Set queue
            setQueue: (tracks, startIndex = 0) => {
                set({ queue: tracks, queueIndex: startIndex })
                if (tracks[startIndex]) {
                    get().playTrack(tracks[startIndex])
                }
            },

            // Add to queue
            addToQueue: (track) => {
                const { queue } = get()
                set({ queue: [...queue, track] })
            },

            // Toggle shuffle
            toggleShuffle: () => {
                set(state => ({ shuffle: !state.shuffle }))
            },

            // Cycle repeat mode
            cycleRepeat: () => {
                set(state => {
                    const modes = ['off', 'all', 'one']
                    const currentIndex = modes.indexOf(state.repeat)
                    const nextIndex = (currentIndex + 1) % modes.length
                    return { repeat: modes[nextIndex] }
                })
            },

            // Toggle lyrics
            toggleLyrics: () => {
                set(state => ({ showLyrics: !state.showLyrics }))
            },

            // Clear error
            clearError: () => set({ error: null })
        }),
        {
            name: 'player-storage',
            partialize: (state) => ({
                volume: state.volume,
                shuffle: state.shuffle,
                repeat: state.repeat
            })
        }
    )
)

// Initialize audio on import
usePlayerStore.getState().initAudio()
