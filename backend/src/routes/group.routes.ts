import { FastifyInstance } from "fastify";
import {getGroupByIdController,getGroupController,postCreateGroupController,updateGroupController,deleteGroupController,} from "../controllers/group.controller";

export async function groupRoutes(app: FastifyInstance) {
  app.post("/group", postCreateGroupController);
  app.get("/group", getGroupController);
  app.get("/group/:id", getGroupByIdController);
  app.put("/group/:id", updateGroupController);
  app.delete("/group/:id", deleteGroupController);
}