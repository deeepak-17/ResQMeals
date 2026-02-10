import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import AddDonation from './pages/Donor/AddDonation';
import History from './pages/Donor/History';
import Layout from './components/Layout';

// Protected Route Component
const PrivateRoute = ({ children, role }: { children: React.ReactNode, role?: string }) => {
  const { token, user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!token) return <Navigate to="/login" />;
  if (role && user?.role !== role) return <Navigate to="/" />;

  return <>{children}</>;
};

function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Donor Routes */}
        <Route path="/donor/add" element={
          <PrivateRoute role="donor">
            <AddDonation />
          </PrivateRoute>
        } />
        <Route path="/donor/history" element={
          <PrivateRoute role="donor">
            <History />
          </PrivateRoute>
        } />

        <Route path="/" element={<div className="p-4"><h1>Welcome to ResQMeals</h1></div>} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  )
}

export default App
