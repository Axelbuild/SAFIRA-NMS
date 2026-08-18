import Fastify from "fastify";

import { checkLinks } from "./jobs/link.job";
import { configureCors } from "./config/cors";
import { startJobs } from "./jobs";
import { routes } from "./routes";

async function bootstrap() {
  const fastify = Fastify({
    logger: true,
  });
  
  configureCors(fastify);
  routes(fastify);
  
  // Execute once on startup; checkLinks prevents overlapping executions.
  void checkLinks();
  
  startJobs(fastify);
  
  fastify
    .listen({ port: 3333, host: "0.0.0.0" })
    .then(() => console.log("Server is running"))
    .catch(console.error);
}

await bootstrap();
