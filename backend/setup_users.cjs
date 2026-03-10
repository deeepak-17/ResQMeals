
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const bcrypt = require('bcryptjs');

dotenv.config({ path: path.join(__dirname, '.env') });
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://deepakbond008_db_user:rescuemeals@cluster0.9wpozu7.mongodb.net/?appName=Cluster0";

const UserSchema = new mongoose.Schema({
    name: String,
    email: String,
    password: { type: String, select: true },
    role: String,
    verified: { type: Boolean, default: false },
    isAvailable: { type: Boolean, default: true },
    sustainabilityCredits: { type: Number, default: 0 },
    location: {
        type: { type: String, default: 'Point' },
        coordinates: { type: [Number], default: [77.2090, 28.6139] }
    }
});

const User = mongoose.models.User || mongoose.model('User', UserSchema);

async function setupUsers() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        const users = [
            { name: 'Donor User', email: 'donor-abcd123@gmail.com', password: 'abcd123@The', role: 'donor' },
            { name: 'NGO User', email: 'ngo-ijkl123@gmail.com', password: 'pass-ijkl123@The', role: 'ngo' },
            { name: 'Volunteer User', email: 'volunteer-efgh123@gmali.com', password: 'pass-efgh123@The', role: 'volunteer' }
        ];

        for (const u of users) {
            let user = await User.findOne({ email: u.email });
            const hashedPassword = await bcrypt.hash(u.password, 10);
            if (user) {
                user.password = hashedPassword;
                user.role = u.role;
                user.verified = true;
                await user.save();
                console.log(`Updated user: ${u.email}`);
            } else {
                await User.create({
                    ...u,
                    password: hashedPassword,
                    verified: true,
                    location: { type: 'Point', coordinates: [77.2090, 28.6139] }
                });
                console.log(`Created user: ${u.email}`);
            }
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
setupUsers();
