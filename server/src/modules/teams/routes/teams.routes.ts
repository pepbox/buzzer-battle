import express from "express";
import {
  createTeam,
  fetchTeam,
  fetchOverallLeaderboard,
  fetchTotalTeamsInSession,
  fetchJoinedTeamNumbers,
} from "../controllers/team.controller";
import {
  authenticateUser,
  authorizeRoles,
} from "../../../middlewares/authMiddleware";

const router = express.Router();

// Public route - no auth needed
router.post("/create", createTeam);
router.get("/fetchTotalTeamsInSession/:sessionId", fetchTotalTeamsInSession);
router.get("/joined/:sessionId", fetchJoinedTeamNumbers);

// Protected routes - require team authentication
router.get("/me", authenticateUser, authorizeRoles("TEAM"), fetchTeam);
router.get("/leaderboard", authenticateUser, fetchOverallLeaderboard);

export default router;
