import { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";

interface Donation {
    _id: string;
    foodType: string;
    quantity: string;
    preparedTime: string;
    expiryTime: string;
    location: string;
    status: string;
    createdAt: string;
}

const History = () => {
    const { token } = useAuth();
    const [donations, setDonations] = useState<Donation[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchDonations = async () => {
            try {
                const res = await axios.get("http://localhost:5000/api/donations/my", {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setDonations(res.data);
            } catch (err: any) {
                setError(err.response?.data?.message || "Failed to fetch history");
            } finally {
                setLoading(false);
            }
        };

        if (token) fetchDonations();
    }, [token]);

    const handleDelete = async (id: string) => {
        if (!window.confirm("Are you sure you want to delete this donation?")) return;
        try {
            await axios.delete(`http://localhost:5000/api/donations/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setDonations(donations.filter(d => d._id !== id));
        } catch (err: any) {
            alert(err.response?.data?.message || "Failed to delete");
        }
    };

    if (loading) return <div className="p-6">Loading...</div>;
    if (error) return <div className="p-6 text-red-500">{error}</div>;

    return (
        <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">My Donations</h2>
            {donations.length === 0 ? (
                <p>No donations found.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full bg-white border">
                        <thead>
                            <tr className="bg-gray-100 text-left">
                                <th className="p-3 border">Food Type</th>
                                <th className="p-3 border">Quantity</th>
                                <th className="p-3 border">Status</th>
                                <th className="p-3 border">Expiry</th>
                                <th className="p-3 border">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {donations.map(donation => (
                                <tr key={donation._id} className="border-t hover:bg-gray-50">
                                    <td className="p-3 border">{donation.foodType}</td>
                                    <td className="p-3 border">{donation.quantity}</td>
                                    <td className="p-3 border">
                                        <span className={`px-2 py-1 rounded text-sm ${donation.status === 'available' ? 'bg-green-100 text-green-800' :
                                                donation.status === 'claimed' ? 'bg-blue-100 text-blue-800' :
                                                    'bg-gray-100'
                                            }`}>
                                            {donation.status}
                                        </span>
                                    </td>
                                    <td className="p-3 border">
                                        {new Date(donation.expiryTime).toLocaleString()}
                                    </td>
                                    <td className="p-3 border">
                                        <button
                                            onClick={() => handleDelete(donation._id)}
                                            className="text-red-500 hover:underline"
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default History;
