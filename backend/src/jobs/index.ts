import { FastifyInstance } from "fastify";

import { checkPrinters } from "./printer.job";
import { checkServers } from "./server.job";
import { checkLinks } from "./link.job";
import { scheduleJobsOnce } from "./job-scheduler";

export function startJobs(fastify: FastifyInstance) {
  scheduleJobsOnce(
    fastify,
    [checkPrinters, checkServers, checkLinks],
    300000
  );
}
