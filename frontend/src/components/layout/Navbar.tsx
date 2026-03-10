import { Link, useLocation } from 'react-router-dom'
import { UtensilsCrossed, Plus, ClipboardList, Home, LogIn } from 'lucide-react'
import { Button } from '@/components/ui'
import { cn } from '@/lib/utils'
import { useEffect, useState } from 'react'

export function Navbar() {
    const location = useLocation()
    const [scrolled, setScrolled] = useState(false)

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 12)
        window.addEventListener('scroll', handleScroll, { passive: true })
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    const isActive = (path: string) => location.pathname === path

    const navLinks = [
        { href: '/', label: 'Home', icon: Home },
        { href: '/donor/add', label: 'Donate', icon: Plus },
        { href: '/donor/history', label: 'My Donations', icon: ClipboardList },
    ]

    return (
        <header
            className={cn(
                'glass sticky top-0 z-50 border-b border-transparent',
                'transition-all duration-300 ease-out',
                scrolled
                    ? 'border-neutral-200/80 shadow-lg shadow-neutral-900/5'
                    : 'border-neutral-200/50'
            )}
        >
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="flex h-16 items-center justify-between">

                    {/* Logo */}
                    <Link
                        to="/"
                        className="group flex items-center gap-2.5"
                    >
                        <div className={cn(
                            'flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 shadow-md shadow-emerald-500/30',
                            'transition-all duration-300 ease-out',
                            'group-hover:rotate-6 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-emerald-500/40',
                        )}>
                            <UtensilsCrossed className="h-5 w-5 text-white" />
                        </div>
                        <span className="text-xl font-bold text-neutral-900 transition-colors duration-200 group-hover:text-emerald-700">
                            Res<span className="gradient-text">Q</span>Meals
                        </span>
                    </Link>

                    {/* Navigation */}
                    <nav className="hidden items-center gap-1 md:flex">
                        {navLinks.map(({ href, label, icon: Icon }) => (
                            <Link
                                key={href}
                                to={href}
                                className={cn(
                                    'relative flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium',
                                    'transition-all duration-200 ease-out',
                                    isActive(href)
                                        ? 'bg-emerald-50 text-emerald-700'
                                        : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
                                )}
                            >
                                <Icon className={cn(
                                    'h-4 w-4 transition-transform duration-200',
                                    isActive(href) && 'text-emerald-600'
                                )} />
                                {label}
                                {/* Active indicator */}
                                {isActive(href) && (
                                    <span className="absolute bottom-1 left-1/2 h-0.5 w-4 -translate-x-1/2 rounded-full bg-emerald-500 animate-scale-in" />
                                )}
                            </Link>
                        ))}
                    </nav>

                    {/* Actions */}
                    <div className="flex items-center gap-3">
                        <Button variant="outline" size="sm" asChild>
                            <Link to="/login">
                                <LogIn className="h-4 w-4" />
                                Login
                            </Link>
                        </Button>
                        <Button
                            size="sm"
                            asChild
                            className="animate-pulse-available shadow-emerald-500/30"
                        >
                            <Link to="/donor/add">
                                <Plus className="h-4 w-4" />
                                Donate Food
                            </Link>
                        </Button>
                    </div>
                </div>
            </div>
        </header>
    )
}
