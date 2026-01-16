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
// EXPRESS SETUP
// ========================================

app.use(cors())
app.use(express.json())

const YT_DLP_PATH = process.env.YT_DLP_PATH || path.join(__dirname, 'yt-dlp.exe')

// Simple in-memory cache
const cache = {
    search: new Map(),
    stream: new Map(),
    lastfm: new Map(),
    trending: { data: null, timestamp: 0 }
}

// Cache TTL (Time To Live)
const SEARCH_TTL = 1000 * 60 * 60 // 1 hour
const STREAM_TTL = 1000 * 60 * 30 // 30 min (URLs expire)
const LASTFM_TTL = 1000 * 60 * 60 // 1 hour
const TRENDING_TTL = 1000 * 60 * 60 * 3 // 3 hours

// ========================================
// LAST.FM API (for recommendations)
// ========================================
const LASTFM_API_KEY = process.env.LASTFM_API_KEY || 'b25b959554ed76058ac220b7b2e0a026'

// Get similar tracks from Last.fm
async function getLastFmSimilarTracks(trackName, artistName, limit = 25) {
    try {
        console.log(`🎵 Last.fm: Getting similar tracks for "${trackName}" by "${artistName}"`)

        const params = new URLSearchParams({
            method: 'track.getsimilar',
            track: trackName,
            artist: artistName,
            api_key: LASTFM_API_KEY,
            format: 'json',
            limit: limit.toString()
        })

        const response = await fetch(`https://ws.audioscrobbler.com/2.0/?${params}`)

        if (!response.ok) {
            throw new Error(`Last.fm API error: ${response.status}`)
        }

        const data = await response.json()

        if (data.error) {
            throw new Error(`Last.fm error: ${data.message}`)
        }

        const similarTracks = data.similartracks?.track || []

        const results = similarTracks.map(track => ({
            title: track.name,
            artist: track.artist?.name || 'Unknown',
            thumbnail: track.image?.[2]?.['#text'] || null,
            ytSearchQuery: `${track.name} ${track.artist?.name || ''}`,
            matchScore: parseFloat(track.match) || 0,
            source: 'lastfm'
        }))

        console.log(`📋 Last.fm: Found ${results.length} similar tracks`)
        return results
    } catch (error) {
        console.error('Last.fm error:', error.message)
        return []
    }
}

// Get top tracks for a tag/genre from Last.fm
async function getLastFmTopTracks(tag = 'pop', limit = 25) {
    try {
        console.log(`🎵 Last.fm: Getting top tracks for tag "${tag}"`)

        const params = new URLSearchParams({
            method: 'tag.gettoptracks',
            tag: tag,
            api_key: LASTFM_API_KEY,
            format: 'json',
            limit: limit.toString()
        })

        const response = await fetch(`https://ws.audioscrobbler.com/2.0/?${params}`)

        if (!response.ok) {
            throw new Error(`Last.fm API error: ${response.status}`)
        }

        const data = await response.json()
        const tracks = data.tracks?.track || []

        return tracks.map(track => ({
            title: track.name,
            artist: track.artist?.name || 'Unknown',
            thumbnail: track.image?.[2]?.['#text'] || null,
            ytSearchQuery: `${track.name} ${track.artist?.name || ''}`,
            source: 'lastfm'
        }))
    } catch (error) {
        console.error('Last.fm top tracks error:', error.message)
        return []
    }
}

// Get track info from Last.fm
async function getLastFmTrackInfo(trackName, artistName) {
    try {
        const params = new URLSearchParams({
            method: 'track.getInfo',
            track: trackName,
            artist: artistName,
            api_key: LASTFM_API_KEY,
            format: 'json'
        })

        const response = await fetch(`https://ws.audioscrobbler.com/2.0/?${params}`)

        if (!response.ok) return null

        const data = await response.json()
        const track = data.track

        if (!track) return null

        return {
            title: track.name,
            artist: track.artist?.name || artistName,
            album: track.album?.title || '',
            thumbnail: track.album?.image?.[3]?.['#text'] || track.album?.image?.[2]?.['#text'] || null,
            duration: parseInt(track.duration) / 1000 || 0,
            listeners: parseInt(track.listeners) || 0,
            playcount: parseInt(track.playcount) || 0,
            tags: track.toptags?.tag?.map(t => t.name) || [],
            source: 'lastfm'
        }
    } catch (error) {
        console.error('Last.fm track info error:', error.message)
        return null
    }
}

