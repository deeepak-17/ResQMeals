
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://deepakbond008_db_user:rescuemeals@cluster0.9wpozu7.mongodb.net/?appName=Cluster0";

async function clearData() {
    try {
        await mongoose.connect(MONGO_URI);
        const User = mongoose.model('User', new mongoose.Schema({ email: String }));
        const donor = await User.findOne({ email: 'donor-abcd123@gmail.com' });

        if (donor) {
            await mongoose.connection.db.collection('fooddonations').deleteMany({ donorId: donor._id });
            console.log('Cleared donations for ' + donor.email);
        }
        process.exit(0);
    } catch (err) {
        process.exit(1);
    }
}
clearData();
