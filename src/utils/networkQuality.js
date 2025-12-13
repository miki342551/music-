/**
 * Network quality detection utility
 * Uses Network Information API when available, falls back to speed test
 */

// Quality levels with corresponding bitrates
export const QUALITY_LEVELS = {
    LOW: { name: 'low', maxBitrate: 64, label: 'Data Saver' },
    MEDIUM: { name: 'medium', maxBitrate: 128, label: 'Normal' },
    HIGH: { name: 'high', maxBitrate: 256, label: 'High Quality' }
}

// Get current network quality level
export function getNetworkQuality() {
    // Check if Network Information API is available
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection

    if (connection) {
        // Use effective type for quick classification
        const effectiveType = connection.effectiveType

        switch (effectiveType) {
            case 'slow-2g':
            case '2g':
                return QUALITY_LEVELS.LOW
            case '3g':
                return QUALITY_LEVELS.MEDIUM
            case '4g':
            default:
                return QUALITY_LEVELS.HIGH
        }
    }

    // Fallback: assume high quality if API not available
    return QUALITY_LEVELS.HIGH
}

// Check if connection is metered (limited data)
export function isMeteredConnection() {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection
    return connection?.saveData || false
}

// Get downlink speed in Mbps (if available)
export function getDownlinkSpeed() {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection
    return connection?.downlink || null
}

// Subscribe to network changes
export function onNetworkChange(callback) {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection

    if (connection) {
        connection.addEventListener('change', () => {
            callback(getNetworkQuality())
        })
        return () => connection.removeEventListener('change', callback)
    }

    return () => { } // No-op cleanup if API not available
}

// Determine quality based on current conditions
export function getRecommendedQuality(userPreference = 'auto') {
    // If user set a specific preference, honor it
    if (userPreference !== 'auto') {
        return QUALITY_LEVELS[userPreference.toUpperCase()] || QUALITY_LEVELS.HIGH
    }

    // Check for data saver mode
    if (isMeteredConnection()) {
        return QUALITY_LEVELS.LOW
    }

    // Use network detection
    return getNetworkQuality()
}

export default {
    QUALITY_LEVELS,
    getNetworkQuality,
    isMeteredConnection,
    getDownlinkSpeed,
    onNetworkChange,
    getRecommendedQuality
}
