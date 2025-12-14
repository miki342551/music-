import express from 'express'
import cors from 'cors'
import { spawn } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3001

// ========================================
// SPOTIFY CONFIGURATION (Server-Side)
// ========================================

// Credentials from environment variables - works for ALL users
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || ''
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || ''

// Single token cache (server-wide)
let spotifyToken = {
    accessToken: null,
    expiresAt: 0
}

// Get Spotify access token (Client Credentials Flow)
async function getSpotifyToken() {
    // Return cached token if still valid (with 60s buffer)
    if (spotifyToken.accessToken && Date.now() < spotifyToken.expiresAt - 60000) {
        return spotifyToken.accessToken
    }

    if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
        throw new Error('Spotify credentials not configured on server')
    }

    console.log('🔑 Refreshing Spotify token...')

    const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic ' + Buffer.from(SPOTIFY_CLIENT_ID + ':' + SPOTIFY_CLIENT_SECRET).toString('base64')
        },
        body: 'grant_type=client_credentials'
    })

    if (!response.ok) {
        const error = await response.text()
        throw new Error(`Spotify auth failed: ${error}`)
    }

    const data = await response.json()
    spotifyToken = {
        accessToken: data.access_token,
        expiresAt: Date.now() + (data.expires_in * 1000)
    }

    console.log('✓ Spotify token refreshed')
    return spotifyToken.accessToken
}


// ========================================
// EXPRESS SETUP
// ========================================

// CORS configuration
app.use(cors())
app.use(express.json())

const YT_DLP_PATH = process.env.YT_DLP_PATH || path.join(__dirname, 'yt-dlp.exe')

// Simple in-memory cache
const cache = {
    search: new Map(),
    stream: new Map(),
    spotify: new Map(),
    trending: { data: null, timestamp: 0 }
}

// Cache TTL (Time To Live)
const SEARCH_TTL = 1000 * 60 * 60 // 1 hour
const STREAM_TTL = 1000 * 60 * 60 // 1 hour (URLs expire)
const SPOTIFY_TTL = 1000 * 60 * 60 // 1 hour
const TRENDING_TTL = 1000 * 60 * 60 * 3 // 3 hours

// Helper to run yt-dlp command
function runYtDlp(args) {
    return new Promise((resolve, reject) => {
        const process = spawn(YT_DLP_PATH, args)
        let stdout = ''
        let stderr = ''

        process.stdout.on('data', (data) => {
            stdout += data.toString()
        })

        process.stderr.on('data', (data) => {
            stderr += data.toString()
        })

        process.on('close', (code) => {
            if (code !== 0) {
                console.error('yt-dlp error:', stderr)
                reject(new Error(stderr || 'yt-dlp failed'))
            } else {
                resolve(stdout)
            }
        })
    })
}

// ========================================
// SPOTIFY API ENDPOINTS
// ========================================

// Spotify search - Get clean metadata from Spotify
app.get('/api/spotify/search', async (req, res) => {
    const { q } = req.query

    if (!q) {
        return res.status(400).json({ error: 'Query is required' })
    }

    // Check cache
    const cacheKey = `spotify:${q.toLowerCase()}`
    if (cache.spotify.has(cacheKey)) {
        const { data, timestamp } = cache.spotify.get(cacheKey)
        if (Date.now() - timestamp < SPOTIFY_TTL) {
            console.log(`⚡ Cache hit for Spotify search: ${q}`)
            return res.json({ results: data })
        }
    }

    try {
        const token = await getSpotifyToken()
        console.log(`\n🎵 Spotify search: ${q}`)

        const response = await fetch(
            `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=track&limit=20`,
            { headers: { 'Authorization': `Bearer ${token}` } }
        )

        if (!response.ok) {
            throw new Error(`Spotify API error: ${response.status}`)
        }

        const data = await response.json()

        const results = data.tracks.items.map(track => ({
            spotifyId: track.id,
            title: track.name,
            artist: track.artists.map(a => a.name).join(', '),
            artistId: track.artists[0]?.id,
            album: track.album.name,
            albumId: track.album.id,
            thumbnail: track.album.images[0]?.url || track.album.images[1]?.url,
            duration: Math.floor(track.duration_ms / 1000),
            // Pre-calculate search query for YouTube matching
            ytSearchQuery: `${track.name} ${track.artists[0]?.name || ''}`
        }))

        // Cache results
        cache.spotify.set(cacheKey, { data: results, timestamp: Date.now() })

        // Prune cache
        if (cache.spotify.size > 100) {
            const firstKey = cache.spotify.keys().next().value
            cache.spotify.delete(firstKey)
        }

        console.log(`📋 Found ${results.length} Spotify results`)
        res.json({ results })
    } catch (error) {
        console.error('Spotify search error:', error.message)
        // Fallback to YouTube search if Spotify fails
        res.status(500).json({ error: 'Spotify search failed', fallback: true })
    }
})

