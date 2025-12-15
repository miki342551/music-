import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getRelatedTracks } from '../services/musicApi'

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
            radioMode: false, // When true, auto-adds related tracks

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

            // Play a track with retry mechanism
            // Handles both Spotify tracks (need YouTube matching) and YouTube tracks (have videoId)
            playTrack: async (track, addToQueue = false) => {
                const audio = getAudio()
                set({ isLoading: true, error: null, currentTrack: track })

                const MAX_RETRIES = 3
                let lastError = null
                let videoId = track.videoId

                // If track doesn't have videoId, match it to YouTube first (Spotify track)
                if (!videoId && track.spotifyId) {
                    try {
                        console.log('🔗 Matching Spotify track to YouTube:', track.title)
                        const matchResponse = await fetch(
                            `https://music-production-4deb.up.railway.app/api/spotify/match?title=${encodeURIComponent(track.title)}&artist=${encodeURIComponent(track.artist || '')}`,
                            { signal: AbortSignal.timeout(15000) }
                        )
                        const matchData = await matchResponse.json()

                        if (matchData.videoId) {
                            videoId = matchData.videoId
                            // Update track with videoId for future use
                            track = { ...track, videoId }
                            set({ currentTrack: track })
                        } else {
                            throw new Error('No YouTube match found')
                        }
                    } catch (error) {
                        console.error('Failed to match Spotify track:', error)
                        set({ error: 'Could not find playable version', isLoading: false })
                        return
                    }
                }

                // If still no videoId, try using ytSearchQuery (fallback for Spotify tracks)
                if (!videoId && track.ytSearchQuery) {
                    try {
                        const matchResponse = await fetch(
                            `https://music-production-4deb.up.railway.app/api/spotify/match?title=${encodeURIComponent(track.ytSearchQuery)}`,
                            { signal: AbortSignal.timeout(15000) }
                        )
                        const matchData = await matchResponse.json()
                        if (matchData.videoId) {
                            videoId = matchData.videoId
                            track = { ...track, videoId }
                            set({ currentTrack: track })
                        }
                    } catch (error) {
                        console.error('Fallback match failed:', error)
                    }
                }

                if (!videoId) {
                    set({ error: 'No playable source found', isLoading: false })
                    return
                }

                for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
                    try {
                        // Get stream URL from API
                        const response = await fetch(
                            `https://music-production-4deb.up.railway.app/api/stream/${videoId}`,
                            { signal: AbortSignal.timeout(15000) } // 15 second timeout
                        )
                        const data = await response.json()

                        if (!data.url) {
                            throw new Error('No stream URL found')
                        }

                        audio.src = data.url
                        audio.load() // Force start loading

                        // Wait for audio to be ready before playing
                        await new Promise((resolve, reject) => {
                            const cleanup = () => {
                                audio.removeEventListener('canplay', onCanPlay)
                                audio.removeEventListener('canplaythrough', onCanPlay)
                                audio.removeEventListener('loadeddata', onLoadedData)
                                audio.removeEventListener('error', onError)
                            }

                            const onCanPlay = () => {
                                console.log('✅ Audio canplay event fired')
                                cleanup()
                                resolve()
                            }

                            const onLoadedData = () => {
                                // Fallback - loadeddata fires earlier than canplay
                                console.log('📦 Audio loadeddata event fired')
                                cleanup()
                                resolve()
                            }

                            const onError = (e) => {
                                console.error('❌ Audio error:', audio.error?.message || e)
                                cleanup()
                                reject(new Error(`Audio failed to load: ${audio.error?.message || 'Unknown error'}`))
                            }

                            audio.addEventListener('canplay', onCanPlay)
                            audio.addEventListener('canplaythrough', onCanPlay)
                            audio.addEventListener('loadeddata', onLoadedData)
                            audio.addEventListener('error', onError)

                            // Increased timeout for slower connections
                            setTimeout(() => {
                                console.warn('⏰ Audio load timeout after 20s')
                                cleanup()
                                reject(new Error('Audio load timeout'))
                            }, 20000)
                        })

                        await audio.play()
                        set({ isLoading: false, error: null })

                        if (addToQueue) {
                            const { queue, queueIndex } = get()
                            set({
                                queue: [...queue.slice(0, queueIndex + 1), track, ...queue.slice(queueIndex + 1)],
                                queueIndex: queueIndex + 1
                            })
                        }

                        // Prefetch next track to warm up server cache
                        get().prefetchNext()
                        return // Success, exit function
                    } catch (error) {
                        console.warn(`Attempt ${attempt}/${MAX_RETRIES} failed:`, error.message)
                        lastError = error

                        if (attempt < MAX_RETRIES) {
                            // Wait before retry (exponential backoff)
                            await new Promise(r => setTimeout(r, attempt * 1000))
                        }
                    }
                }

                // All retries failed
                console.error('All playback attempts failed:', lastError)
                set({ error: 'Playback failed. Skipping...', isLoading: false })

                // Auto-skip to next track after 2 seconds
                setTimeout(() => {
                    const { queue, queueIndex } = get()
                    if (queue.length > queueIndex + 1) {
                        get().playNext()
                    }
                }, 2000)
            },

            // Prefetch next track (handles both YouTube and Spotify tracks)
            prefetchNext: () => {
                const { queue, queueIndex, shuffle, repeat } = get()
                let nextIndex = queueIndex + 1

                if (shuffle) {
                    // In shuffle mode, we can't easily predict, but we could pick a random one?
                    // For now, let's just prefetch the next linear one as a fallback
                }

                const prefetchTrack = async (track) => {
                    if (!track) return
                    console.log('Prefetching:', track.title)

                    // If track has videoId, prefetch stream directly
                    if (track.videoId) {
                        fetch(`https://music-production-4deb.up.railway.app/api/stream/${track.videoId}`).catch(() => { })
                    }
                    // If Spotify track without videoId, prefetch the match (which caches the result)
                    else if (track.spotifyId || track.ytSearchQuery) {
                        const query = track.ytSearchQuery || `${track.title} ${track.artist || ''}`
                        fetch(`https://music-production-4deb.up.railway.app/api/spotify/match?title=${encodeURIComponent(query)}`).catch(() => { })
                    }
                }

                if (nextIndex < queue.length) {
                    prefetchTrack(queue[nextIndex])
                } else if (repeat === 'all' && queue.length > 0) {
                    prefetchTrack(queue[0])
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

            // Start Radio mode - plays track and loads related tracks
            startRadio: async (track) => {
                console.log('📻 Starting radio for:', track.title)
                set({ radioMode: true, isLoading: true })

                try {
                    // Play the seed track first
                    await get().playTrack(track)

                    // Get related tracks from Spotify recommendations
                    const relatedTracks = await getRelatedTracks(track)

                    if (relatedTracks.length > 0) {
                        // Set queue with seed track + related tracks
                        set({
                            queue: [track, ...relatedTracks],
                            queueIndex: 0
                        })
                        console.log(`📻 Radio loaded ${relatedTracks.length} tracks`)
                    }
                } catch (error) {
                    console.error('Radio error:', error)
                    set({ radioMode: false })
                }
            },

            // Stop Radio mode
            stopRadio: () => {
                set({ radioMode: false })
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
