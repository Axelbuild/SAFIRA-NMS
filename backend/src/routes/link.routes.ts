import { FastifyInstance } from "fastify";
import { LinkController } from "../controllers/link.controller";

export async function linkRoutes(app: FastifyInstance) {
  // ===== CRUD LINKS =====

  app.get("/links", LinkController.listLinks);

  app.get("/links/:id", LinkController.getLink);

  app.get("/links/group/:groupId", LinkController.getLinksByGroup);

  app.post("/links", LinkController.createLink);

  app.patch("/links/:id", LinkController.updateLink);

  app.delete("/links/:id", LinkController.deleteLink);

  // ===== MONITOR OPERATIONS =====

  app.post("/links/:id/monitors", LinkController.createMonitor);

  app.get("/links/:id/monitors", LinkController.getMonitors);

  app.delete("/links/monitors/:monitorId", LinkController.deleteMonitor);

  // ===== STATUS & METRICS =====

  app.get("/links/:id/status", LinkController.getLinkStatus);

  app.get("/links/:id/metrics", LinkController.getMetrics);

  // ===== TEST ENDPOINTS =====

  app.post("/links/:id/test", LinkController.testLink);
}
