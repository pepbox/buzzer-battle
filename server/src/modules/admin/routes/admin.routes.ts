import express from 'express';
import asyncHandeler from 'express-async-handler';
import * as adminControllers from '../controllers/admin.controller';
import * as adminTeamControllers from '../controllers/admin.team.controller';
// import * as playerControllers from '../../players/controllers/player.controller';
// import * as questionControllers from '../../questions/controllers/question.controller';
import { authenticateUser, authorizeRoles } from '../../../middlewares/authMiddleware';

const router = express.Router();

// Admin authentication
router.post('/login', asyncHandeler(adminControllers.loginAdmin));
router.get('/fetchAdmin', authenticateUser, authorizeRoles("ADMIN"), asyncHandeler(adminControllers.fetchAdmin));

// Admin dashboard endpoints (team-based)
router.get('/dashboard', authenticateUser, authorizeRoles("ADMIN"), asyncHandeler(adminTeamControllers.fetchDashboard));

// Admin team management
router.put('/teams/:teamId', authenticateUser, authorizeRoles("ADMIN"), asyncHandeler(adminTeamControllers.updateTeam));
router.get('/teams/:teamId/responses', authenticateUser, authorizeRoles("ADMIN"), asyncHandeler(adminTeamControllers.fetchTeamResponses));

export default router;
