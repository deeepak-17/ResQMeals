import express from 'express';
import { getMyTasks, acceptTask, declineTask, updateTaskStatus } from '../controllers/volunteerController';

// Assuming we have an auth middleware. 
// If not, we'll need to create a dummy one or import the actual one when available.
// For now, I'll assume the middleware populates req.user.
import { verifyToken } from '../middleware/authMiddleware';

const router = express.Router();

// All routes here should be protected and only for volunteers
// In a real app, we might add a role check middleware like requireRole('volunteer')

router.get('/my', verifyToken, getMyTasks);
router.put('/:id/accept', verifyToken, acceptTask);
router.put('/:id/decline', verifyToken, declineTask);
router.put('/:id/status', verifyToken, updateTaskStatus);

export default router;
