
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

const FoodDonation = mongoose.model('FoodDonation', FoodDonationSchema);

async function checkDonations() {
    try {
        await mongoose.connect(MONGO_URI);
        const donations = await FoodDonation.find({});
        console.log("TOTAL DONATIONS IN DB:", donations.length);
        donations.forEach(d => {
            console.log(`- ID: ${d._id}, Title: ${d.title}, Status: ${d.status}, Expiry: ${d.expiryTime}`);
        });
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
checkDonations();
