import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string
    error?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type, label, error, id, ...props }, ref) => {
        const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')

        return (
            <div className="space-y-1.5 group">
                {label && (
                    <label
                        htmlFor={inputId}
                        className={cn(
                            'block text-sm font-medium transition-colors duration-200',
                            error
                                ? 'text-red-600'
                                : 'text-neutral-700 group-focus-within:text-emerald-600'
                        )}
                    >
                        {label}
                    </label>
                )}
                <input
                    id={inputId}
                    type={type}
                    className={cn(
                        'flex h-11 w-full rounded-lg border bg-white px-4 py-2 text-sm',
                        'transition-all duration-200 ease-out',
                        'placeholder:text-neutral-400',
                        'focus:outline-none focus:ring-2 focus:ring-offset-0',
                        error
                            ? [
                                'border-red-400 bg-red-50/30',
                                'focus:border-red-500 focus:ring-red-500/20',
                                'focus:shadow-[0_0_0_3px_rgba(239,68,68,0.15)]',
                            ].join(' ')
                            : [
                                'border-neutral-300',
                                'focus:border-emerald-500 focus:ring-emerald-500/20',
                                'focus:shadow-[0_0_0_3px_rgba(5,150,105,0.12)]',
                                'hover:border-neutral-400',
                            ].join(' '),
                        'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-neutral-50',
                        className
                    )}
                    ref={ref}
                    {...props}
                />
                {error && (
                    <p className="flex items-center gap-1 text-xs text-red-500 animate-fade-in-up">
                        {error}
                    </p>
                )}
            </div>
        )
    }
)
Input.displayName = 'Input'

export { Input }
