// Music API Service - Handles search and stream fetching

const API_BASE = '/api'

// Search for tracks
export async function searchTracks(query) {
    try {
        const response = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}`)
        const data = await response.json()
        return data.results || []
    } catch (error) {
        console.error('Search error:', error)
        return []
    }
}

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

// Get related tracks (for radio feature)
export async function getRelatedTracks(videoId) {
    try {
        const response = await fetch(`${API_BASE}/related/${videoId}`)
        const data = await response.json()
        return data.results || []
    } catch (error) {
        console.error('Related tracks error:', error)
        return []
    }
}

// Get trending/popular tracks
export async function getTrendingTracks() {
    try {
        const response = await fetch(`${API_BASE}/trending`)
        const data = await response.json()
        return data.results || []
    } catch (error) {
        console.error('Trending error:', error)
        return []
    }
}

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
