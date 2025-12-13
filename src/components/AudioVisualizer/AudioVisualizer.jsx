import { useEffect, useRef } from 'react'
import { usePlayerStore } from '../../store/playerStore'
import './AudioVisualizer.css'

function AudioVisualizer({ barCount = 5, size = 'small' }) {
    const isPlaying = usePlayerStore(state => state.isPlaying)
    const barsRef = useRef([])

    return (
        <div className={`audio-visualizer ${size} ${isPlaying ? 'playing' : ''}`}>
            {Array(barCount).fill(0).map((_, i) => (
                <span
                    key={i}
                    ref={el => barsRef.current[i] = el}
                    style={{ animationDelay: `${i * 0.15}s` }}
                />
            ))}
        </div>
    )
}

export default AudioVisualizer
