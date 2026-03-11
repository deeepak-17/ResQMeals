
import { Request, Response } from 'express';
import { getNearbyDonations, acceptDonation } from '../ngoController';
import FoodDonation from '../../models/FoodDonation';
import PickupTask from '../../models/PickupTask';
import User from '../../models/User';
import * as socketEvents from '../../utils/socketEvents';

// Mock dependencies
jest.mock('../../models/FoodDonation');
jest.mock('../../models/PickupTask');
jest.mock('../../models/User');
jest.mock('../../utils/socketEvents');

describe('NGO Controller', () => {
    let req: any;
    let res: any;

    beforeEach(() => {
        req = {
            user: { id: 'ngo123', role: 'ngo' },
            params: {},
            query: {},
            body: {}
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        jest.clearAllMocks();
    });

    describe('getNearbyDonations', () => {
        it('should return nearby donations successfully', async () => {
            req.query = { lat: '10', lng: '20', radiusKm: '5' };

            const mockDonations = [{ title: 'Food 1' }, { title: 'Food 2' }];

            // Mock Mongoose chainable methods
            const mockFind = jest.fn().mockReturnThis();
            const mockPopulate = jest.fn().mockReturnThis();
            const mockSort = jest.fn().mockResolvedValue(mockDonations);

            (FoodDonation.find as jest.Mock).mockImplementation(() => ({
                populate: mockPopulate,
                sort: mockSort
            }) as any);

            await getNearbyDonations(req, res);

            expect(FoodDonation.find).toHaveBeenCalled();
            expect(res.json).toHaveBeenCalledWith({
                count: 2,
                radiusKm: 5,
                donations: mockDonations
            });
        });

        it('should handle missing coordinates', async () => {
            req.query = { radiusKm: '5' };
            await getNearbyDonations(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: "Latitude and longitude are required" });
        });
    });

    describe('acceptDonation', () => {
        it('should successfully accept a donation and assign to user', async () => {
            req.params.id = 'donation123';

            const mockDonation = {
                _id: 'donation123',
                donorId: 'donor123',
                status: 'reserved',
                isHighRisk: false,
                location: {
                    type: 'Point',
                    coordinates: [20, 10]
                }
            };

            const mockVolunteer = {
                _id: 'vol123',
                name: 'Test Volunteer',
                email: 'vol@test.com'
            };

            // Mock findOneAndUpdate success
            (FoodDonation.findOneAndUpdate as jest.Mock).mockResolvedValue(mockDonation);

            // Mock finding declined tasks
            (PickupTask.find as jest.Mock).mockReturnValue({
                select: jest.fn().mockResolvedValue([]), // no previous decliners
            });

            // Mock User.find().limit() — returns array of nearby volunteers
            (User.find as jest.Mock).mockReturnValue({
                limit: jest.fn().mockResolvedValue([mockVolunteer]),
                select: jest.fn().mockResolvedValue([mockVolunteer]),
            } as any);

            // Mock PickupTask.countDocuments for load balancing per volunteer
            (PickupTask.countDocuments as jest.Mock).mockResolvedValue(0);

            // Mock User.findByIdAndUpdate for incrementing totalAssignedTasks
            (User.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockVolunteer);

            // Mock PickupTask constructor + save
            const mockSave = jest.fn().mockResolvedValue(true);
            (PickupTask as unknown as jest.Mock).mockImplementation(() => ({
                save: mockSave,
                _id: 'task123'
            }));

            await acceptDonation(req, res);

            expect(FoodDonation.findOneAndUpdate).toHaveBeenCalledWith(
                expect.objectContaining({ _id: 'donation123', status: 'available' }),
                expect.anything(),
                { new: true }
            );

            expect(User.find).toHaveBeenCalled();
            expect(mockSave).toHaveBeenCalled(); // Task saved
            expect(socketEvents.emitToUser).toHaveBeenCalled(); // Notify volunteer & donor

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                message: "Donation accepted and transport task created",
                assignedVolunteer: expect.objectContaining({ email: 'vol@test.com' })
            }));
        });

        it('should return 404 if donation not found or not available', async () => {
            req.params.id = 'donation123';
            (FoodDonation.findOneAndUpdate as jest.Mock).mockResolvedValue(null);
            (FoodDonation.findById as jest.Mock).mockResolvedValue(null);

            await acceptDonation(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
        });
    });
});
