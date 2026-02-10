import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

const Register = () => {
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        role: "donor",
        organizationType: "" // Optional/Conditional
    });
    const { login } = useAuth();
    const navigate = useNavigate();
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await axios.post("http://localhost:5000/api/auth/register", formData);
            login(res.data.token, formData.role);
            navigate('/');
        } catch (err: any) {
            setError(err.response?.data?.message || "Registration failed");
        }
    };

    return (
        <div className="flex justify-center items-center h-screen bg-gray-100">
            <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow-md w-96">
                <h2 className="text-2xl font-bold mb-4">Register</h2>
                {error && <p className="text-red-500 mb-2">{error}</p>}
                <input
                    type="text"
                    placeholder="Name"
                    className="w-full p-2 border mb-2"
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
                <input
                    type="email"
                    placeholder="Email"
                    className="w-full p-2 border mb-2"
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
                <input
                    type="password"
                    placeholder="Password"
                    className="w-full p-2 border mb-2"
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
                <select
                    className="w-full p-2 border mb-2"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                >
                    <option value="donor">Donor</option>
                    <option value="ngo">NGO</option>
                    <option value="volunteer">Volunteer</option>
                </select>

                {formData.role === 'ngo' && (
                    <select
                        className="w-full p-2 border mb-4"
                        onChange={(e) => setFormData({ ...formData, organizationType: e.target.value })}
                    >
                        <option value="">Select Org Type</option>
                        <option value="shelter">Shelter</option>
                        <option value="restaurant">Restaurant</option>
                        <option value="canteen">Canteen</option>
                    </select>
                )}

                <button type="submit" className="w-full bg-blue-500 text-white p-2 rounded">Register</button>
                <p className="mt-2 text-sm">
                    Already have an account? <Link to="/login" className="text-blue-500">Login</Link>
                </p>
            </form>
        </div>
    );
};

export default Register;
