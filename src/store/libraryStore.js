import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval'

export const useLibraryStore = create(
    persist(
        (set, get) => ({
            // Liked songs
            likedSongs: [],

            // Playlists
            playlists: [],

            // Recently played
            recentlyPlayed: [],

            // Get unique track ID (prefer spotifyId, fallback to videoId)
            getTrackId: (track) => track?.spotifyId || track?.videoId,

            // Check if song is liked
            isLiked: (trackOrId) => {
                const { likedSongs, getTrackId } = get()
                // Support both passing a track object or just an ID
                const id = typeof trackOrId === 'string' ? trackOrId : getTrackId(trackOrId)
                if (!id) return false
                return likedSongs.some(song => getTrackId(song) === id)
            },

            // Toggle like
            toggleLike: (track) => {
                const { likedSongs, getTrackId } = get()
                const trackId = getTrackId(track)
                if (!trackId) return // Can't like a track without ID

                const isCurrentlyLiked = likedSongs.some(s => getTrackId(s) === trackId)
                if (isCurrentlyLiked) {
                    set({ likedSongs: likedSongs.filter(s => getTrackId(s) !== trackId) })
                } else {
                    set({ likedSongs: [{ ...track, likedAt: Date.now() }, ...likedSongs] })
                }
            },

            // Add to recently played
            addToRecentlyPlayed: (track) => {
                const { recentlyPlayed, getTrackId } = get()
                const trackId = getTrackId(track)
                if (!trackId) return

                const filtered = recentlyPlayed.filter(t => getTrackId(t) !== trackId)
                const updated = [{ ...track, playedAt: Date.now() }, ...filtered].slice(0, 50)
                set({ recentlyPlayed: updated })
            },

            // Create playlist
            createPlaylist: (name, description = '') => {
                const id = `playlist-${Date.now()}`
                const playlist = {
                    id,
                    name,
                    description,
                    tracks: [],
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    imageUrl: null
                }
                set(state => ({ playlists: [...state.playlists, playlist] }))
                return id
            },

            // Delete playlist
            deletePlaylist: (playlistId) => {
                set(state => ({
                    playlists: state.playlists.filter(p => p.id !== playlistId)
                }))
            },

            // Update playlist
            updatePlaylist: (playlistId, updates) => {
                set(state => ({
                    playlists: state.playlists.map(p =>
                        p.id === playlistId
                            ? { ...p, ...updates, updatedAt: Date.now() }
                            : p
                    )
                }))
            },

            // Add track to playlist
            addToPlaylist: (playlistId, track) => {
                set(state => ({
                    playlists: state.playlists.map(p => {
                        if (p.id === playlistId) {
                            // Check if already exists
                            if (p.tracks.some(t => t.videoId === track.videoId)) {
                                return p
                            }
                            return {
                                ...p,
                                tracks: [...p.tracks, track],
                                updatedAt: Date.now(),
                                imageUrl: p.imageUrl || track.thumbnail
                            }
                        }
                        return p
                    })
                }))
            },

            // Remove track from playlist
            removeFromPlaylist: (playlistId, videoId) => {
                set(state => ({
                    playlists: state.playlists.map(p => {
                        if (p.id === playlistId) {
                            const tracks = p.tracks.filter(t => t.videoId !== videoId)
                            return {
                                ...p,
                                tracks,
                                updatedAt: Date.now(),
                                imageUrl: tracks[0]?.thumbnail || null
                            }
                        }
                        return p
                    })
                }))
            },

            // Get playlist by ID
            getPlaylist: (playlistId) => {
                return get().playlists.find(p => p.id === playlistId)
            }
        }),
        {
            name: 'library-storage',
            // Merge persisted state with initial state to prevent data loss
            merge: (persistedState, currentState) => ({
                ...currentState,
                ...persistedState,
                // Ensure arrays are preserved correctly
                likedSongs: persistedState?.likedSongs || [],
                playlists: persistedState?.playlists || [],
                recentlyPlayed: persistedState?.recentlyPlayed || [],
            }),
        }
    )
)
