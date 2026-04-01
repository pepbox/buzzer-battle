import express from "express";
import {
  createFolder,
  createQuestion,
  deleteQuestion,
  fetchFolders,
  fetchAllQuestions,
  fetchCurrentQuestion,
  sendQuestionResponse,
  updateQuestion,
  uploadQuestionMedia,
} from "../controllers/question.controller";
import {
  authenticateUser,
  authorizeRoles,
} from "../../../middlewares/authMiddleware";
import { uploadMiddleware } from "../../../services/fileUpload/middleware";

const router = express.Router();

router.get("/", authenticateUser, authorizeRoles("ADMIN"), fetchAllQuestions);

router.get("/folders", authenticateUser, authorizeRoles("ADMIN"), fetchFolders);

router.post(
  "/folders",
  authenticateUser,
  authorizeRoles("ADMIN"),
  createFolder,
);

router.post("/", authenticateUser, authorizeRoles("ADMIN"), createQuestion);

router.put(
  "/:questionId",
  authenticateUser,
  authorizeRoles("ADMIN"),
  updateQuestion,
);

router.delete(
  "/:questionId",
  authenticateUser,
  authorizeRoles("ADMIN"),
  deleteQuestion,
);

router.post(
  "/upload",
  authenticateUser,
  authorizeRoles("ADMIN"),
  uploadMiddleware.single("file", {
    folder: "question-media",
    maxFileSize: 50 * 1024 * 1024,
    maxFiles: 1,
    allowedMimeTypes: [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "video/mp4",
      "video/webm",
      "video/quicktime",
      "audio/mpeg",
      "audio/mp3",
      "audio/wav",
      "audio/x-wav",
      "audio/ogg",
      "audio/mp4",
      "audio/x-m4a",
    ],
  }),
  uploadQuestionMedia,
);

// Team routes
router.get("/current", authenticateUser, fetchCurrentQuestion);
router.post(
  "/:questionId/response",
  authenticateUser,
  authorizeRoles("TEAM"),
  sendQuestionResponse,
);

export default router;
