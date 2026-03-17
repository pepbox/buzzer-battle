import express from "express";
import {
  fetchAllQuestions,
  fetchCurrentQuestion,
  sendQuestionResponse,
} from "../controllers/question.controller";
import {
  authenticateUser,
  authorizeRoles,
} from "../../../middlewares/authMiddleware";

const router = express.Router();

router.get("/", authenticateUser, authorizeRoles("ADMIN"), fetchAllQuestions);

// Team routes
router.get("/current", authenticateUser, fetchCurrentQuestion);
router.post(
  "/:questionId/response",
  authenticateUser,
  authorizeRoles("TEAM"),
  sendQuestionResponse,
);

export default router;
