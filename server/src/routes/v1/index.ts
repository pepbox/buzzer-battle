import express from "express";
import teamRoutes from "../../modules/teams/routes/teams.routes";
import gameStateRoutes from "../../modules/gameState/routes/gameState.routes";
import questionRoutes from "../../modules/questions/routes/question.routes";
import buzzerRoutes from "../../modules/buzzerQueue/routes/buzzerQueue.routes";

const router = express.Router();

router.use("/teams", teamRoutes);
router.use("/game-state", gameStateRoutes);
router.use("/questions", questionRoutes);
router.use("/buzzer", buzzerRoutes);

export default router;
