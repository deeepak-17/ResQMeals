import { UtensilsCrossed, Github, Twitter, Mail } from 'lucide-react'
import { Link } from 'react-router-dom'

export function Footer() {
    return (
        <footer className="mt-auto border-t-2 bg-white relative overflow-hidden"
            style={{ borderImage: 'linear-gradient(90deg, #059669, #f97316) 1' }}
        >
            {/* Decorative background orbs */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="blob blob-emerald absolute -bottom-8 -left-8 h-32 w-32" />
                <div className="blob blob-orange absolute -bottom-4 right-12 h-24 w-24" />
            </div>

            <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                <div className="flex flex-col items-center justify-between gap-6 md:flex-row">

                    {/* Logo & Tagline */}
                    <div className="group flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 shadow-sm shadow-emerald-500/30 transition-all duration-300 group-hover:rotate-6 group-hover:scale-110">
                            <UtensilsCrossed className="h-4 w-4 text-white" />
                        </div>
                        <div>
                            <p className="font-semibold text-neutral-900">ResQMeals</p>
                            <p className="text-xs text-neutral-500">Rescue Food, Feed Communities</p>
                        </div>
                    </div>

                    {/* Links */}
                    <nav className="flex gap-6 text-sm text-neutral-600">
                        {[
                            { to: '/about', label: 'About' },
                            { to: '/contact', label: 'Contact' },
                            { to: '/privacy', label: 'Privacy' },
                        ].map(({ to, label }) => (
                            <Link
                                key={to}
                                to={to}
                                className="relative font-medium transition-colors duration-200 hover:text-emerald-600 after:absolute after:-bottom-0.5 after:left-0 after:h-[2px] after:w-0 after:rounded-full after:bg-emerald-500 after:transition-all after:duration-300 hover:after:w-full"
                            >
                                {label}
                            </Link>
                        ))}
                    </nav>

                    {/* Social Icons */}
                    <div className="flex items-center gap-4">
                        {[
                            { icon: Github, label: 'GitHub' },
                            { icon: Twitter, label: 'Twitter' },
                            { icon: Mail, label: 'Email' },
                        ].map(({ icon: Icon, label }) => (
                            <a
                                key={label}
                                href="#"
                                aria-label={label}
                                className="group flex h-9 w-9 items-center justify-center rounded-full border border-neutral-200 text-neutral-400 transition-all duration-200 hover:scale-110 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-600 hover:shadow-md hover:shadow-emerald-500/15"
                            >
                                <Icon className="h-4 w-4 transition-transform duration-200 group-hover:scale-110" />
                            </a>
                        ))}
                    </div>
                </div>

                <div className="mt-6 border-t border-neutral-100 pt-6 text-center text-xs text-neutral-400">
                    © 2026 ResQMeals. Built with ❤️ for a hunger-free world.
                </div>
            </div>
        </footer>
    )
}
