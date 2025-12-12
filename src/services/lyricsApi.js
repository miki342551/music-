// Lyrics API Service - Fetches synced lyrics from LRCLib

const LRCLIB_API = 'https://lrclib.net/api'

// Fetch synced lyrics
export async function getLyrics(trackName, artistName, duration) {
    try {
        const params = new URLSearchParams({
            track_name: trackName,
            artist_name: artistName
        })

        if (duration) {
            params.append('duration', Math.floor(duration))
        }

        const response = await fetch(`${LRCLIB_API}/get?${params}`)

        if (!response.ok) {
            return null
        }

        const data = await response.json()
        return {
            syncedLyrics: data.syncedLyrics ? parseLRC(data.syncedLyrics) : null,
            plainLyrics: data.plainLyrics || null
        }
    } catch (error) {
        console.error('Lyrics fetch error:', error)
        return null
    }
}

// Search for lyrics
export async function searchLyrics(query) {
    try {
        const response = await fetch(`${LRCLIB_API}/search?q=${encodeURIComponent(query)}`)

        if (!response.ok) {
            return []
        }

        const data = await response.json()
        return data
    } catch (error) {
        console.error('Lyrics search error:', error)
        return []
    }
}

// Parse LRC format to timed lyrics array
export function parseLRC(lrcString) {
    if (!lrcString) return []

    const lines = lrcString.split('\n')
    const lyrics = []

    for (const line of lines) {
        // Match timestamp pattern [mm:ss.xx] or [mm:ss]
        const match = line.match(/\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\](.*)/)

        if (match) {
            const minutes = parseInt(match[1])
            const seconds = parseInt(match[2])
            const milliseconds = match[3] ? parseInt(match[3].padEnd(3, '0')) / 1000 : 0
            const text = match[4].trim()

            if (text) {
                lyrics.push({
                    time: minutes * 60 + seconds + milliseconds,
                    text
                })
            }
        }
    }

    return lyrics.sort((a, b) => a.time - b.time)
}

// Find current lyric line based on time
export function getCurrentLyricIndex(lyrics, currentTime) {
    if (!lyrics || lyrics.length === 0) return -1

    for (let i = lyrics.length - 1; i >= 0; i--) {
        if (currentTime >= lyrics[i].time) {
            return i
        }
    }

    return -1
}
