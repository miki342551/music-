// Music API Service - Uses Spotify for metadata, YouTube/yt-dlp for streaming
// Server uses environment variables for Spotify - works automatically for all users

const API_BASE = 'https://music-production-4deb.up.railway.app/api'

// ========================================
// SEARCH (Spotify Primary, YouTube Fallback)
// ========================================

// Search for tracks - Uses Spotify metadata for clean results
export async function searchTracks(query) {
    try {
        // Try Spotify first for cleaner metadata
        const response = await fetch(`${API_BASE}/spotify/search?q=${encodeURIComponent(query)}`)
        const data = await response.json()

        if (data.results && data.results.length > 0) {
            return data.results
        }

        // Fallback to YouTube if Spotify returns nothing
        console.log('Spotify returned no results, falling back to YouTube')
        return await searchTracksYouTube(query)
    } catch (error) {
        console.error('Spotify search error, falling back to YouTube:', error)
        return await searchTracksYouTube(query)
    }
}

// Direct YouTube search (fallback/legacy)
export async function searchTracksYouTube(query) {
    try {
        const response = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}`)
        const data = await response.json()
        return data.results || []
    } catch (error) {
        console.error('YouTube search error:', error)
        return []
    }
}

// ========================================
// MATCHING (Spotify -> YouTube)
// ========================================

// Match a track to YouTube for streaming
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

// ========================================
// STREAMING (YouTube/yt-dlp)
// ========================================

// Get stream URL for a video ID
export async function getStreamUrl(videoId) {
    try {
        const response = await fetch(`${API_BASE}/stream/${videoId}`)
        const data = await response.json()
        return data
    } catch (error) {
        console.error('Stream error:', error)
        return null
    }
}

// ========================================
// RELATED TRACKS (Spotify Recommendations)
// ========================================

// Get related tracks - Uses Spotify for better recommendations
export async function getRelatedTracks(track) {
    try {
        // If track has spotifyId, use Spotify recommendations
        if (track.spotifyId) {
            const response = await fetch(`${API_BASE}/spotify/related/${track.spotifyId}`)
            const data = await response.json()
            return data.results || []
        }

        // Fallback to YouTube related
        if (track.videoId) {
            const response = await fetch(`${API_BASE}/related/${track.videoId}`)
            const data = await response.json()
            return data.results || []
        }

        return []
    } catch (error) {
        console.error('Related tracks error:', error)
        return []
    }
}

// ========================================
// TRENDING/HOME (Spotify New Releases)
// ========================================

// Get trending/popular tracks - Uses Spotify new releases
export async function getTrendingTracks() {
    try {
        // Try Spotify trending first
        const response = await fetch(`${API_BASE}/spotify/trending`)
        const data = await response.json()

        if (data.results && data.results.length > 0) {
            return data.results
        }

        // Fallback to YouTube trending
        return await getTrendingTracksYouTube()
    } catch (error) {
        console.error('Spotify trending error, falling back to YouTube:', error)
        return await getTrendingTracksYouTube()
    }
}

// YouTube trending fallback
async function getTrendingTracksYouTube() {
    try {
        const response = await fetch(`${API_BASE}/trending`)
        const data = await response.json()
        return data.results || []
    } catch (error) {
        console.error('YouTube trending error:', error)
        return []
    }
}

// ========================================
// SUGGESTIONS
// ========================================

// Get search suggestions
export async function getSearchSuggestions(query) {
    try {
        const response = await fetch(`${API_BASE}/suggestions?q=${encodeURIComponent(query)}`)
        const data = await response.json()
        return data.suggestions || []
    } catch (error) {
        console.error('Suggestions error:', error)
        return []
    }
}

// ========================================
// TRACK DETAILS
// ========================================

// Get track details
export async function getTrackDetails(videoId) {
    try {
        const response = await fetch(`${API_BASE}/track/${videoId}`)
        const data = await response.json()
        return data
    } catch (error) {
        console.error('Track details error:', error)
        return null
    }
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

// Format duration from seconds to mm:ss
export function formatDuration(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
}

// Parse ISO 8601 duration to seconds
export function parseDuration(duration) {
    if (!duration) return 0
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
    if (!match) return 0
    const hours = parseInt(match[1]) || 0
    const minutes = parseInt(match[2]) || 0
    const seconds = parseInt(match[3]) || 0
    return hours * 3600 + minutes * 60 + seconds
}
