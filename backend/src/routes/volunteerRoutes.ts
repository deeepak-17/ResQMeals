import express from 'express';
import { getMyTasks, acceptTask, declineTask, updateTaskStatus, toggleAvailability, updateLocation, getAvailableTasks, updateLiveLocation, triggerEmergencyReassign, getMyPerformanceStats } from '../controllers/volunteerController';
import { authMiddleware } from '../middleware/auth';
import { roleMiddleware } from '../middleware/role';

const router = express.Router();

router.use(authMiddleware);
router.use(roleMiddleware('volunteer'));

router.get('/my', getMyTasks);
router.get('/available', getAvailableTasks);
router.get('/performance', getMyPerformanceStats);
router.put('/availability', toggleAvailability);
router.put('/location', updateLocation);
router.put('/:id/accept', acceptTask);
router.put('/:id/decline', declineTask);
router.put('/:id/status', updateTaskStatus);
router.put('/:id/live-location', updateLiveLocation);
router.post('/:id/emergency', triggerEmergencyReassign);

export default router;
