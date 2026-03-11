// TypeScript interfaces for the application
// Per FRONTEND_GUIDELINES.md - keep all types in src/types/

export interface User {
    _id: string
    name: string
    email: string
    role: 'donor' | 'ngo' | 'volunteer' | 'admin'
    organizationType?: 'restaurant' | 'canteen' | 'event' | 'shelter'
    verificationStatus: 'pending' | 'verified' | 'rejected'
    sustainabilityCredits: number
    languagePref: string
    createdAt: string
}

export interface FoodDonation {
    _id: string
    donorId: string
    foodType: string
    quantity: string
    preparedTime: string
    expiryTime: string
    location: {
        type: 'Point'
        coordinates: [number, number] // [longitude, latitude]
    }
    status: 'available' | 'reserved' | 'collected' | 'expired'
    imageUrl?: string
    createdAt: string
    updatedAt?: string
}

export interface CreateDonationInput {
    donorId: string
    foodType: string
    quantity: string
    preparedTime: string
    location: {
        type: 'Point'
        coordinates: [number, number]
    }
    imageUrl?: string
}

export interface UpdateDonationInput {
    foodType?: string
    quantity?: string
    preparedTime?: string
    location?: {
        type: 'Point'
        coordinates: [number, number]
    }
    status?: FoodDonation['status']
    imageUrl?: string
}

export interface AuthContextType {
    user: User | null
    token: string | null
    isLoading: boolean
    login: (email: string, password: string) => Promise<void>
    register: (data: RegisterInput) => Promise<void>
    logout: () => void
}

export interface RegisterInput {
    name: string
    email: string
    password: string
    role: User['role']
}
