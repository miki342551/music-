import express from 'express'
import cors from 'cors'
import { spawn } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3001



// CORS configuration
app.use(cors())
app.use(express.json())

const YT_DLP_PATH = process.env.YT_DLP_PATH || path.join(__dirname, 'yt-dlp.exe')

// Simple in-memory cache
const cache = {
    search: new Map(),
    stream: new Map(),
    trending: { data: null, timestamp: 0 }
}

// Cache TTL (Time To Live)
const SEARCH_TTL = 1000 * 60 * 60 // 1 hour
const STREAM_TTL = 1000 * 60 * 60 // 1 hour (URLs expire)
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

// Get stream URL using yt-dlp with quality selection
app.get('/api/stream/:videoId', async (req, res) => {
    const { videoId } = req.params
    const quality = req.query.quality || 'high' // low, medium, high

    // Create cache key with quality
    const cacheKey = `${videoId}-${quality}`

    // Check cache
    if (cache.stream.has(cacheKey)) {
        const { data, timestamp } = cache.stream.get(cacheKey)
        if (Date.now() - timestamp < STREAM_TTL) {
            console.log(`⚡ Cache hit for stream: ${videoId} (${quality})`)
            return res.json(data)
        }
    }

    try {
        console.log(`\n🎵 Getting ${quality} quality stream for: ${videoId}`)

        // Select format based on quality
        let formatSelector
        switch (quality) {
            case 'low':
                formatSelector = 'worstaudio[abr<=64]/worstaudio'
                break
            case 'medium':
                formatSelector = 'bestaudio[abr<=128]/bestaudio[abr<=160]/bestaudio'
                break
            case 'high':
            default:
                formatSelector = 'bestaudio'
                break
        }

        const args = [
            '-f', formatSelector,
            '--dump-json',
            '--no-warnings',
            '--extractor-args', 'youtube:player_client=ios,mweb',
            '--user-agent', 'com.google.ios.youtube/19.29.1 (iPhone16,2; U; CPU iOS 17_5_1 like Mac OS X;)',
            '--add-header', 'Accept-Language:en-US,en;q=0.9',
            '--geo-bypass',
            '--no-check-certificates',
            '--socket-timeout', '30',
            '--retries', '3',
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
            duration: data.duration,
            quality: quality,
            bitrate: data.abr || 'unknown'
        }

        // Cache result
        cache.stream.set(cacheKey, {
            data: streamData,
            timestamp: Date.now()
        })

        // Prune cache if too large
        if (cache.stream.size > 200) {
            const firstKey = cache.stream.keys().next().value
            cache.stream.delete(firstKey)
        }

        console.log(`✓ Stream found: ${streamData.title} (${quality} @ ${streamData.bitrate}kbps)`)
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
