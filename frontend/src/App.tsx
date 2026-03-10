import { Routes, Route, Navigate } from 'react-router-dom'
import { RootLayout } from '@/components/Layout'
import Home from '@/pages/Home'
import AddDonation from '@/pages/donor/AddDonation'
import DonationHistory from '@/pages/donor/DonationHistory'

function App() {
    return (
        <Routes>
            <Route path="/" element={<RootLayout />}>
                {/* Landing page per APP_FLOW.md */}
                <Route index element={<Home />} />

                {/* Donor routes - per TEAM_ASSIGNMENTS.md Member 3 tasks */}
                <Route path="donor">
                    <Route path="add" element={<AddDonation />} />
                    <Route path="history" element={<DonationHistory />} />
                </Route>

                {/* Auth routes placeholder - Member 2 will implement */}
                <Route path="login" element={<div className="py-20 text-center text-neutral-500">Login page - Coming soon (Member 2)</div>} />
                <Route path="register" element={<div className="py-20 text-center text-neutral-500">Register page - Coming soon (Member 2)</div>} />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
        </Routes>
    )
}

export default App
