import { describe, it, expect, beforeEach } from 'vitest';
import { dbRowToCard, cardToDbRow, getUserSettings } from './fsrs';

describe('FSRS Library Utils', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    describe('getUserSettings', () => {
        it('returns default settings when localStorage is empty', () => {
            const settings = getUserSettings();
            expect(settings).toEqual({
                retentionRate: 0.9,
                dailyLimit: 0,
            });
        });

        it('returns parsed settings when available in localStorage', () => {
            localStorage.setItem('flashmind_settings', JSON.stringify({
                retentionRate: 0.85,
                dailyLimit: 20,
            }));
            const settings = getUserSettings();
            expect(settings).toEqual({
                retentionRate: 0.85,
                dailyLimit: 20,
            });
        });
    });

    describe('dbRowToCard', () => {
        it('correctly maps a database row to a ts-fsrs Card object', () => {
            const dbRow = {
                due: '2026-04-07T10:00:00.000Z',
                stability: 1.2,
                difficulty: 3.5,
                elapsed_days: 2,
                scheduled_days: 1,
                reps: 4,
                lapses: 1,
                state: 2,
                learning_steps: 0,
                last_review: '2026-04-06T10:00:00.000Z'
            };

            const card = dbRowToCard(dbRow);

            expect(card.due).toBeInstanceOf(Date);
            expect(card.due.toISOString()).toBe('2026-04-07T10:00:00.000Z');
            expect(card.last_review).toBeInstanceOf(Date);
            expect(card.last_review.toISOString()).toBe('2026-04-06T10:00:00.000Z');
            expect(card.stability).toBe(1.2);
            expect(card.state).toBe(2);
        });

        it('handles missing last_review safely', () => {
            const dbRow = {
                due: '2026-04-07T10:00:00.000Z',
                stability: 0,
                difficulty: 0,
                elapsed_days: 0,
                scheduled_days: 0,
                reps: 0,
                lapses: 0,
                state: 0,
                learning_steps: 0,
                last_review: null
            };

            const card = dbRowToCard(dbRow);
            expect(card.last_review).toBeUndefined();
        });
    });

    describe('cardToDbRow', () => {
        it('correctly maps a ts-fsrs Card object to a database row', () => {
            const card = {
                due: new Date('2026-04-07T10:00:00.000Z'),
                stability: 2.2,
                difficulty: 4.5,
                elapsed_days: 5,
                scheduled_days: 3,
                reps: 5,
                lapses: 0,
                state: 2,
                learning_steps: 0,
                last_review: new Date('2026-04-02T10:00:00.000Z')
            };

            const row = cardToDbRow(card);

            expect(typeof row.due).toBe('string');
            expect(row.due).toBe('2026-04-07T10:00:00.000Z');
            expect(row.last_review).toBe('2026-04-02T10:00:00.000Z');
            expect(row.state).toBe(2);
            expect(row.stability).toBe(2.2);
        });

        it('handles null last_review correctly', () => {
            const card = {
                due: new Date('2026-04-07T10:00:00.000Z'),
                stability: 0,
                difficulty: 0,
                elapsed_days: 0,
                scheduled_days: 0,
                reps: 0,
                lapses: 0,
                state: 0,
                learning_steps: 0,
                last_review: undefined // undefined usually coming from ts-fsrs createEmptyCard()
            };

            const row = cardToDbRow(card);
            expect(row.last_review).toBeNull();
        });
    });
});
