import { FastifyInstance } from "fastify";

import { checkPrinters } from "./printer.job";
import { checkServers } from "./server.job";
import { checkLinks } from "./link.job";

export function startJobs(fastify: FastifyInstance) {
  setInterval(async () => {
    try {
      await checkPrinters();
    } catch (error) {
      fastify.log.error(error);
    }
  }, 300000);
  
  setInterval(async () => {
    try {
      await checkServers();
    } catch (error) {
      fastify.log.error(error);
    }
  }, 300000);
  
  setInterval(async () => {
    try {
      await checkLinks();
    } catch (error) {
      fastify.log.error(error);
    }
  }, 300000);
}
