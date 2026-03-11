import { MapPin, Clock, Timer, Edit2, Trash2 } from 'lucide-react'
import { Card, CardContent, Badge, Button } from '@/components/ui'
import type { FoodDonation } from '@/types'
import { formatDate, getTimeRemaining } from '@/lib/utils'

interface FoodCardProps {
    donation: FoodDonation
    onEdit?: (donation: FoodDonation) => void
    onDelete?: (id: string) => void
    isDeleting?: boolean
}

export function FoodCard({ donation, onEdit, onDelete, isDeleting }: FoodCardProps) {
    const timeRemaining = getTimeRemaining(donation.expiryTime)

    return (
        <Card className="overflow-hidden transition-all hover:-translate-y-1 hover:shadow-lg">
            {/* Image / Placeholder */}
            <div className="relative h-40 bg-gradient-to-br from-emerald-100 to-orange-50">
                {donation.imageUrl ? (
                    <img
                        src={donation.imageUrl}
                        alt={donation.foodType}
                        className="h-full w-full object-cover"
                    />
                ) : (
                    <div className="flex h-full items-center justify-center text-5xl">🍲</div>
                )}
                <div className="absolute right-3 top-3">
                    <Badge variant={donation.status}>{donation.status}</Badge>
                </div>
            </div>

            <CardContent className="space-y-4 p-5">
                {/* Title & Quantity */}
                <div>
                    <h3 className="text-lg font-semibold text-neutral-900">{donation.foodType}</h3>
                    <p className="text-sm text-neutral-500">{donation.quantity}</p>
                </div>

                {/* Meta Info */}
                <div className="space-y-2 text-sm text-neutral-600">
                    <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-neutral-400" />
                        <span>Prepared: {formatDate(donation.preparedTime)}</span>
                    </div>
                    <div className={`flex items-center gap-2 ${timeRemaining.isUrgent ? 'text-orange-600' : ''}`}>
                        <Timer className="h-4 w-4" />
                        <span>{timeRemaining.text}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-neutral-400" />
                        <span>
                            {donation.location.coordinates[1].toFixed(4)}, {donation.location.coordinates[0].toFixed(4)}
                        </span>
                    </div>
                </div>

                {/* Actions - per TEAM_ASSIGNMENTS.md: "Add edit/delete buttons to history cards" */}
                {(onEdit || onDelete) && (
                    <div className="flex gap-2 border-t border-neutral-100 pt-4">
                        {onEdit && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="flex-1"
                                onClick={() => onEdit(donation)}
                            >
                                <Edit2 className="h-4 w-4" />
                                Edit
                            </Button>
                        )}
                        {onDelete && (
                            <Button
                                variant="destructive"
                                size="sm"
                                className="flex-1"
                                onClick={() => onDelete(donation._id)}
                                disabled={isDeleting}
                            >
                                <Trash2 className="h-4 w-4" />
                                {isDeleting ? 'Deleting...' : 'Delete'}
                            </Button>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
