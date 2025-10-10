import express from "express";
// import adminRoutes from "../../modules/admin/routes/admin.routes";
// import sessionRoutes from "../../modules/session/routes/session.route";
// import serverRoutes from "../../modules/session/routes/server.routes";
// import fileRoutes from "./file.routes";
import teamRoutes from "../../modules/teams/routes/teams.routes";

const router = express.Router();

// router.use("/admin", adminRoutes);
// router.use("/session", sessionRoutes);
// router.use("/server", serverRoutes);
// router.use("/files", fileRoutes);
router.use("/teams", teamRoutes);

export default router;
