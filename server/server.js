import express from 'express'
import cors from 'cors'
import { spawn } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'
import { Innertube } from 'youtubei.js'

// Innertube Singleton
let youtube = null
async function getYoutube() {
    if (!youtube) {
        youtube = await Innertube.create()
    }
    return youtube
}

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
const STREAM_TTL = 1000 * 60 * 60 // 1 hour (URLs expire)
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
            if (code === 0) {
                resolve(stdout.trim())
            } else {
                reject(new Error(stderr || `yt-dlp exited with code ${code}`))
            }
        })

        process.on('error', (err) => {
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

    // 1. Try Innertube
    try {
        console.log(`\n🔍 Searching YouTube (Innertube) for: ${q}`)
        const yt = await getYoutube()
        const search = await yt.search(q)

        // Filter for videos only
        const videos = search.videos || []

        const results = videos.map(video => ({
            id: video.id,
            videoId: video.id,
            title: video.title.text || video.title,
            artist: video.author.name || video.author,
            thumbnail: video.thumbnails[0]?.url,
            duration: video.duration.seconds || 0
        }))

        if (results.length > 0) {
            cache.search.set(cacheKey, { data: results, timestamp: Date.now() })
            console.log(`📋 Found ${results.length} results (Innertube)`)
            return res.json({ results })
        }
    } catch (error) {
        console.warn('⚠️ Innertube search failed, falling back to yt-dlp:', error.message)
    }

    // 2. Fallback to yt-dlp
    try {
        console.log(`🐢 Searching YouTube (yt-dlp) for: ${q}`)

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
        console.log(`📋 Found ${results.length} results (yt-dlp)`)
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

    // 1. Try Innertube
    try {
        console.log(`\n🎵 Getting stream (Innertube) for: ${videoId}`)
        const yt = await getYoutube()
        const info = await yt.getBasicInfo(videoId)

        const format = info.chooseFormat({ type: 'audio', quality: 'best' })

        // Some formats have URL directly, others need deciphering
        let url = null
        if (format.url) {
            // URL is already available, no deciphering needed
            url = format.url
        } else if (format.signatureCipher || format.cipher) {
            // URL needs to be deciphered
            try {
                url = format.decipher(yt.session.player)
            } catch (decipherError) {
                console.warn('⚠️ Decipher failed:', decipherError.message)
            }
        }

        if (url) {
            const streamData = {
                url: url,
                title: info.basic_info.title,
                artist: info.basic_info.author,
                thumbnail: info.basic_info.thumbnail?.[0]?.url,
                duration: info.basic_info.duration || 0
            }

            cache.stream.set(videoId, { data: streamData, timestamp: Date.now() })
            console.log(`✓ Stream found (Innertube): ${streamData.title}`)
            return res.json(streamData)
        }
    } catch (error) {
        console.warn('⚠️ Innertube stream failed, falling back to yt-dlp:', error.message)
    }

    // 2. Fallback to yt-dlp
    try {
        console.log(`🐢 Getting stream (yt-dlp) for: ${videoId}`)

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

        cache.stream.set(videoId, {
            data: streamData,
            timestamp: Date.now()
        })

        console.log(`✓ Stream found (yt-dlp): ${streamData.title}`)
        res.json(streamData)
    } catch (error) {
        console.error('Stream error:', error)
        res.status(500).json({ error: 'Failed to get stream' })
    }
})

// Get related tracks (YouTube mix)
app.get('/api/related/:videoId', async (req, res) => {
    const { videoId } = req.params

    // 1. Try Innertube
    try {
        console.log(`\n🔗 Getting related (Innertube) for: ${videoId}`)
        const yt = await getYoutube()
        const info = await yt.getBasicInfo(videoId)
        const related = info.related_videos || []

        const results = related.map(video => ({
            id: video.id,
            videoId: video.id,
            title: video.title.text || video.title,
            artist: video.author.name || video.author,
            thumbnail: video.thumbnails?.[0]?.url,
            duration: video.duration.seconds || 0
        })).filter(v => v.id) // Filter out non-video items

        if (results.length > 0) {
            console.log(`📋 Found ${results.length} related tracks (Innertube)`)
            return res.json({ results })
        }
    } catch (error) {
        console.warn('⚠️ Innertube related failed, falling back to yt-dlp:', error.message)
    }

    // 2. Fallback to yt-dlp
    try {
        console.log(`🐢 Getting related (yt-dlp) for: ${videoId}`)

        // Get video info first to know what to search for
        const args = [
            '--dump-json',
            '--no-warnings',
            videoId
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

    // 1. Try Innertube
    try {
        console.log('\n📈 Getting trending music (Innertube)')
        const yt = await getYoutube()
        const trending = await yt.getTrending()

        // Trending returns a mix of sections, we need to find the music videos
        // This part can be tricky as structure varies. 
        // For simplicity, let's look for the first section with videos.
        const videos = trending.videos || [] // This might need adjustment based on actual response structure

        // If direct videos aren't available, we might need to traverse sections
        // But for now, let's rely on fallback if this simple access fails or returns empty

        if (videos.length > 0) {
            const results = videos.map(video => ({
                id: video.id,
                videoId: video.id,
                title: video.title.text || video.title,
                artist: video.author.name || video.author,
                thumbnail: video.thumbnails?.[0]?.url,
                duration: video.duration.seconds || 0
            }))

            cache.trending = { data: results, timestamp: Date.now() }
            console.log(`📋 Got ${results.length} trending tracks (Innertube)`)
            return res.json({ results })
        }
    } catch (error) {
        console.warn('⚠️ Innertube trending failed, falling back to yt-dlp:', error.message)
    }

    // 2. Fallback to yt-dlp
    try {
        console.log('🐢 Getting trending music (yt-dlp)')

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

        console.log(`📋 Got ${results.length} trending tracks (yt-dlp)`)
        res.json({ results })
    } catch (error) {
        console.error('Trending error:', error.message)
        res.status(500).json({ error: 'Failed to get trending', results: [] })
    }
})

// Suggestions (YouTube Autocomplete)
app.get('/api/suggestions', async (req, res) => {
    const { q } = req.query

    if (!q || q.length < 1) {
        return res.json({ suggestions: [] })
    }

    // 1. Try Innertube
    try {
        const yt = await getYoutube()
        const suggestions = await yt.getSearchSuggestions(q)
        if (suggestions && suggestions.length > 0) {
            return res.json({ suggestions })
        }
    } catch (error) {
        console.warn('Innertube suggestions failed:', error.message)
    }

    // 2. Fallback to Google API
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
app.get('/api/lyrics', async (req, res) => {
    const { track, artist, album, duration } = req.query

    if (!track || !artist) {
        return res.status(400).json({ error: 'Track and artist are required' })
    }

    try {
        console.log(`\n🎤 Getting lyrics for: ${track} - ${artist}`)

        const params = new URLSearchParams({
            artist_name: artist,
            track_name: track,
            album_name: album || '',
            duration: duration || ''
        })

        const response = await fetch(`https://lrclib.net/api/get?${params}`)

        if (response.status === 404) {
            console.log('❌ Lyrics not found')
            return res.status(404).json({ error: 'Lyrics not found' })
        }

        if (!response.ok) {
            throw new Error(`LRCLIB error: ${response.status}`)
        }

        const data = await response.json()

        res.json({
            syncedLyrics: data.syncedLyrics,
            plainLyrics: data.plainLyrics,
            instrumental: data.instrumental
        })
    } catch (error) {
        console.error('Lyrics error:', error.message)
        res.status(500).json({ error: 'Failed to get lyrics' })
    }
})

// ========================================
// LAST.FM ENDPOINTS (Recommendations)
// ========================================

// Get personalized recommendations (like Spotify Made For You, but using Last.fm)
app.get('/api/recommendations', async (req, res) => {
    const { track, artist, type = 'default' } = req.query

    try {
        console.log(`\n🎯 Getting recommendations: ${type}`)
        let results = []

        // METHOD 1: If track/artist provided, use Last.fm similar tracks
        if (track && artist) {
            console.log('📡 Using Last.fm similar tracks')
            results = await getLastFmSimilarTracks(track, artist, 25)

            if (results.length > 0) {
                return res.json({ results, source: 'lastfm-similar' })
            }
        }

        // METHOD 2: Use Last.fm top tracks by genre/tag based on type
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

// Legacy endpoint for compatibility - redirect to new recommendations
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
    console.log(`📍 Mode: yt-dlp + Last.fm (No Spotify)`)
    console.log(`📂 yt-dlp path: ${YT_DLP_PATH}`)
    console.log(`\n✓ Ready to serve requests\n`)
})
