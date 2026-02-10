import mongoose from 'mongoose';
import User from '../models/User';
import FoodDonation from '../models/FoodDonation';
import PickupTask, { TaskStatus } from '../models/PickupTask';

export const seedDatabase = async () => {
    try {
        const userCount = await User.countDocuments();
        if (userCount > 0) {
            console.log('Database already seeded.');
            return;
        }

        console.log('Seeding database...');

        // 1. Create Volunteer
        // HARDCODED ID to match authMiddleware mock
        const volunteer = await User.create({
            _id: '507f1f77bcf86cd799439011',
            name: 'John Volunteer',
            email: 'volunteer@resqmeals.com',
            role: 'volunteer',
        });

        // 2. Create Donor
        const donor = await User.create({
            name: 'Jane Donor',
            email: 'donor@resqmeals.com',
            role: 'donor',
        });

        // 3. Create Donations
        const donation1 = await FoodDonation.create({
            donorId: donor._id as any,
            foodType: 'Sandwiches',
            quantity: '20 packs',
            preparedTime: new Date(),
            location: {
                type: 'Point',
                coordinates: [12.34, 56.78]
            },
            expiryTime: new Date(Date.now() + 86400000), // +1 day
            status: 'available',
        });

        const donation2 = await FoodDonation.create({
            donorId: donor._id as any,
            foodType: 'Pasta Trays',
            quantity: '5 large trays',
            preparedTime: new Date(),
            location: {
                type: 'Point',
                coordinates: [12.35, 56.79]
            },
            expiryTime: new Date(Date.now() + 172800000), // +2 days
            status: 'available',
        });

        // 4. Create Tasks
        // Task 1: Assigned
        await PickupTask.create({
            donationId: donation1._id,
            volunteerId: volunteer._id,
            status: TaskStatus.ASSIGNED,
            assignedAt: new Date(),
        });

        // Task 2: Accepted (to test different states)
        await PickupTask.create({
            donationId: donation2._id,
            volunteerId: volunteer._id,
            status: TaskStatus.ACCEPTED,
            assignedAt: new Date(Date.now() - 3600000), // 1 hour ago
        });

        console.log('Database seeded successfully!');
    } catch (error) {
        console.error('Error seeding database:', error);
    }
};