// ========================================
// YT-DLP HELPER
// ========================================

function runYtDlp(args, timeout = 30000) {
    return new Promise((resolve, reject) => {
        const process = spawn(YT_DLP_PATH, args)
        let stdout = ''
        let stderr = ''

        const timer = setTimeout(() => {
            process.kill()
            reject(new Error('yt-dlp timeout'))
        }, timeout)

        process.stdout.on('data', (data) => {
            stdout += data.toString()
        })

        process.stderr.on('data', (data) => {
            stderr += data.toString()
        })

        process.on('close', (code) => {
            clearTimeout(timer)
            if (code === 0) {
                resolve(stdout.trim())
            } else {
                reject(new Error(stderr || `yt-dlp exited with code ${code}`))
            }
        })

        process.on('error', (err) => {
            clearTimeout(timer)
            reject(new Error(`Failed to spawn yt-dlp: ${err.message}`))
        })
    })
}

// ========================================
// YOUTUBE ENDPOINTS (via yt-dlp)
// ========================================

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        mode: 'yt-dlp + Last.fm',
        cacheSize: {
            search: cache.search.size,
            stream: cache.stream.size,
            lastfm: cache.lastfm.size
        }
    })
})

// Search YouTube
app.get('/api/search', async (req, res) => {
    const { q } = req.query

    if (!q) {
        return res.status(400).json({ error: 'Query is required' })
    }

    const cacheKey = q.toLowerCase()
    if (cache.search.has(cacheKey)) {
        const { data, timestamp } = cache.search.get(cacheKey)
        if (Date.now() - timestamp < SEARCH_TTL) {
            console.log(`⚡ Cache hit for search: ${q}`)
            return res.json({ results: data })
        }
    }

    try {
        console.log(`\n🔍 Searching YouTube for: ${q}`)

        const args = [
            `ytsearch15:${q}`,
            '--dump-json',
            '--flat-playlist',
            '--no-warnings'
        ]

        const output = await runYtDlp(args)
        const lines = output.split('\n').filter(line => line.trim())

        const results = lines.map(line => {
            try {
                const item = JSON.parse(line)
                return {
                    id: item.id,
                    videoId: item.id,
                    title: item.title,
                    artist: item.uploader || item.channel || 'Unknown',
                    thumbnail: item.thumbnails?.[0]?.url || `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`,
                    duration: item.duration || 0
                }
            } catch {
                return null
            }
        }).filter(Boolean)

        cache.search.set(cacheKey, { data: results, timestamp: Date.now() })
        console.log(`📋 Found ${results.length} results`)
        res.json({ results })
    } catch (error) {
        console.error('Search error:', error.message)
        res.status(500).json({ error: 'Search failed', results: [] })
    }
})

