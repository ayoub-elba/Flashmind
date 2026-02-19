import { FSRS, Rating, State, createEmptyCard, generatorParameters } from 'ts-fsrs'

// Default retention rate
const DEFAULT_RETENTION = 0.9

/**
 * Create an FSRS instance with configurable retention rate.
 */
export function createFSRS(retention = DEFAULT_RETENTION) {
    const params = generatorParameters({
        enable_fuzz: true,
        request_retention: retention,
    })
    return new FSRS(params)
}

// Default instance (used when no custom retention is needed)
export const f = createFSRS()
export { Rating, State, createEmptyCard }

/**
 * Get user settings from localStorage
 */
export function getUserSettings() {
    try {
        const stored = localStorage.getItem('flashmind_settings')
        if (stored) return JSON.parse(stored)
    } catch { }
    return {
        retentionRate: DEFAULT_RETENTION,
        dailyLimit: 0, // 0 = unlimited
    }
}

/**
 * Save user settings to localStorage
 */
export function saveUserSettings(settings) {
    localStorage.setItem('flashmind_settings', JSON.stringify(settings))
}

/**
 * Convert a DB row into a ts-fsrs Card object.
 */
export function dbRowToCard(row) {
    return {
        due: new Date(row.due),
        stability: row.stability,
        difficulty: row.difficulty,
        elapsed_days: row.elapsed_days,
        scheduled_days: row.scheduled_days,
        reps: row.reps,
        lapses: row.lapses,
        state: row.state,
        last_review: row.last_review ? new Date(row.last_review) : undefined,
    }
}

/**
 * Convert a ts-fsrs Card object into a plain object
 * suitable for Supabase insert/update.
 */
export function cardToDbRow(card) {
    return {
        due: card.due.toISOString(),
        stability: card.stability,
        difficulty: card.difficulty,
        elapsed_days: card.elapsed_days,
        scheduled_days: card.scheduled_days,
        reps: card.reps,
        lapses: card.lapses,
        state: card.state,
        last_review: card.last_review ? card.last_review.toISOString() : null,
    }
}
