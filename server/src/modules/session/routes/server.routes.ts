import express from 'express';
import asyncHandeler from 'express-async-handler';
import * as adminSessionControllers from '../controllers/adminsession.controller';

const router = express.Router();

router.post('/create-session', asyncHandeler(adminSessionControllers.createSession));
router.post('/update-session', asyncHandeler(adminSessionControllers.updateSessionServer));
router.post('/end-session', asyncHandeler(adminSessionControllers.endSession));

export default router;