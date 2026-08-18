import type { FastifyInstance } from "fastify";

type JobScheduler = Pick<typeof globalThis, "setInterval" | "clearInterval">;
type ScheduledJob = () => Promise<void>;

const startedInstances = new WeakSet<FastifyInstance>();

export function scheduleJobsOnce(
  fastify: FastifyInstance,
  jobs: readonly ScheduledJob[],
  intervalMs: number,
  scheduler: JobScheduler = globalThis
) {
  if (startedInstances.has(fastify)) return;
  startedInstances.add(fastify);

  const intervals = jobs.map((job) =>
    scheduler.setInterval(async () => {
      try {
        await job();
      } catch (error) {
        fastify.log.error(error);
      }
    }, intervalMs)
  );

  fastify.addHook("onClose", async () => {
    for (const interval of intervals) {
      scheduler.clearInterval(interval);
    }

    startedInstances.delete(fastify);
  });
}
