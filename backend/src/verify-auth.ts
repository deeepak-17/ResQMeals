import axios from "axios";

const API_URL = "http://localhost:5000/api/auth";

const testAuth = async () => {
    try {
        // Capture test credentials upfront
        const email = `test${Date.now()}@example.com`;
        const password = "Password@123";

        console.log("1. Testing Registration...");
        const registerRes = await axios.post(`${API_URL}/register`, {
            name: "Test User",
            email,
            password,
            role: "donor"
        });
        console.log("✅ Registration Successful. Token received:", !!registerRes.data.token);

        console.log("\n2. Testing Login...");
        const loginRes = await axios.post(`${API_URL}/login`, {
            email,
            password
        });
        console.log("✅ Login Successful. Token received:", !!loginRes.data.token);

        // Use login token (not registration token) for authenticated requests
        const token = loginRes.data.token;

        if (!token) {
            throw new Error("Login succeeded but no token returned");
        }

        console.log("\n3. Testing Protected Route (/me)...");
        const meRes = await axios.get(`${API_URL}/me`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        console.log("✅ Protected Route Access Successful. User:", meRes.data.name);

    } catch (error: unknown) {
        if (axios.isAxiosError(error) && error.response) {
            console.error("❌ Test Failed (API Error):", {
                status: error.response.status,
                data: error.response.data
            });
        } else if (error instanceof Error) {
            console.error("❌ Test Failed:", error.message);
        } else {
            console.error("❌ Test Failed (Unknown Error):", error);
        }
    }
};

testAuth();
