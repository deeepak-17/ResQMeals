import mongoose from 'mongoose';
import User, { UserRole } from '../models/User';
import FoodDonation, { DonationStatus } from '../models/FoodDonation';
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
            role: UserRole.VOLUNTEER,
        });

        // 2. Create Donor
        const donor = await User.create({
            name: 'Jane Donor',
            email: 'donor@resqmeals.com',
            role: UserRole.DONOR,
        });

        // 3. Create Donations
        const donation1 = await FoodDonation.create({
            donorId: donor._id,
            foodType: 'Sandwiches',
            quantity: '20 packs',
            location: '123 Main St, Cityville',
            expiryDate: new Date(Date.now() + 86400000), // +1 day
            status: DonationStatus.AVAILABLE,
        });

        const donation2 = await FoodDonation.create({
            donorId: donor._id,
            foodType: 'Pasta Trays',
            quantity: '5 large trays',
            location: '456 Oak Ave, Townsville',
            expiryDate: new Date(Date.now() + 172800000), // +2 days
            status: DonationStatus.AVAILABLE,
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
