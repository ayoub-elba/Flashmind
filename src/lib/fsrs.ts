import { FSRS, Rating, State, createEmptyCard, generatorParameters, Card } from 'ts-fsrs'

// Default retention rate
const DEFAULT_RETENTION = 0.9

export interface UserSettings {
    retentionRate: number;
    dailyLimit: number;
}

export interface FlashcardDbRow {
    due: string;
    stability: number;
    difficulty: number;
    elapsed_days: number;
    scheduled_days: number;
    reps: number;
    lapses: number;
    state: number;
    learning_steps?: number;
    last_review: string | null | undefined;
    [key: string]: any; // Allow other columns like question, answer, id
}

/**
 * Create an FSRS instance with configurable retention rate.
 */
export function createFSRS(retention: number = DEFAULT_RETENTION): FSRS {
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
export function getUserSettings(): UserSettings {
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
export function saveUserSettings(settings: UserSettings): void {
    localStorage.setItem('flashmind_settings', JSON.stringify(settings))
}

/**
 * Convert a DB row into a ts-fsrs Card object.
 */
export function dbRowToCard(row: FlashcardDbRow): Card {
    return {
        due: new Date(row.due),
        learning_steps: row.learning_steps ?? 0,
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
export function cardToDbRow(card: Card): Partial<FlashcardDbRow> {
    return {
        due: card.due.toISOString(),
        learning_steps: card.learning_steps ?? 0,
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
