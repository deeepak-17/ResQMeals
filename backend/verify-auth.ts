import axios from "axios";

const API_URL = "http://localhost:5000/api/auth";

const testAuth = async () => {
    const testEmail = `test${Date.now()}@example.com`;

    try {
        // 1. Register User
        console.log("1. Testing Registration...");
        const registerRes = await axios.post(`${API_URL}/register`, {
            name: "Test User",
            email: testEmail,
            password: "Password123!",
            role: "donor",
            organizationType: "individual"
        });
        console.log("✅ Registration Successful:", registerRes.data);

        const token = registerRes.data.token;

        // 2. Login User
        console.log("\n2. Testing Login...");
        const loginRes = await axios.post(`${API_URL}/login`, {
            email: testEmail,
            password: "Password123!"
        });
        console.log("✅ Login Successful. Token received:", !!loginRes.data.token);

        const loginToken = loginRes.data.token;

        console.log("\n3. Testing Protected Route (/me)...");
        const meRes = await axios.get(`${API_URL}/me`, {
            headers: {
                Authorization: `Bearer ${loginToken}`
            }
        });
        console.log("✅ Protected Route Access Successful. User:", meRes.data.name);

    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error("❌ Test Failed:", error.response?.data ?? error.message);
        } else {
            console.error("❌ Test Failed:", error);
        }
        process.exit(1);
    }
};

testAuth();
