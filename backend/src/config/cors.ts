import { FastifyInstance } from "fastify";
import cors from "@fastify/cors";

export async function configureCors(fastify: FastifyInstance) {
  await fastify.register(cors, {
    origin: process.env.FRONTEND_URL
    ? [process.env.FRONTEND_URL]
    : true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });
}