// Get stream URL
app.get('/api/stream/:videoId', async (req, res) => {
    const { videoId } = req.params

    if (cache.stream.has(videoId)) {
        const { data, timestamp } = cache.stream.get(videoId)
        if (Date.now() - timestamp < STREAM_TTL) {
            console.log(`⚡ Cache hit for stream: ${videoId}`)
            return res.json(data)
        }
    }

    // Use full YouTube URL to prevent video IDs starting with '-' being interpreted as options
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`

    // Try multiple format options in order of preference
    const formatOptions = [
        'bestaudio[ext=m4a]/bestaudio[ext=webm]/bestaudio',
        'bestaudio/best',
        'worstaudio',  // Fallback to any audio
        'best'         // Last resort: any format
    ]

    for (const format of formatOptions) {
        try {
            console.log(`\n🎵 Getting stream for: ${videoId} (format: ${format})`)

            const args = [
                '-f', format,
                '--dump-json',
                '--no-warnings',
                '--no-playlist',
                '--geo-bypass',
                videoUrl
            ]

            const output = await runYtDlp(args, 45000) // 45 second timeout
            const data = JSON.parse(output)

            // Try to get URL from various possible locations
            const streamUrl = data.url || data.urls?.[0] ||
                data.requested_formats?.[0]?.url ||
                data.formats?.find(f => f.acodec !== 'none')?.url

            if (!streamUrl) {
                console.warn(`⚠️ No URL found with format ${format}, trying next...`)
                continue
            }

            const streamData = {
                url: streamUrl,
                title: data.title,
                artist: data.uploader || data.channel || data.artist || 'Unknown Artist',
                thumbnail: data.thumbnail || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
                duration: data.duration || 0
            }

            cache.stream.set(videoId, {
                data: streamData,
                timestamp: Date.now()
            })

            console.log(`✓ Stream found: ${streamData.title}`)
            return res.json(streamData)
        } catch (error) {
            console.warn(`⚠️ Format ${format} failed: ${error.message}`)
            // Continue to next format option
        }
    }

    // All formats failed
    console.error(`❌ All stream formats failed for: ${videoId}`)
    res.status(500).json({ error: 'Failed to get stream - video may be unavailable' })
})

// Get related tracks
app.get('/api/related/:videoId', async (req, res) => {
    const { videoId } = req.params

    try {
        console.log(`\n🔗 Getting related for: ${videoId}`)

        // Get video info first to know what to search for
        const videoUrl = `https://www.youtube.com/watch?v=${videoId}`
        const args = [
            '--dump-json',
            '--no-warnings',
            videoUrl
        ]

        const output = await runYtDlp(args)
        const data = JSON.parse(output)

        // Search for similar tracks based on title/artist
        const searchQuery = `${data.title} ${data.uploader || ''} similar`
        const searchArgs = [
            `ytsearch10:${searchQuery}`,
            '--dump-json',
            '--flat-playlist',
            '--no-warnings'
        ]

        const searchOutput = await runYtDlp(searchArgs)
        const lines = searchOutput.split('\n').filter(line => line.trim())

        const results = lines.map(line => {
            try {
                const item = JSON.parse(line)
                if (item.id === videoId) return null // Skip current track
                return {
                    id: item.id,
                    videoId: item.id,
                    title: item.title,
                    artist: item.uploader || item.channel || 'Unknown',
                    thumbnail: `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`,
                    duration: item.duration || 0
                }
            } catch {
                return null
            }
        }).filter(Boolean)

        res.json({ results })
    } catch (error) {
        console.error('Related error:', error.message)
        res.json({ results: [] })
    }
})

// Trending music
app.get('/api/trending', async (req, res) => {
    if (cache.trending.data && Date.now() - cache.trending.timestamp < TRENDING_TTL) {
        console.log('⚡ Cache hit for trending')
        return res.json({ results: cache.trending.data })
    }

    try {
        console.log('\n📈 Getting trending music')

        const args = [
            'ytsearch20:trending music 2024',
            '--dump-json',
            '--flat-playlist',
            '--no-warnings'
        ]

        const output = await runYtDlp(args)
        const lines = output.split('\n').filter(line => line.trim())

        const results = lines.map(line => {
            try {
                const item = JSON.parse(line)
                return {
                    id: item.id,
                    videoId: item.id,
                    title: item.title,
                    artist: item.uploader || item.channel || 'Unknown',
                    thumbnail: `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`,
                    duration: item.duration || 0
                }
            } catch {
                return null
            }
        }).filter(Boolean)

        cache.trending = { data: results, timestamp: Date.now() }

        console.log(`📋 Got ${results.length} trending tracks`)
        res.json({ results })
    } catch (error) {
        console.error('Trending error:', error.message)
        res.status(500).json({ error: 'Failed to get trending', results: [] })
    }
})

