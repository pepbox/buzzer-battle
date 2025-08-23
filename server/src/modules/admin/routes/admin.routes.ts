import express from 'express';
import asyncHandeler from 'express-async-handler';
import * as adminControllers from '../controllers/admin.controller';
import * as playerControllers from '../../players/controllers/player.controller';
// import * as questionControllers from '../../questions/controllers/question.controller';
import { authenticateUser, authorizeRoles } from '../../../middlewares/authMiddleware';

const router = express.Router();

router.post('/create', asyncHandeler(adminControllers.createAdmin));
router.post('/login', asyncHandeler(adminControllers.loginAdmin));
router.get('/fetchAdmin', authenticateUser, asyncHandeler(adminControllers.fetchAdmin));
router.post('/logout', asyncHandeler(adminControllers.logoutAdmin));
router.get('/fetch', authenticateUser, authorizeRoles("ADMIN"), asyncHandeler(adminControllers.fetchAdmin));
router.get('/fetchDashboardData', authenticateUser, authorizeRoles("ADMIN"), asyncHandeler(adminControllers.fetchAdminDashboardData));
router.get('/fetchLeaderboardData', authenticateUser, authorizeRoles("ADMIN"), asyncHandeler(adminControllers.fetchLeaderboardData));
router.get('/checkPlayersReadiness', authenticateUser, authorizeRoles("ADMIN"), asyncHandeler(adminControllers.checkPlayersReadiness));
router.put('/updatePlayer', authenticateUser, authorizeRoles("ADMIN"), asyncHandeler(playerControllers.updatePlayer));
router.get('/getPlayerWithResponses/:playerId', authenticateUser, authorizeRoles("ADMIN"), asyncHandeler(playerControllers.getPlayerWithResponses));

export default router;
