import { FastifyInstance } from "fastify";

import { printerRoutes } from "./printer.routes";
import { serverRoutes } from "./server.routes";
import { groupRoutes } from "./group.routes";
import { linkRoutes } from "./link.routes";

export function routes(fastify: FastifyInstance) {
  fastify.register(printerRoutes);
  fastify.register(serverRoutes);
  fastify.register(groupRoutes);
  fastify.register(linkRoutes);

  fastify.get("/", async function handler() {
    return { online: true };
  });
}
