"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const API_URL = "http://localhost:5000/api/auth";
const testAuth = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log("1. Testing Registration...");
        const registerRes = yield axios_1.default.post(`${API_URL}/register`, {
            name: "Test User",
            email: `test${Date.now()}@example.com`,
            password: "password123",
            role: "donor"
        });
        console.log("✅ Registration Successful. Token received:", !!registerRes.data.token);
        const token = registerRes.data.token;
        console.log("\n2. Testing Login...");
        const loginRes = yield axios_1.default.post(`${API_URL}/login`, {
            email: registerRes.config.data ? JSON.parse(registerRes.config.data).email : "",
            password: "password123"
        });
        console.log("✅ Login Successful. Token received:", !!loginRes.data.token);
        console.log("\n3. Testing Protected Route (/me)...");
        const meRes = yield axios_1.default.get(`${API_URL}/me`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        console.log("✅ Protected Route Access Successful. User:", meRes.data.name);
    }
    catch (error) {
        console.error("❌ Test Failed:", error.response ? error.response.data : error.message);
    }
});
testAuth();