// Match Spotify track to YouTube video for streaming
app.get('/api/spotify/match', async (req, res) => {
    const { title, artist } = req.query

    if (!title) {
        return res.status(400).json({ error: 'Title is required' })
    }

    const searchQuery = artist ? `${title} ${artist}` : title

    // Check cache
    const cacheKey = `match:${searchQuery.toLowerCase()}`
    if (cache.search.has(cacheKey)) {
        const { data, timestamp } = cache.search.get(cacheKey)
        if (Date.now() - timestamp < SEARCH_TTL) {
            console.log(`⚡ Cache hit for match: ${searchQuery}`)
            return res.json(data)
        }
    }

    try {
        console.log(`\n🔗 Matching to YouTube: ${searchQuery}`)

        // Search for first result only
        const args = [
            `ytsearch1:${searchQuery}`,
            '--dump-json',
            '--flat-playlist',
            '--no-warnings',
            '--default-search', 'ytsearch'
        ]

        const output = await runYtDlp(args)
        const lines = output.trim().split('\n').filter(l => l)

        if (lines.length === 0) {
            return res.status(404).json({ error: 'No match found' })
        }

        const item = JSON.parse(lines[0])
        const result = {
            videoId: item.id,
            ytTitle: item.title,
            ytArtist: item.uploader || item.artist || 'Unknown'
        }

        // Cache result
        cache.search.set(cacheKey, { data: result, timestamp: Date.now() })

        console.log(`✓ Matched to: ${item.id} - ${item.title}`)
        res.json(result)
    } catch (error) {
        console.error('Match error:', error.message)
        res.status(500).json({ error: 'Failed to match track' })
    }
})

// Get personalized "Made For You" recommendations
app.get('/api/spotify/made-for-you', async (req, res) => {
    const { seeds, type = 'default' } = req.query

    if (!seeds) {
        return res.status(400).json({ error: 'Seed tracks required' })
    }

    try {
        const token = await getSpotifyToken()
        console.log(`\n🎯 Getting Made For You: ${type}`)

        // Build recommendations URL with audio features based on type
        let params = `seed_tracks=${encodeURIComponent(seeds)}&limit=25`

        // Customize based on mix type
        switch (type) {
            case 'chill':
                params += '&target_energy=0.4&target_valence=0.5&target_tempo=100'
                break
            case 'energetic':
                params += '&target_energy=0.8&target_danceability=0.7&target_tempo=130'
                break
            case 'discovery':
                params += '&min_popularity=20&max_popularity=60' // Less mainstream
                break
            case 'focus':
                params += '&target_instrumentalness=0.5&target_energy=0.5&target_tempo=110'
                break
            default:
                // Default mix - balanced
                break
        }

        const response = await fetch(
            `https://api.spotify.com/v1/recommendations?${params}`,
            { headers: { 'Authorization': `Bearer ${token}` } }
        )

        if (!response.ok) {
            throw new Error(`Spotify API error: ${response.status}`)
        }

        const data = await response.json()

        const results = data.tracks.map(track => ({
            spotifyId: track.id,
            title: track.name,
            artist: track.artists.map(a => a.name).join(', '),
            album: track.album.name,
            thumbnail: track.album.images[0]?.url || track.album.images[1]?.url,
            duration: Math.floor(track.duration_ms / 1000),
            ytSearchQuery: `${track.name} ${track.artists[0]?.name || ''}`
        }))

        console.log(`📋 Made For You: ${results.length} tracks`)
        res.json({ results })
    } catch (error) {
        console.error('Made For You error:', error.message)
        res.status(500).json({ error: 'Failed to get recommendations', results: [] })
    }
})