// Suggestions (YouTube Autocomplete via Google API)
app.get('/api/suggestions', async (req, res) => {
    const { q } = req.query

    if (!q || q.length < 1) {
        return res.json({ suggestions: [] })
    }

    try {
        const response = await fetch(`http://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q=${encodeURIComponent(q)}`)
        if (!response.ok) throw new Error('Suggestion API failed')

        const data = await response.json()
        const suggestions = data[1] || []

        res.json({ suggestions })
    } catch (error) {
        console.error('Suggestion error:', error.message)
        res.json({ suggestions: [] })
    }
})

// Synced Lyrics (LRCLIB)
// Helper function to clean track title for better lyrics matching
function cleanTrackTitle(title) {
    return title
        // Remove common YouTube suffixes
        .replace(/\s*\(Official\s*(Music\s*)?Video\)/gi, '')
        .replace(/\s*\(Official\s*Audio\)/gi, '')
        .replace(/\s*\(Lyrics?\)/gi, '')
        .replace(/\s*\(Lyric\s*Video\)/gi, '')
        .replace(/\s*\[Official\s*(Music\s*)?Video\]/gi, '')
        .replace(/\s*\[.*?Video.*?\]/gi, '')
        .replace(/\s*\|.*$/g, '') // Remove everything after |
        .replace(/\s*·.*$/g, '') // Remove everything after ·
        .replace(/\s*HD\s*$/gi, '')
        .replace(/\s*HQ\s*$/gi, '')
        .replace(/\s*4K\s*$/gi, '')
        .replace(/\s*\d{4}\s*$/g, '') // Remove year at end
        // Remove emoji and special characters
        .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')
        .replace(/[✨🎵🎶💫⭐🔥💯🎤🎧]/g, '')
        // Clean up extra whitespace
        .replace(/\s+/g, ' ')
        .trim()
}

// Helper function to clean artist name
function cleanArtistName(artist) {
    return artist
        .replace(/\s*-\s*Topic$/gi, '')
        .replace(/\s*VEVO$/gi, '')
        .replace(/\s*Official$/gi, '')
        .replace(/\s*Music$/gi, '')
        .trim()
}

