// Spotify API Service - Uses Spotify for metadata, YouTube for streaming

const API_BASE = 'https://music-production-4deb.up.railway.app/api'

/**
 * Search for tracks using Spotify metadata
 * Returns clean, accurate track information
 */
export async function searchSpotify(query) {
    try {
        const response = await fetch(`${API_BASE}/spotify/search?q=${encodeURIComponent(query)}`)
        const data = await response.json()

        if (data.fallback) {
            // Spotify failed, use YouTube fallback
            console.warn('Spotify search failed, using YouTube fallback')
            return await searchYouTubeFallback(query)
        }

        return data.results || []
    } catch (error) {
        console.error('Spotify search error:', error)
        // Fallback to YouTube search
        return await searchYouTubeFallback(query)
    }
}

/**
 * Fallback to YouTube search if Spotify is unavailable
 */
async function searchYouTubeFallback(query) {
    try {
        const response = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}`)
        const data = await response.json()
        return data.results || []
    } catch (error) {
        console.error('YouTube fallback error:', error)
        return []
    }
}

/**
 * Match a Spotify track to a YouTube video for streaming
 * @param {string} title - Track title
 * @param {string} artist - Artist name
 * @returns {Promise<{videoId: string}>}
 */
export async function matchToYouTube(title, artist) {
    try {
        const params = new URLSearchParams({ title })
        if (artist) params.append('artist', artist)

        const response = await fetch(`${API_BASE}/spotify/match?${params}`)
        const data = await response.json()

        if (!data.videoId) {
            throw new Error('No YouTube match found')
        }

        return data
    } catch (error) {
        console.error('Match error:', error)
        throw error
    }
}

/**
 * Get related tracks from Spotify (for radio feature)
 * @param {string} spotifyId - Spotify track ID
 */
export async function getRelatedTracks(spotifyId) {
    try {
        const response = await fetch(`${API_BASE}/spotify/related/${spotifyId}`)
        const data = await response.json()
        return data.results || []
    } catch (error) {
        console.error('Related tracks error:', error)
        return []
    }
}

/**
 * Get trending tracks from Spotify
 */
export async function getSpotifyTrending() {
    try {
        const response = await fetch(`${API_BASE}/spotify/trending`)
        const data = await response.json()
        return data.results || []
    } catch (error) {
        console.error('Spotify trending error:', error)
        return []
    }
}

/**
 * Helper to prepare a Spotify track for playback
 * Matches to YouTube if needed
 */
export async function prepareForPlayback(track) {
    // If track already has videoId, return as-is
    if (track.videoId) {
        return track
    }

    // Match Spotify track to YouTube
    const match = await matchToYouTube(track.title, track.artist)

    return {
        ...track,
        videoId: match.videoId,
        ytTitle: match.ytTitle,
        ytArtist: match.ytArtist
    }
}
