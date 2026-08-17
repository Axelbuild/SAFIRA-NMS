import { FastifyRequest, FastifyReply } from "fastify";
import { ServerService } from "../services/server.service";
import { ServerInput } from "../types/server";

const serverService = new ServerService();

export class ServerController {
  async create(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = request.body as ServerInput;
      const server = await serverService.create(data);

      return reply.code(201).send(server);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return reply.code(400).send({ error: message });
    }
  }

  async findAll(request: FastifyRequest, reply: FastifyReply) {
    try {
      const servers = await serverService.findAll();
      return reply.send(servers);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return reply.code(500).send({ error: message });
    }
  }

  async findById(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const server = await serverService.findById(Number(id));

      if (!server) {
        return reply.code(404).send({ error: "Server not found" });
      }

      return reply.send(server);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return reply.code(500).send({ error: message });
    }
  }

  async findByGroupId(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { groupId } = request.params as { groupId: string };
      const servers = await serverService.findByGroupId(Number(groupId));

      return reply.send(servers);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return reply.code(500).send({ error: message });
    }
  }

  async update(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const data = request.body as Partial<ServerInput>;

      const server = await serverService.update(Number(id), data);
      return reply.send(server);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return reply.code(400).send({ error: message });
    }
  }

  async delete(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      await serverService.delete(Number(id));

      return reply.code(204).send();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return reply.code(500).send({ error: message });
    }
  }
}
