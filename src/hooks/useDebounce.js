import { useCallback, useRef } from 'react'

/**
 * Custom hook for debouncing function calls
 * @param {Function} callback - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Debounced function
 */
export function useDebounce(callback, delay = 300) {
    const timeoutRef = useRef(null)

    const debouncedCallback = useCallback((...args) => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
        }

        timeoutRef.current = setTimeout(() => {
            callback(...args)
        }, delay)
    }, [callback, delay])

    const cancel = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
        }
    }, [])

    return [debouncedCallback, cancel]
}

/**
 * Simple debounce function (non-hook version)
 * @param {Function} func - Function to debounce  
 * @param {number} wait - Wait time in ms
 * @returns {Function} Debounced function
 */
export function debounce(func, wait = 300) {
    let timeout = null

    const debouncedFunc = (...args) => {
        if (timeout) clearTimeout(timeout)
        timeout = setTimeout(() => func(...args), wait)
    }

    debouncedFunc.cancel = () => {
        if (timeout) clearTimeout(timeout)
    }

    return debouncedFunc
}

export default useDebounce