// Get related tracks from Spotify (for radio feature)
app.get('/api/spotify/related/:spotifyId', async (req, res) => {
    const { spotifyId } = req.params

    try {
        const token = await getSpotifyToken()
        console.log(`\n📻 Getting related tracks for: ${spotifyId}`)

        // Get recommendations based on seed track
        const response = await fetch(
            `https://api.spotify.com/v1/recommendations?seed_tracks=${spotifyId}&limit=20`,
            { headers: { 'Authorization': `Bearer ${token}` } }
        )

        if (!response.ok) {
            throw new Error(`Spotify API error: ${response.status}`)
        }

        const data = await response.json()

        const results = data.tracks.map(track => ({
            spotifyId: track.id,
            title: track.name,
            artist: track.artists.map(a => a.name).join(', '),
            album: track.album.name,
            thumbnail: track.album.images[0]?.url || track.album.images[1]?.url,
            duration: Math.floor(track.duration_ms / 1000),
            ytSearchQuery: `${track.name} ${track.artists[0]?.name || ''}`
        }))

        console.log(`📋 Found ${results.length} related tracks`)
        res.json({ results })
    } catch (error) {
        console.error('Related tracks error:', error.message)
        res.status(500).json({ error: 'Failed to get related tracks', results: [] })
    }
})

// Get Spotify trending/new releases for home page
app.get('/api/spotify/trending', async (req, res) => {
    try {
        const token = await getSpotifyToken()
        console.log('\n📈 Getting Spotify new releases')

        const response = await fetch(
            `https://api.spotify.com/v1/browse/new-releases?limit=20`,
            { headers: { 'Authorization': `Bearer ${token}` } }
        )

        if (!response.ok) {
            throw new Error(`Spotify API error: ${response.status}`)
        }

        const data = await response.json()

        // Get first track from each album
        const albumPromises = data.albums.items.slice(0, 10).map(async album => {
            try {
                const tracksRes = await fetch(
                    `https://api.spotify.com/v1/albums/${album.id}/tracks?limit=1`,
                    { headers: { 'Authorization': `Bearer ${token}` } }
                )
                const tracksData = await tracksRes.json()
                const track = tracksData.items[0]
                if (!track) return null

                return {
                    spotifyId: track.id,
                    title: track.name,
                    artist: track.artists.map(a => a.name).join(', '),
                    album: album.name,
                    thumbnail: album.images[0]?.url,
                    duration: Math.floor(track.duration_ms / 1000),
                    ytSearchQuery: `${track.name} ${track.artists[0]?.name || ''}`
                }
            } catch {
                return null
            }
        })

        const results = (await Promise.all(albumPromises)).filter(r => r)
        console.log(`📋 Got ${results.length} trending tracks`)
        res.json({ results })
    } catch (error) {
        console.error('Spotify trending error:', error.message)
        res.status(500).json({ error: 'Failed to get trending', results: [] })
    }
})

// ========================================
// YOUTUBE/YT-DLP ENDPOINTS (Original)
// ========================================

