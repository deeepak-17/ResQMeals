import express from 'express';
import { getMyTasks, acceptTask, declineTask, updateTaskStatus } from '../controllers/volunteerController';

// Assuming we have an auth middleware. 
// If not, we'll need to create a dummy one or import the actual one when available.
// For now, I'll assume the middleware populates req.user.
import { authMiddleware } from '../middleware/auth';
import { roleMiddleware } from '../middleware/role';

const router = express.Router();

// All routes here should be protected and only for volunteers
router.use(authMiddleware);
router.use(roleMiddleware('volunteer'));

router.get('/my', getMyTasks);
router.put('/:id/accept', acceptTask);
router.put('/:id/decline', declineTask);
router.put('/:id/status', updateTaskStatus);

export default router;
