import { Router } from "express";
import { AdminController } from "../controllers/admin.controller";
import { AuthController } from "../controllers/auth.controller";
import { updateAdminTeamScore } from "../controllers/admin.controller";

const router = Router();

// Admin Login
router.post("/login", AuthController.adminLogin);

// Question Vault CRUD
router.get("/chapters", AdminController.getChapters);
router.put("/chapters/:id", AdminController.updateChapter);
router.delete("/chapters/:id", AdminController.deleteChapter);
router.post("/chapters/reset", AdminController.resetChapters);

// Tournament Leaderboard & Team Administration
router.get("/leaderboard", AdminController.getLeaderboard);
router.post("/leaderboard/score", updateAdminTeamScore);
router.get("/teams", AdminController.getTeams);
router.post("/teams", AdminController.createTeam);
router.put("/teams/:id/score", AdminController.updateTeamScore);
router.post("/teams/:teamId/force-logout", AdminController.forceLogoutTeam);

// Event Lifecycle Controls
router.post("/event/start", AdminController.startEvent);
router.post("/event/pause", AdminController.pauseEvent);
router.post("/event/resume", AdminController.resumeEvent);
router.post("/event/close-login", AdminController.closeLogin);
router.post("/event/stop-submissions", AdminController.stopSubmissions);
router.post("/event/end", AdminController.endEvent);

// Results & Exports
router.get("/results/overall", AdminController.getOverallResults);
router.get("/results/rounds", AdminController.getRoundResults);
router.get("/results/export.csv", AdminController.exportCsv);

// Vecna Approval Queue
router.get("/vecna/messages/pending", AdminController.getPendingVecnaMessages);
router.post("/vecna/messages/:messageId/approve", AdminController.approveVecnaMessage);
router.post("/vecna/messages/:messageId/reject", AdminController.rejectVecnaMessage);
router.post("/vecna/templates", AdminController.createVecnaTemplate);

export default router;