// Search endpoint
app.get('/api/search', async (req, res) => {
    const { q } = req.query

    if (!q) {
        return res.status(400).json({ error: 'Query is required' })
    }

    // Check cache
    const cacheKey = q.toLowerCase()
    if (cache.search.has(cacheKey)) {
        const { data, timestamp } = cache.search.get(cacheKey)
        if (Date.now() - timestamp < SEARCH_TTL) {
            console.log(`⚡ Cache hit for search: ${q}`)
            return res.json({ results: data })
        }
    }

    try {
        console.log(`\n🔍 Searching for: ${q}`)
        // ytsearch20:query gets top 20 results
        // --dump-json gives us full metadata
        // --flat-playlist is faster but gives less info, we need full info for thumbnails etc
        // actually --flat-playlist is much faster, let's try to use it if possible, 
        // but we need thumbnails. 
        // Let's stick to full dump for now, it might be a bit slower but more reliable for metadata.
        // Optimization: --no-playlist to ensure we don't get playlist entries if not needed

        const args = [
            `ytsearch20:${q}`,
            '--dump-json',
            '--flat-playlist', // Much faster!
            '--no-warnings',
            '--default-search', 'ytsearch'
        ]

        const output = await runYtDlp(args)

        // Output is line-delimited JSON objects
        const results = output.trim().split('\n')
            .filter(line => line)
            .map(line => {
                try {
                    const item = JSON.parse(line)
                    return {
                        videoId: item.id,
                        title: item.title,
                        artist: item.uploader || item.artist || 'Unknown Artist',
                        // Construct thumbnail manually since flat-playlist doesn't return it
                        thumbnail: `https://i.ytimg.com/vi/${item.id}/mqdefault.jpg`,
                        duration: item.duration,
                        album: item.album
                    }
                } catch (e) {
                    return null
                }
            })
            .filter(item => item && item.videoId)

        // Cache results
        cache.search.set(cacheKey, {
            data: results,
            timestamp: Date.now()
        })

        // Prune cache if too large
        if (cache.search.size > 100) {
            const firstKey = cache.search.keys().next().value
            cache.search.delete(firstKey)
        }

        console.log(`📋 Found ${results.length} results`)
        res.json({ results })
    } catch (error) {
        console.error('Search error:', error)
        res.status(500).json({ error: 'Search failed', results: [] })
    }
})

// Get stream URL - simple approach
app.get('/api/stream/:videoId', async (req, res) => {
    const { videoId } = req.params

    // Check cache
    if (cache.stream.has(videoId)) {
        const { data, timestamp } = cache.stream.get(videoId)
        if (Date.now() - timestamp < STREAM_TTL) {
            console.log(`⚡ Cache hit for stream: ${videoId}`)
            return res.json(data)
        }
    }

    try {
        console.log(`\n🎵 Getting stream for: ${videoId}`)

        // Simple yt-dlp call - any audio format
        const args = [
            '-f', 'bestaudio/best',
            '--dump-json',
            '--no-warnings',
            videoId
        ]

        const output = await runYtDlp(args)
        const data = JSON.parse(output)

        if (!data.url) {
            throw new Error('No stream URL found')
        }

        const streamData = {
            url: data.url,
            title: data.title,
            artist: data.uploader || data.artist || 'Unknown Artist',
            thumbnail: data.thumbnail,
            duration: data.duration
        }

        // Cache result
        cache.stream.set(videoId, {
            data: streamData,
            timestamp: Date.now()
        })

        // Prune cache if too large
        if (cache.stream.size > 200) {
            const firstKey = cache.stream.keys().next().value
            cache.stream.delete(firstKey)
        }

        console.log(`✓ Stream found: ${streamData.title}`)
        res.json(streamData)
    } catch (error) {
        console.error('Stream error:', error)
        res.status(500).json({ error: 'Failed to get stream' })
    }
})

// Get related tracks (using search for now as yt-dlp doesn't have direct "related" command easily)
app.get('/api/related/:videoId', async (req, res) => {
    const { videoId } = req.params
    res.json({ results: [] })
})

