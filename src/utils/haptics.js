/**
 * Haptic feedback utility for mobile devices
 * Uses the Vibration API when available
 */

/**
 * Trigger a light haptic feedback (short vibration)
 */
export function hapticLight() {
    if ('vibrate' in navigator) {
        navigator.vibrate(10)
    }
}

/**
 * Trigger a medium haptic feedback
 */
export function hapticMedium() {
    if ('vibrate' in navigator) {
        navigator.vibrate(25)
    }
}

/**
 * Trigger a heavy haptic feedback
 */
export function hapticHeavy() {
    if ('vibrate' in navigator) {
        navigator.vibrate(50)
    }
}

/**
 * Trigger a success pattern (double vibration)
 */
export function hapticSuccess() {
    if ('vibrate' in navigator) {
        navigator.vibrate([15, 50, 15])
    }
}

/**
 * Trigger an error pattern
 */
export function hapticError() {
    if ('vibrate' in navigator) {
        navigator.vibrate([50, 30, 50, 30, 50])
    }
}

/**
 * Trigger a selection changed haptic
 */
export function hapticSelection() {
    if ('vibrate' in navigator) {
        navigator.vibrate(5)
    }
}

export default {
    light: hapticLight,
    medium: hapticMedium,
    heavy: hapticHeavy,
    success: hapticSuccess,
    error: hapticError,
    selection: hapticSelection,
}
