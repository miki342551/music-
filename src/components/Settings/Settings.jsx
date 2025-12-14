import { useState } from 'react'
import './Settings.css'

export default function Settings({ isOpen, onClose }) {
    if (!isOpen) return null

    return (
        <div className="settings-overlay" onClick={onClose}>
            <div className="settings-modal" onClick={e => e.stopPropagation()}>
                <div className="settings-header">
                    <h2>⚙️ Settings</h2>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>

                <div className="settings-content">
                    <div className="settings-section">
                        <h3>🎵 Music Source</h3>
                        <div className="settings-info">
                            <div className="info-item success">
                                <span className="info-icon">✓</span>
                                <div>
                                    <strong>Spotify Metadata</strong>
                                    <p>Clean titles, high-quality album art, and recommendations</p>
                                </div>
                            </div>
                            <div className="info-item success">
                                <span className="info-icon">✓</span>
                                <div>
                                    <strong>YouTube Streaming</strong>
                                    <p>Free, ad-free audio via yt-dlp</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="settings-section">
                        <h3>ℹ️ About</h3>
                        <p className="settings-description">
                            GE'EZ Music uses Spotify for metadata and YouTube for streaming,
                            giving you the best of both worlds - clean music data and free playback.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
