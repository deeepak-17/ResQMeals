import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cn, formatDate, getTimeRemaining, calculateExpiryTime } from '../lib/utils';

/**
 * Unit tests for ResQMeals/frontend utility functions
 * These utilities are used in the donor-facing FoodCard component.
 */
describe('ResQMeals Frontend Utilities', () => {

    // ─── cn (Tailwind class merger) ──────────────────────────────────
    describe('cn', () => {
        it('should merge two class names', () => {
            expect(cn('foo', 'bar')).toBe('foo bar');
        });

        it('should handle conditional classes (truthy)', () => {
            const result = cn('base', true && 'active');
            expect(result).toContain('base');
            expect(result).toContain('active');
        });

        it('should handle conditional classes (falsy)', () => {
            const result = cn('base', false && 'hidden');
            expect(result).not.toContain('hidden');
        });

        it('should merge conflicting Tailwind classes (last wins)', () => {
            const result = cn('bg-red-500', 'bg-blue-500');
            expect(result).toBe('bg-blue-500');
        });

        it('should return empty string for no arguments', () => {
            expect(cn()).toBe('');
        });

        it('should ignore undefined and null values', () => {
            expect(cn('foo', undefined, null as any, 'bar')).toBe('foo bar');
        });
    });

    // ─── formatDate ──────────────────────────────────────────────────
    describe('formatDate', () => {
        it('should return a non-empty string for a valid ISO date', () => {
            const result = formatDate('2026-01-15T10:30:00Z');
            expect(result).toBeTruthy();
            expect(typeof result).toBe('string');
        });

        it('should include the year in the output', () => {
            const result = formatDate('2026-06-20T14:30:00Z');
            expect(result).toMatch(/2026/);
        });

        it('should handle date-only strings', () => {
            const result = formatDate('2026-01-01');
            expect(result).toBeTruthy();
        });

        it('should return "Invalid Date" for bad input', () => {
            const result = formatDate('not-a-date');
            expect(result).toContain('Invalid');
        });
    });

    // ─── getTimeRemaining ────────────────────────────────────────────
    // Returns { text: string; isUrgent: boolean }
    describe('getTimeRemaining', () => {
        beforeEach(() => {
            vi.useFakeTimers();
            vi.setSystemTime(new Date('2026-01-15T12:00:00Z'));
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it('should return Expired with isUrgent=true for past dates', () => {
            const result = getTimeRemaining('2026-01-15T08:00:00Z');
            expect(result.text).toBe('Expired');
            expect(result.isUrgent).toBe(true);
        });

        it('should return hours and minutes remaining for future dates', () => {
            const result = getTimeRemaining('2026-01-15T15:30:00Z');
            expect(result.text).toBe('3h 30m remaining');
            expect(result.isUrgent).toBe(false);
        });

        it('should return only minutes when less than 1 hour remains', () => {
            const result = getTimeRemaining('2026-01-15T12:45:00Z');
            expect(result.text).toBe('45m remaining');
            expect(result.isUrgent).toBe(true); // < 1 hour is urgent
        });

        it('should return Expired for exactly current time', () => {
            const result = getTimeRemaining('2026-01-15T12:00:00Z');
            expect(result.text).toBe('Expired');
            expect(result.isUrgent).toBe(true);
        });

        it('should handle a full 4-hour window (newly created donation)', () => {
            const result = getTimeRemaining('2026-01-15T16:00:00Z');
            expect(result.text).toBe('4h 0m remaining');
            expect(result.isUrgent).toBe(false);
        });
    });

    // ─── calculateExpiryTime ─────────────────────────────────────────
    describe('calculateExpiryTime', () => {
        it('should add exactly 4 hours to prepared time', () => {
            const result = calculateExpiryTime('2026-01-15T10:00:00Z');
            expect(result.toISOString()).toBe('2026-01-15T14:00:00.000Z');
        });

        it('should handle midnight crossing', () => {
            const result = calculateExpiryTime('2026-01-15T22:00:00Z');
            expect(result.toISOString()).toBe('2026-01-16T02:00:00.000Z');
        });

        it('should return a Date object', () => {
            const result = calculateExpiryTime('2026-06-01T08:00:00Z');
            expect(result).toBeInstanceOf(Date);
        });

        it('should produce exactly 4 hours difference', () => {
            const prepared = new Date('2026-03-10T06:15:00Z');
            const expiry = calculateExpiryTime(prepared.toISOString());
            const diffMs = expiry.getTime() - prepared.getTime();
            expect(diffMs).toBe(4 * 60 * 60 * 1000);
        });
    });
});
