import express from 'express';
import asyncHandeler from 'express-async-handler';
import * as fileControllers from '../../modules/files/controllers/file.controller';

const router = express.Router();

router.get('/:fileId', asyncHandeler(fileControllers.serveFile));

export default router;