// Download endpoint
app.get('/api/download/:videoId', async (req, res) => {
    const { videoId } = req.params

    try {
        console.log(`\n⬇️ Downloading: ${videoId}`)

        // Get metadata first for filename
        const metaArgs = ['--dump-json', '--no-warnings', videoId]
        const metaOutput = await runYtDlp(metaArgs)
        const meta = JSON.parse(metaOutput)
        const filename = `${meta.title.replace(/[^a-z0-9]/gi, '_')}.mp3`

        res.header('Content-Disposition', `attachment; filename="${filename}"`)
        res.header('Content-Type', 'audio/mpeg')

        // Stream download directly to response
        const args = [
            '-f', 'bestaudio',
            '-o', '-', // Output to stdout
            videoId
        ]

        const process = spawn(YT_DLP_PATH, args)

        process.stdout.pipe(res)

        process.stderr.on('data', (data) => {
            // console.error('Download stderr:', data.toString())
        })

        process.on('close', (code) => {
            if (code !== 0) {
                console.error('Download process exited with code', code)
            } else {
                console.log('✓ Download completed')
            }
        })
    } catch (error) {
        console.error('Download error:', error)
        if (!res.headersSent) {
            res.status(500).json({ error: 'Download failed' })
        }
    }
})

// Get trending music
app.get('/api/trending', async (req, res) => {
    // Check cache
    if (cache.trending.data && Date.now() - cache.trending.timestamp < TRENDING_TTL) {
        console.log('⚡ Cache hit for trending')
        return res.json({ results: cache.trending.data })
    }

    try {
        console.log('\n📈 Getting trending music')
        // Search for a trending playlist or topic
        const args = [
            'ytsearch20:trending music 2024',
            '--dump-json',
            '--no-playlist',
            '--no-warnings'
        ]

        const output = await runYtDlp(args)

        const results = output.trim().split('\n')
            .filter(line => line)
            .map(line => {
                try {
                    const item = JSON.parse(line)
                    return {
                        videoId: item.id,
                        title: item.title,
                        artist: item.uploader || 'Unknown Artist',
                        thumbnail: item.thumbnail,
                        duration: item.duration
                    }
                } catch (e) {
                    return null
                }
            })
            .filter(item => item && item.videoId)

        // Cache results
        cache.trending = {
            data: results,
            timestamp: Date.now()
        }

        res.json({ results })
    } catch (error) {
        console.error('Trending error:', error)
        res.status(500).json({ error: 'Failed to get trending', results: [] })
    }
})

// Search suggestions endpoint
app.get('/api/suggestions', async (req, res) => {
    const { q } = req.query

    if (!q || q.length < 2) {
        return res.json({ suggestions: [] })
    }

    try {
        // Use YouTube's autocomplete API
        const response = await fetch(
            `https://suggestqueries.google.com/complete/search?client=youtube&ds=yt&q=${encodeURIComponent(q)}`
        )
        const text = await response.text()

        // Parse JSONP response: window.google.ac.h(["query",[["suggestion1",0],["suggestion2",0],...]])
        const match = text.match(/\[.*\]/)
        if (match) {
            const data = JSON.parse(match[0])
            const suggestions = data[1]?.map(item => item[0]) || []
            return res.json({ suggestions: suggestions.slice(0, 8) })
        }

        res.json({ suggestions: [] })
    } catch (error) {
        console.error('Suggestions error:', error)
        res.json({ suggestions: [] })
    }
})

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        mode: 'yt-dlp',
        cacheSize: {
            search: cache.search.size,
            stream: cache.stream.size
        }
    })
})

app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════╗
║  🎵 GE'EZ music Backend Server (yt-dlp)   ║
║  Running on http://localhost:${PORT}          ║
║  ⚡ Caching Enabled                       ║
╚═══════════════════════════════════════════╝
  `)
})
