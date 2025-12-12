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

            // Check if song is liked
            isLiked: (videoId) => {
                return get().likedSongs.some(song => song.videoId === videoId)
            },

            // Toggle like
            toggleLike: (track) => {
                const { likedSongs, isLiked } = get()
                if (isLiked(track.videoId)) {
                    set({ likedSongs: likedSongs.filter(s => s.videoId !== track.videoId) })
                } else {
                    set({ likedSongs: [{ ...track, likedAt: Date.now() }, ...likedSongs] })
                }
            },

            // Add to recently played
            addToRecentlyPlayed: (track) => {
                const { recentlyPlayed } = get()
                const filtered = recentlyPlayed.filter(t => t.videoId !== track.videoId)
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
            name: 'library-storage'
        }
    )
)
