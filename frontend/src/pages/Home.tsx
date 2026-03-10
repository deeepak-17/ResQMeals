import { Link } from 'react-router-dom'
import { ArrowRight, UtensilsCrossed, Users, Leaf, MapPin } from 'lucide-react'
import { Button, Card, CardContent } from '@/components/ui'
import { useEffect, useRef } from 'react'

// Scroll-reveal hook
function useScrollReveal() {
    const ref = useRef<HTMLDivElement>(null)
    useEffect(() => {
        const el = ref.current
        if (!el) return
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('visible')
                    }
                })
            },
            { threshold: 0.15 }
        )
        // Observe all reveal children
        const targets = el.querySelectorAll('.reveal, .reveal-left, .reveal-right')
        targets.forEach((t) => observer.observe(t))
        return () => observer.disconnect()
    }, [])
    return ref
}

export default function Home() {
    const pageRef = useScrollReveal()

    return (
        <div className="space-y-20" ref={pageRef}>

            {/* ── Hero Section ─────────────────────────────── */}
            <section className="relative py-16 text-center overflow-hidden">
                {/* Decorative background blobs */}
                <div className="pointer-events-none absolute inset-0 -z-10">
                    <div className="blob blob-emerald absolute -top-16 -left-16 h-72 w-72" />
                    <div className="blob blob-orange absolute top-8 right-0 h-56 w-56" />
                    <div className="blob blob-teal absolute -bottom-12 left-1/3 h-48 w-48" />
                </div>

                <div className="space-y-7">
                    <div className="animate-fade-in-up opacity-0" style={{ animationFillMode: 'forwards', animationDelay: '0ms' }}>
                        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-xs font-semibold text-emerald-700 shadow-sm">
                            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                            Fighting Food Waste, One Meal at a Time
                        </span>
                    </div>

                    <h1
                        className="text-4xl font-bold text-neutral-900 md:text-5xl lg:text-6xl leading-tight animate-fade-in-up opacity-0"
                        style={{ animationFillMode: 'forwards', animationDelay: '120ms' }}
                    >
                        Rescue Food,{' '}
                        <span className="gradient-text-animated bg-300% animate-gradient-shift">
                            Feed Communities
                        </span>
                    </h1>

                    <p
                        className="mx-auto max-w-2xl text-lg text-neutral-600 animate-fade-in-up opacity-0"
                        style={{ animationFillMode: 'forwards', animationDelay: '240ms' }}
                    >
                        Connect surplus food with those who need it most. Join our mission to reduce
                        waste and fight hunger in your community.
                    </p>

                    <div
                        className="flex flex-col items-center justify-center gap-4 sm:flex-row animate-fade-in-up opacity-0"
                        style={{ animationFillMode: 'forwards', animationDelay: '360ms' }}
                    >
                        <Button size="lg" asChild className="group">
                            <Link to="/donor/add">
                                <UtensilsCrossed className="h-5 w-5 transition-transform duration-300 group-hover:rotate-12" />
                                Donate Food Now
                                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                            </Link>
                        </Button>
                        <Button variant="outline" size="lg" asChild>
                            <Link to="/donor/history">View My Donations</Link>
                        </Button>
                    </div>

                    {/* Scroll hint */}
                    <div
                        className="flex justify-center animate-fade-in-up opacity-0"
                        style={{ animationFillMode: 'forwards', animationDelay: '520ms' }}
                    >
                        <div className="flex flex-col items-center gap-1 text-xs text-neutral-400">
                            <MapPin className="h-4 w-4 animate-float" />
                            <span>Connecting communities</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Stats Section ────────────────────────────── */}
            <section className="grid gap-6 md:grid-cols-3">
                {[
                    { icon: UtensilsCrossed, stat: '0', label: 'Meals Donated', color: 'bg-emerald-100 text-emerald-600', glow: 'hover:shadow-emerald-500/15', delay: '0ms' },
                    { icon: Users, stat: '0', label: 'Lives Impacted', color: 'bg-orange-100 text-orange-600', glow: 'hover:shadow-orange-500/15', delay: '100ms' },
                    { icon: Leaf, stat: '0 kg', label: 'CO₂ Saved', color: 'bg-teal-100 text-teal-600', glow: 'hover:shadow-teal-500/15', delay: '200ms' },
                ].map((item, idx) => (
                    <div
                        key={idx}
                        className="reveal opacity-0 translate-y-6"
                        style={{ transitionDelay: item.delay }}
                    >
                        <Card className={`text-center ${item.glow}`}>
                            <CardContent className="py-8">
                                <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl ${item.color} shadow-sm animate-float`}
                                    style={{ animationDelay: item.delay, animationDuration: `${3 + idx * 0.5}s` }}
                                >
                                    <item.icon className="h-7 w-7" />
                                </div>
                                <div className="text-3xl font-bold text-neutral-900">{item.stat}</div>
                                <div className="text-sm text-neutral-500 mt-1">{item.label}</div>
                            </CardContent>
                        </Card>
                    </div>
                ))}
            </section>

            {/* ── How It Works ─────────────────────────────── */}
            <section className="space-y-10">
                <h2 className="reveal text-center text-3xl font-bold text-neutral-900">
                    How It Works
                </h2>
                <div className="grid gap-8 md:grid-cols-3">
                    {[
                        { step: '1', title: 'List Your Food', desc: 'Add details about surplus food - type, quantity, prepared time, and pickup location.', icon: '📝', revealClass: 'reveal-left', delay: '0ms' },
                        { step: '2', title: 'Get Matched', desc: 'Our system connects your donation with nearby verified NGOs and volunteers.', icon: '🔗', revealClass: 'reveal', delay: '150ms' },
                        { step: '3', title: 'Complete Pickup', desc: 'Coordinate pickup, verify with code, and track your impact!', icon: '✅', revealClass: 'reveal-right', delay: '300ms' },
                    ].map((item, idx) => (
                        <div
                            key={idx}
                            className={`${item.revealClass}`}
                            style={{ transitionDelay: item.delay }}
                        >
                            <Card className="relative overflow-hidden group">
                                {/* Background step number */}
                                <div className="absolute -right-3 -top-3 text-8xl font-bold text-neutral-100 select-none transition-all duration-500 group-hover:text-emerald-50 group-hover:scale-110 group-hover:-rotate-6">
                                    {item.step}
                                </div>
                                <CardContent className="p-6">
                                    <div className="relative z-10 space-y-3">
                                        <div className="text-4xl animate-float inline-block"
                                            style={{ animationDelay: `${idx * 0.4}s`, animationDuration: '3.5s' }}
                                        >
                                            {item.icon}
                                        </div>
                                        <h3 className="text-lg font-semibold text-neutral-900 group-hover:text-emerald-700 transition-colors duration-200">
                                            {item.title}
                                        </h3>
                                        <p className="text-sm text-neutral-600">{item.desc}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── CTA Section ──────────────────────────────── */}
            <section className="relative rounded-2xl overflow-hidden p-12 text-center"
                style={{ background: 'linear-gradient(135deg, #ecfdf5 0%, #fff7ed 50%, #f0fdf4 100%)' }}
            >
                {/* Animated blobs inside CTA */}
                <div className="pointer-events-none absolute inset-0 overflow-hidden">
                    <div className="blob blob-emerald absolute top-0 left-1/4 h-40 w-40 opacity-30" />
                    <div className="blob blob-orange absolute bottom-0 right-1/4 h-32 w-32 opacity-25" />
                </div>

                <div className="relative z-10 reveal">
                    <div className="mb-3 text-4xl animate-float">🌍</div>
                    <h2 className="mb-4 text-2xl font-bold text-neutral-900">Ready to Make a Difference?</h2>
                    <p className="mb-8 text-neutral-600">Every meal counts. Start donating today.</p>
                    <Button size="lg" asChild className="group">
                        <Link to="/donor/add">
                            Start Donating
                            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                        </Link>
                    </Button>
                </div>
            </section>
        </div>
    )
}
