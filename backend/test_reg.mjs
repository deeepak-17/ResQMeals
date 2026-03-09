import fetch from 'node-fetch';

async function registerVolunteer() {
    console.log("Registering volunteer...");
    try {
        const response = await fetch('http://localhost:5001/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: "Test Volunteer",
                email: "test.volunteer@example.com",
                password: "Password123!",
                role: "volunteer"
            })
        });
        const text = await response.text();
        console.log(`Status: ${response.status}`);
        console.log(`Response: ${text}`);
    } catch (e) {
        console.error("Fetch error:", e);
    }
}

registerVolunteer();
