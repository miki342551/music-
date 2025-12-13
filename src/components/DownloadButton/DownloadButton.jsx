import { useState } from 'react'
import './DownloadButton.css'

const DownloadButton = ({ videoId, title, className = '' }) => {
    const [isDownloading, setIsDownloading] = useState(false)

    const handleDownload = async (e) => {
        e.stopPropagation()
        if (isDownloading) return

        setIsDownloading(true)
        try {
            const response = await fetch(`https://music-production-4deb.up.railway.app/api/download/${videoId}`)
            if (!response.ok) throw new Error('Download failed')

            const blob = await response.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `${title}.mp3`
            document.body.appendChild(a)
            a.click()
            window.URL.revokeObjectURL(url)
            document.body.removeChild(a)
        } catch (error) {
            console.error('Download error:', error)
            alert('Failed to download track')
        } finally {
            setIsDownloading(false)
        }
    }

    return (
        <button
            className={`download-btn ${isDownloading ? 'downloading' : ''} ${className}`}
            onClick={handleDownload}
            title="Download MP3"
        >
            {isDownloading ? (
                <div className="spinner"></div>
            ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
            )}
        </button>
    )
}

export default DownloadButton