app.get('/api/lyrics', async (req, res) => {
    const { track, artist, album, duration } = req.query

    if (!track || !artist) {
        return res.status(400).json({ error: 'Track and artist are required' })
    }

    // Clean the track and artist names for better matching
    const cleanedTrack = cleanTrackTitle(track)
    const cleanedArtist = cleanArtistName(artist)

    console.log(`\n🎤 Getting lyrics for: "${cleanedTrack}" by "${cleanedArtist}"`)
    console.log(`   (Original: "${track}" by "${artist}")`)

    // Try exact match first
    try {
        const params = new URLSearchParams({
            artist_name: cleanedArtist,
            track_name: cleanedTrack,
            album_name: album || '',
            duration: duration || ''
        })

        const response = await fetch(`https://lrclib.net/api/get?${params}`)

        if (response.ok) {
            const data = await response.json()
            console.log('✓ Lyrics found (exact match)')
            return res.json({
                syncedLyrics: data.syncedLyrics,
                plainLyrics: data.plainLyrics,
                instrumental: data.instrumental
            })
        }
    } catch (error) {
        console.warn('Exact match failed:', error.message)
    }

    // Try search API as fallback
    try {
        console.log('🔍 Trying lyrics search...')
        const searchQuery = `${cleanedTrack} ${cleanedArtist}`
        const searchResponse = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(searchQuery)}`)

        if (searchResponse.ok) {
            const results = await searchResponse.json()

            if (results && results.length > 0) {
                // Get the first result with synced lyrics, or just the first result
                const bestMatch = results.find(r => r.syncedLyrics) || results[0]
                console.log(`✓ Lyrics found via search: "${bestMatch.trackName}" by "${bestMatch.artistName}"`)

                return res.json({
                    syncedLyrics: bestMatch.syncedLyrics,
                    plainLyrics: bestMatch.plainLyrics,
                    instrumental: bestMatch.instrumental
                })
            }
        }
    } catch (error) {
        console.warn('Search fallback failed:', error.message)
    }

    // Nothing found
    console.log('❌ Lyrics not found')
    res.status(404).json({ error: 'Lyrics not found' })
})

// ========================================
// LAST.FM ENDPOINTS (Recommendations)
// ========================================

// Get personalized recommendations
app.get('/api/recommendations', async (req, res) => {
    const { track, artist, type = 'default' } = req.query

    try {
        console.log(`\n🎯 Getting recommendations: ${type}`)
        let results = []

        // If track/artist provided, use Last.fm similar tracks
        if (track && artist) {
            console.log('📡 Using Last.fm similar tracks')
            results = await getLastFmSimilarTracks(track, artist, 25)

            if (results.length > 0) {
                return res.json({ results, source: 'lastfm-similar' })
            }
        }

        // Use Last.fm top tracks by genre/tag based on type
        const tagMap = {
            'chill': 'chill',
            'energetic': 'dance',
            'discovery': 'indie',
            'focus': 'ambient',
            'default': 'pop'
        }
        const tag = tagMap[type] || 'pop'
        console.log(`📡 Getting Last.fm top tracks for: ${tag}`)
        results = await getLastFmTopTracks(tag, 25)

        res.json({ results, source: 'lastfm-top' })
    } catch (error) {
        console.error('Recommendations error:', error.message)
        res.status(500).json({ error: 'Failed to get recommendations', results: [] })
    }
})

// Get track metadata from Last.fm
app.get('/api/track-info', async (req, res) => {
    const { track, artist } = req.query

    if (!track || !artist) {
        return res.status(400).json({ error: 'Track and artist are required' })
    }

    try {
        const info = await getLastFmTrackInfo(track, artist)

        if (!info) {
            return res.status(404).json({ error: 'Track not found' })
        }

        res.json(info)
    } catch (error) {
        console.error('Track info error:', error.message)
        res.status(500).json({ error: 'Failed to get track info' })
    }
})

// Legacy endpoint for compatibility
app.get('/api/spotify/made-for-you', async (req, res) => {
    const { track, artist, type = 'default' } = req.query

    try {
        console.log(`\n🎯 Made For You (via Last.fm): ${type}`)
        let results = []

        if (track && artist) {
            results = await getLastFmSimilarTracks(track, artist, 25)
            if (results.length > 0) {
                return res.json({ results, source: 'lastfm' })
            }
        }

        const tagMap = {
            'chill': 'chill',
            'energetic': 'dance',
            'discovery': 'indie',
            'focus': 'ambient',
            'default': 'pop'
        }
        const tag = tagMap[type] || 'pop'
        results = await getLastFmTopTracks(tag, 25)

        res.json({ results, source: 'lastfm' })
    } catch (error) {
        console.error('Made For You error:', error.message)
        res.status(500).json({ error: 'Failed to get recommendations', results: [] })
    }
})

// ========================================
// START SERVER
// ========================================

app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🎵 Music Server running on port ${PORT}`)
    console.log(`📍 Mode: yt-dlp + Last.fm`)
    console.log(`📂 yt-dlp path: ${YT_DLP_PATH}`)
    console.log(`\n✓ Ready to serve requests\n`)

    // Keep-alive: Ping self every 14 minutes to prevent Render free tier spin-down
    const RENDER_URL = process.env.RENDER_EXTERNAL_URL
    if (RENDER_URL) {
        console.log(`🔄 Keep-alive enabled for: ${RENDER_URL}`)
        setInterval(async () => {
            try {
                await fetch(`${RENDER_URL}/api/health`)
                console.log('💓 Keep-alive ping sent')
            } catch (err) {
                console.log('⚠️ Keep-alive ping failed:', err.message)
            }
        }, 14 * 60 * 1000) // Every 14 minutes
    }
})
