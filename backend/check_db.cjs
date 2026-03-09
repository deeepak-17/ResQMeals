
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: 'c:/Users/chand/Downloads/ResQMeals/backend/.env' });
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://deepakbond008_db_user:rescuemeals@cluster0.9wpozu7.mongodb.net/?appName=Cluster0";

const FoodDonationSchema = new mongoose.Schema({
    status: String,
    title: String,
    donorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    quantity: String,
    expiryTime: Date
}, { strict: false });

const UserSchema = new mongoose.Schema({
    name: String
}, { strict: false });

const FoodDonation = mongoose.model('FoodDonation', FoodDonationSchema);
const User = mongoose.model('User', UserSchema);

async function checkDonations() {
    try {
        await mongoose.connect(MONGO_URI);
        const available = await FoodDonation.find({ status: 'available' }).populate('donorId', 'name');
        console.log(JSON.stringify(available, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
checkDonations();
