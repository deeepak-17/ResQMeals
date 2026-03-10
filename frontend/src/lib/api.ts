import axios from 'axios'
import type { FoodDonation, CreateDonationInput, UpdateDonationInput } from '@/types'

// Axios instance with base configuration
const api = axios.create({
    baseURL: '/api',
    headers: {
        'Content-Type': 'application/json',
    },
})

// Add auth token to requests if available
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token')
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
})

// Donation API endpoints - per TEAM_ASSIGNMENTS.md Member 3 tasks
export const donationApi = {
    // POST /donations - Create donation
    create: async (data: CreateDonationInput): Promise<FoodDonation> => {
        const response = await api.post<FoodDonation>('/donations', data)
        return response.data
    },

    // GET /donations/my - Get donor's history
    getMyDonations: async (donorId: string): Promise<FoodDonation[]> => {
        const response = await api.get<FoodDonation[]>(`/donations/my?donorId=${donorId}`)
        return response.data
    },

    // PUT /donations/:id - Edit donation
    update: async (id: string, data: UpdateDonationInput): Promise<FoodDonation> => {
        const response = await api.put<FoodDonation>(`/donations/${id}`, data)
        return response.data
    },

    // DELETE /donations/:id - Cancel donation
    delete: async (id: string): Promise<{ message: string }> => {
        const response = await api.delete<{ message: string }>(`/donations/${id}`)
        return response.data
    },
}

export default api
