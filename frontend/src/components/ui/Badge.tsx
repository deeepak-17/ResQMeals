import { cn } from '@/lib/utils'

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
    variant?: 'available' | 'reserved' | 'collected' | 'expired' | 'default'
}

const badgeStyles = {
    available: 'bg-emerald-100 text-emerald-700 animate-pulse-available',
    reserved: 'bg-blue-100 text-blue-700',
    collected: 'bg-purple-100 text-purple-700',
    expired: 'bg-neutral-100 text-neutral-600',
    default: 'bg-neutral-100 text-neutral-700',
}

const badgeIcons = {
    available: '🟢',
    reserved: '🔵',
    collected: '✅',
    expired: '⚫',
    default: '',
}

export function Badge({ variant = 'default', className, children, ...props }: BadgeProps) {
    return (
        <span
            className={cn(
                'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium',
                badgeStyles[variant],
                className
            )}
            {...props}
        >
            {badgeIcons[variant]} {children}
        </span>
    )
}
