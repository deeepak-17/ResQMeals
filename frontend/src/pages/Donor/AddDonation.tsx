import { useState } from "react";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";

const AddDonation = () => {
    const { token } = useAuth();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        foodType: "",
        quantity: "",
        preparedTime: "",
        location: "",
        imageUrl: ""
    });
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await axios.post("http://localhost:5000/api/donations", formData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSuccess("Donation added successfully!");
            setTimeout(() => navigate('/donor/history'), 2000);
        } catch (err: any) {
            setError(err.response?.data?.message || "Failed to add donation");
        }
    };

    return (
        <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">Add Food Donation</h2>
            {error && <p className="text-red-500">{error}</p>}
            {success && <p className="text-green-500">{success}</p>}

            <form onSubmit={handleSubmit} className="max-w-md space-y-4">
                <input
                    type="text"
                    placeholder="Food Type (e.g., Rice, Bread)"
                    className="w-full p-2 border"
                    onChange={e => setFormData({ ...formData, foodType: e.target.value })}
                    required
                />
                <input
                    type="text"
                    placeholder="Quantity (e.g., 5kg, 10 packets)"
                    className="w-full p-2 border"
                    onChange={e => setFormData({ ...formData, quantity: e.target.value })}
                    required
                />
                <div className="flex flex-col">
                    <label className="text-sm text-gray-600">Prepared Time</label>
                    <input
                        type="datetime-local"
                        className="w-full p-2 border"
                        onChange={e => setFormData({ ...formData, preparedTime: new Date(e.target.value).toISOString() })}
                        required
                    />
                </div>
                <input
                    type="text"
                    placeholder="Location"
                    className="w-full p-2 border"
                    onChange={e => setFormData({ ...formData, location: e.target.value })}
                    required
                />
                <input
                    type="text"
                    placeholder="Image URL (Optional)"
                    className="w-full p-2 border"
                    onChange={e => setFormData({ ...formData, imageUrl: e.target.value })}
                />

                <button type="submit" className="bg-green-500 text-white px-4 py-2 rounded">
                    Submit Donation
                </button>
            </form>
        </div>
    );
};

export default AddDonation;
