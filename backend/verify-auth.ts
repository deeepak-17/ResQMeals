import axios from "axios";

const API_URL = "http://localhost:5000/api/auth";

const testAuth = async () => {
    try {
        console.log("1. Testing Registration...");
        const registerRes = await axios.post(`${API_URL}/register`, {
            name: "Test User",
            email: `test${Date.now()}@example.com`,
            password: "password123",
            role: "donor"
        });
        console.log("✅ Registration Successful. Token received:", !!registerRes.data.token);

        const token = registerRes.data.token;

        console.log("\n2. Testing Login...");
        const loginRes = await axios.post(`${API_URL}/login`, {
            email: registerRes.config.data ? JSON.parse(registerRes.config.data).email : "",
            password: "password123"
        });
        console.log("✅ Login Successful. Token received:", !!loginRes.data.token);

        console.log("\n3. Testing Protected Route (/me)...");
        const meRes = await axios.get(`${API_URL}/me`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        console.log("✅ Protected Route Access Successful. User:", meRes.data.name);

    } catch (error: any) {
        console.error("❌ Test Failed:", error.response ? error.response.data : error.message);
    }
};

testAuth();
