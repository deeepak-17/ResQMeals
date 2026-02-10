import { Link, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Layout = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <nav className="bg-white shadow p-4 flex justify-between items-center">
                <Link to="/" className="text-xl font-bold text-green-600">ResQMeals</Link>
                <div className="space-x-4">
                    {user ? (
                        <>
                            <span className="text-gray-600">Welcome, {user.role}</span>
                            {user.role === 'donor' && (
                                <>
                                    <Link to="/donor/add" className="text-blue-600 hover:underline">Donate</Link>
                                    <Link to="/donor/history" className="text-blue-600 hover:underline">History</Link>
                                </>
                            )}
                            <button onClick={handleLogout} className="text-red-500 hover:underline">Logout</button>
                        </>
                    ) : (
                        <>
                            <Link to="/login" className="text-blue-600">Login</Link>
                            <Link to="/register" className="text-blue-600">Register</Link>
                        </>
                    )}
                </div>
            </nav>
            <main className="p-4">
                <Outlet />
            </main>
        </div>
    );
};

export default Layout;
