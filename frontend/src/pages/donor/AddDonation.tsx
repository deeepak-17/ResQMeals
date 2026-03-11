import { useState, useEffect, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, Clock, Upload, Loader2, CheckCircle, AlertTriangle, Sparkles } from 'lucide-react'
import { Button, Input, Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { donationApi } from '@/lib/api'
import { calculateExpiryTime } from '@/lib/utils'
import type { CreateDonationInput } from '@/types'

export default function AddDonation() {
    const navigate = useNavigate()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)

    // Form state - per TEAM_ASSIGNMENTS.md Member 3 tasks
    const [foodType, setFoodType] = useState('')
    const [quantity, setQuantity] = useState('')
    const [preparedTime, setPreparedTime] = useState('')
    const [latitude, setLatitude] = useState('')
    const [longitude, setLongitude] = useState('')
    const [imageUrl, setImageUrl] = useState('')

    // Computed expiry time (4 hours from prepared time per PRD.md safety window)
    const [expiryTime, setExpiryTime] = useState<string>('')

    useEffect(() => {
        if (preparedTime) {
            const expiry = calculateExpiryTime(preparedTime)
            setExpiryTime(expiry.toLocaleString())
        } else {
            setExpiryTime('')
        }
    }, [preparedTime])

    // Get current location using browser geolocation
    const getCurrentLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setLatitude(position.coords.latitude.toString())
                    setLongitude(position.coords.longitude.toString())
                },
                (err) => {
                    console.error('Geolocation error:', err)
                    setError('Could not get your location. Please enter manually.')
                }
            )
        } else {
            setError('Geolocation is not supported by your browser.')
        }
    }

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        setError(null)
        setIsSubmitting(true)

        try {
            if (!foodType || !quantity || !preparedTime || !latitude || !longitude) {
                throw new Error('Please fill in all required fields.')
            }

            const donationData: CreateDonationInput = {
                donorId: 'temp-user-id', // TODO: Replace with actual auth user ID from AuthContext
                foodType,
                quantity,
                preparedTime: new Date(preparedTime).toISOString(),
                location: {
                    type: 'Point',
                    coordinates: [parseFloat(longitude), parseFloat(latitude)],
                },
                imageUrl: imageUrl || undefined,
            }

            await donationApi.create(donationData)
            setSuccess(true)

            // Redirect to history after 2 seconds (per APP_FLOW.md: Confirmation → Redirect to "My Donations")
            setTimeout(() => navigate('/donor/history'), 2000)
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || 'Failed to create donation.')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="mx-auto max-w-2xl space-y-8">

            {/* Header */}
            <div className="text-center animate-fade-in-up" style={{ animationFillMode: 'forwards' }}>
                <div className="mb-3 inline-flex items-center justify-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-xs font-semibold text-emerald-700">
                    <Sparkles className="h-3.5 w-3.5 animate-float" />
                    Make a Difference Today
                </div>
                <h1 className="text-3xl font-bold text-neutral-900">
                    <span className="gradient-text">Donate Food</span>
                </h1>
                <p className="mt-2 text-neutral-600">
                    Share your surplus food and make a difference today.
                </p>
            </div>

            {/* Success Alert */}
            {success && (
                <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-700 shadow-sm shadow-emerald-500/10 animate-fade-in-up" style={{ animationFillMode: 'forwards' }}>
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100">
                        <CheckCircle className="h-5 w-5 text-emerald-600 animate-bounce-in" />
                    </div>
                    <span className="font-medium">Donation created successfully! Redirecting to your history...</span>
                </div>
            )}

            {/* Error Alert */}
            {error && (
                <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 shadow-sm animate-fade-in-up" style={{ animationFillMode: 'forwards' }}>
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-red-100">
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                    </div>
                    <span>{error}</span>
                </div>
            )}

            {/* Form Card */}
            <div className="animate-scale-in" style={{ animationFillMode: 'forwards', animationDelay: '100ms' }}>
                <Card className="overflow-hidden">
                    {/* Card accent top bar */}
                    <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #059669, #f97316)' }} />
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            🍽️ Food Details
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Food Type */}
                            <Input
                                label="Food Type *"
                                value={foodType}
                                onChange={(e) => setFoodType(e.target.value)}
                                placeholder="e.g., Cooked Rice, Sandwiches, Biryani"
                                required
                            />

                            {/* Quantity */}
                            <Input
                                label="Quantity *"
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                                placeholder="e.g., 5 servings, 2 kg, 10 plates"
                                required
                            />

                            {/* Prepared Time */}
                            <div className="space-y-1.5">
                                <Input
                                    label="Prepared Time *"
                                    type="datetime-local"
                                    value={preparedTime}
                                    onChange={(e) => setPreparedTime(e.target.value)}
                                    required
                                />
                                {expiryTime && (
                                    <p className="flex items-center gap-2 text-sm text-orange-600 animate-fade-in-up" style={{ animationFillMode: 'forwards' }}>
                                        <Clock className="h-4 w-4 animate-float" />
                                        Expires at: <span className="font-medium">{expiryTime}</span>
                                        <span className="text-neutral-500">(4-hour safety window)</span>
                                    </p>
                                )}
                            </div>

                            {/* Location */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-medium text-neutral-700">
                                        Pickup Location *
                                    </label>
                                    <button
                                        type="button"
                                        onClick={getCurrentLocation}
                                        className="group flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-emerald-600 transition-all duration-200 hover:bg-emerald-50 hover:text-emerald-700 hover:shadow-sm"
                                    >
                                        <MapPin className="h-4 w-4 transition-transform duration-200 group-hover:scale-110" />
                                        Use Current Location
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <Input
                                        type="number"
                                        step="any"
                                        value={latitude}
                                        onChange={(e) => setLatitude(e.target.value)}
                                        placeholder="Latitude"
                                        required
                                    />
                                    <Input
                                        type="number"
                                        step="any"
                                        value={longitude}
                                        onChange={(e) => setLongitude(e.target.value)}
                                        placeholder="Longitude"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Image URL (optional) - per TEAM_ASSIGNMENTS.md: "Image Upload" */}
                            <div className="space-y-1.5">
                                <Input
                                    label="Image URL"
                                    type="url"
                                    value={imageUrl}
                                    onChange={(e) => setImageUrl(e.target.value)}
                                    placeholder="https://example.com/food-image.jpg"
                                />
                                <p className="text-xs text-neutral-500">
                                    <Upload className="mr-1 inline h-3 w-3" />
                                    Optional: Add a photo of the food
                                </p>
                            </div>

                            {/* Preview */}
                            {(foodType || quantity) && (
                                <div className="rounded-xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-orange-50 p-4 animate-fade-in-up" style={{ animationFillMode: 'forwards' }}>
                                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">Preview</p>
                                    <div className="flex items-center gap-4">
                                        <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-white text-3xl shadow-sm border border-neutral-100 animate-float">
                                            🍲
                                        </div>
                                        <div>
                                            <p className="font-semibold text-neutral-900">{foodType || 'Food Type'}</p>
                                            <p className="text-sm text-neutral-500">{quantity || 'Quantity'}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Submit */}
                            <Button
                                type="submit"
                                disabled={isSubmitting || success}
                                className="w-full"
                                size="lg"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Creating Donation...
                                    </>
                                ) : success ? (
                                    <>
                                        <CheckCircle className="h-4 w-4 animate-bounce-in" />
                                        Donation Created!
                                    </>
                                ) : (
                                    'Submit Donation'
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>

            <p className="text-center text-sm text-neutral-500 animate-fade-in" style={{ animationFillMode: 'forwards', animationDelay: '300ms' }}>
                💡 Food is marked as expired 4 hours after preparation for safety.
            </p>
        </div>
    )
}
