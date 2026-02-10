import request from 'supertest';
import express from 'express';

// Create a minimal test app that mimics the server structure
const app = express();
app.get('/', (req, res) => {
    res.send('ResQMeals API running');
});

describe('Health Check', () => {
    it('should return 200 and success message for root endpoint', async () => {
        const response = await request(app).get('/');

        expect(response.status).toBe(200);
        expect(response.text).toBe('ResQMeals API running');
    });
});
