import express from 'express';
import { getMyTasks, acceptTask, declineTask, updateTaskStatus } from '../controllers/volunteerController';
import { authMiddleware } from '../middleware/auth';
import { roleMiddleware } from '../middleware/role';

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Restrict to volunteers
router.use(roleMiddleware('volunteer'));

router.get('/my', getMyTasks);
router.put('/:id/accept', acceptTask);
router.put('/:id/decline', declineTask);
router.put('/:id/status', updateTaskStatus);

export default router;
