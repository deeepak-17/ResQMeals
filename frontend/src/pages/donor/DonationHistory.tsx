import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Plus, RefreshCw, Loader2, PackageOpen } from 'lucide-react'
import { Button, Card, CardContent, Badge } from '@/components/ui'
import { FoodCard } from '@/components/food'
import { donationApi } from '@/lib/api'
import type { FoodDonation } from '@/types'

export default function DonationHistory() {
    const [donations, setDonations] = useState<FoodDonation[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [deletingId, setDeletingId] = useState<string | null>(null)

    const fetchDonations = async () => {
        try {
            setIsLoading(true)
            setError(null)
            // TODO: Replace with actual auth user ID from AuthContext
            const data = await donationApi.getMyDonations('temp-user-id')
            setDonations(data)
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to load donations.')
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchDonations()
    }, [])

    // Delete handler - per TEAM_ASSIGNMENTS.md: "Add edit/delete buttons to history cards"
    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this donation?')) return

        try {
            setDeletingId(id)
            await donationApi.delete(id)
            setDonations(donations.filter((d) => d._id !== id))
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to delete donation.')
        } finally {
            setDeletingId(null)
        }
    }

    // Edit handler - navigates or opens modal (simplified for now)
    const handleEdit = (donation: FoodDonation) => {
        // TODO: Implement edit modal or navigate to edit page
        alert(`Edit donation: ${donation._id}`)
    }

    // Stats calculation
    const stats = {
        total: donations.length,
        available: donations.filter((d) => d.status === 'available').length,
        reserved: donations.filter((d) => d.status === 'reserved').length,
        collected: donations.filter((d) => d.status === 'collected').length,
    }

    const statConfig = [
        { label: 'Total', value: stats.total, variant: 'default' as const, emoji: '📦', color: 'text-neutral-900' },
        { label: 'Available', value: stats.available, variant: 'available' as const, emoji: '✅', color: 'text-emerald-700' },
        { label: 'Reserved', value: stats.reserved, variant: 'reserved' as const, emoji: '🔒', color: 'text-orange-700' },
        { label: 'Collected', value: stats.collected, variant: 'collected' as const, emoji: '🎉', color: 'text-teal-700' },
    ]

    return (
        <div className="space-y-8">

            {/* Header */}
            <div
                className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between animate-fade-in-up opacity-0"
                style={{ animationFillMode: 'forwards' }}
            >
                <div>
                    <h1 className="text-3xl font-bold text-neutral-900">
                        <span className="gradient-text">My Donations</span>
                    </h1>
                    <p className="mt-1 text-neutral-600">Track and manage your food donations</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="ghost" onClick={fetchDonations} disabled={isLoading} className="group">
                        <RefreshCw className={`h-4 w-4 transition-transform duration-500 ${isLoading ? 'animate-spin' : 'group-hover:rotate-180'}`} />
                        Refresh
                    </Button>
                    <Button asChild>
                        <Link to="/donor/add">
                            <Plus className="h-4 w-4" />
                            New Donation
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {statConfig.map((stat, idx) => (
                    <div
                        key={stat.label}
                        className="animate-scale-in opacity-0"
                        style={{ animationFillMode: 'forwards', animationDelay: `${idx * 80}ms` }}
                    >
                        <Card>
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                                        <p className="text-sm text-neutral-500">{stat.label}</p>
                                    </div>
                                    <div className="flex flex-col items-center gap-1">
                                        <span className="text-xl animate-float" style={{ animationDelay: `${idx * 0.3}s` }}>
                                            {stat.emoji}
                                        </span>
                                        <Badge variant={stat.variant}>{stat.label}</Badge>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                ))}
            </div>

            {/* Loading State — shimmer skeleton */}
            {isLoading && (
                <div className="space-y-4">
                    <div className="flex flex-col items-center justify-center py-12 gap-3 text-neutral-500">
                        <Loader2 className="h-10 w-10 animate-spin text-emerald-600" />
                        <p className="text-sm animate-pulse">Loading your donations...</p>
                    </div>
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="rounded-2xl border border-neutral-100 bg-white overflow-hidden">
                                <div className="h-2 w-full bg-gradient-to-r from-neutral-100 via-neutral-200 to-neutral-100 bg-[length:200%_100%] animate-shimmer" />
                                <div className="p-5 space-y-3">
                                    <div className="h-5 w-3/4 rounded-lg bg-gradient-to-r from-neutral-100 via-neutral-200 to-neutral-100 bg-[length:200%_100%] animate-shimmer" style={{ animationDelay: `${i * 100}ms` }} />
                                    <div className="h-4 w-1/2 rounded-lg bg-gradient-to-r from-neutral-100 via-neutral-200 to-neutral-100 bg-[length:200%_100%] animate-shimmer" style={{ animationDelay: `${i * 150}ms` }} />
                                    <div className="h-4 w-2/3 rounded-lg bg-gradient-to-r from-neutral-100 via-neutral-200 to-neutral-100 bg-[length:200%_100%] animate-shimmer" style={{ animationDelay: `${i * 200}ms` }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Error State */}
            {error && !isLoading && (
                <Card className="border-red-200 bg-red-50 animate-scale-in" style={{ animationFillMode: 'forwards' } as React.CSSProperties}>
                    <CardContent className="py-8 text-center">
                        <p className="mb-4 text-red-600">{error}</p>
                        <Button variant="outline" onClick={fetchDonations}>
                            Try Again
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Empty State */}
            {!isLoading && !error && donations.length === 0 && (
                <Card className="animate-scale-in" style={{ animationFillMode: 'forwards' } as React.CSSProperties}>
                    <CardContent className="py-16 text-center">
                        <PackageOpen className="mx-auto mb-4 h-14 w-14 text-neutral-300 animate-float" />
                        <h2 className="mb-2 text-xl font-semibold text-neutral-900">No Donations Yet</h2>
                        <p className="mb-6 text-neutral-500">
                            Start sharing surplus food and make a difference!
                        </p>
                        <Button asChild>
                            <Link to="/donor/add">Create Your First Donation</Link>
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Donations Grid - per TEAM_ASSIGNMENTS.md: "showing all donations with status" */}
            {!isLoading && !error && donations.length > 0 && (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {donations.map((donation, idx) => (
                        <div
                            key={donation._id}
                            className="animate-fade-in-up opacity-0"
                            style={{ animationFillMode: 'forwards', animationDelay: `${idx * 60}ms` }}
                        >
                            <FoodCard
                                donation={donation}
                                onEdit={handleEdit}
                                onDelete={handleDelete}
                                isDeleting={deletingId === donation._id}
                            />
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
