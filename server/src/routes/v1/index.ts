import express from "express";
import teamRoutes from "../../modules/teams/routes/teams.routes";
import gameStateRoutes from "../../modules/gameState/routes/gameState.routes";
import questionRoutes from "../../modules/questions/routes/question.routes";
import buzzerRoutes from "../../modules/buzzerQueue/routes/buzzerQueue.routes";
import adminRoutes from "../../modules/admin/routes/admin.routes";
import sessionRoutes from "../../modules/session/routes/session.route";

const router = express.Router();

router.use("/teams", teamRoutes);
router.use("/admin", adminRoutes);
router.use("/game-state", gameStateRoutes);
router.use("/questions", questionRoutes);
router.use("/buzzer", buzzerRoutes);
router.use("/session", sessionRoutes);

export default router;
