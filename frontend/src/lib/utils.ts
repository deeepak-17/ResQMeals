import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

// Utility for merging Tailwind classes safely
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

// Format date for display
export function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
    })
}

// Calculate time remaining until expiry
export function getTimeRemaining(expiryStr: string): { text: string; isUrgent: boolean } {
    const expiry = new Date(expiryStr)
    const now = new Date()
    const diff = expiry.getTime() - now.getTime()

    if (diff <= 0) return { text: 'Expired', isUrgent: true }

    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

    if (hours === 0) {
        return { text: `${minutes}m remaining`, isUrgent: true }
    }
    return { text: `${hours}h ${minutes}m remaining`, isUrgent: hours < 1 }
}

// Calculate expiry time (4 hours from prepared time per PRD.md)
export function calculateExpiryTime(preparedTime: string): Date {
    const prepared = new Date(preparedTime)
    return new Date(prepared.getTime() + 4 * 60 * 60 * 1000)
}
