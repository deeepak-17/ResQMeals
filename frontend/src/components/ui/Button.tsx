import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
    [
        'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium',
        'transition-all duration-200 ease-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-50',
        'active:scale-95',
        'relative overflow-hidden',
        'select-none',
    ].join(' '),
    {
        variants: {
            variant: {
                default: [
                    'bg-emerald-600 text-white',
                    'hover:bg-emerald-700 hover:shadow-xl hover:shadow-emerald-500/30',
                    'shadow-md shadow-emerald-500/20',
                    'before:absolute before:inset-0',
                    'before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent',
                    'before:translate-x-[-200%] hover:before:translate-x-[200%]',
                    'before:transition-transform before:duration-700 before:ease-in-out',
                ].join(' '),
                secondary: [
                    'bg-orange-500 text-white',
                    'hover:bg-orange-600 hover:shadow-xl hover:shadow-orange-500/30',
                    'shadow-md shadow-orange-500/20',
                ].join(' '),
                outline: [
                    'border-2 border-emerald-600 text-emerald-700',
                    'hover:bg-emerald-600 hover:text-white hover:shadow-lg hover:shadow-emerald-500/25',
                    'transition-all duration-200',
                ].join(' '),
                ghost: [
                    'hover:bg-neutral-100 text-neutral-700',
                    'hover:shadow-sm',
                ].join(' '),
                destructive: [
                    'bg-red-500 text-white',
                    'hover:bg-red-600 hover:shadow-lg hover:shadow-red-500/30',
                ].join(' '),
            },
            size: {
                default: 'h-10 px-5 py-2',
                sm: 'h-9 px-3 text-xs',
                lg: 'h-12 px-8 text-base',
                icon: 'h-10 w-10',
            },
        },
        defaultVariants: {
            variant: 'default',
            size: 'default',
        },
    }
)

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
    asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, asChild = false, ...props }, ref) => {
        const Comp = asChild ? Slot : 'button'
        return (
            <Comp
                className={cn(buttonVariants({ variant, size, className }))}
                ref={ref}
                {...props}
            />
        )
    }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
