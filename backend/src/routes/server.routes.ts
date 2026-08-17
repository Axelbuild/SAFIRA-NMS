import { FastifyInstance } from "fastify";
import { ServerController } from "../controllers/server.controller";

const serverController = new ServerController();

export async function serverRoutes(fastify: FastifyInstance) {
  fastify.post<{ Body: any }>("/servers", async (request, reply) => {
    return serverController.create(request, reply);
  });

  fastify.get("/servers", async (request, reply) => {
    return serverController.findAll(request, reply);
  });

  fastify.get<{ Params: { id: string } }>("/servers/:id", async (request, reply) => {
    return serverController.findById(request, reply);
  });

  fastify.get<{ Params: { groupId: string } }>("/servers/group/:groupId", async (request, reply) => {
    return serverController.findByGroupId(request, reply);
  });

  fastify.put<{ Params: { id: string }; Body: any }>(
    "/servers/:id",
    async (request, reply) => {
      return serverController.update(request, reply);
    }
  );

  fastify.delete<{ Params: { id: string } }>("/servers/:id", async (request, reply) => {
    return serverController.delete(request, reply);
  });
}
