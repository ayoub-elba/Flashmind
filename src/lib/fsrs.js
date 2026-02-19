import { FSRS, Rating, State, createEmptyCard, generatorParameters } from 'ts-fsrs'

const params = generatorParameters({ enable_fuzz: true })
export const f = new FSRS(params)
export { Rating, State, createEmptyCard }

/**
 * Convert a DB row into a ts-fsrs Card object.
 * Dates stored as ISO strings in Supabase need to be
 * converted back to Date objects.
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
