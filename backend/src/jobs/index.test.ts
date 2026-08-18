import assert from "node:assert/strict";
import test from "node:test";
import { FastifyInstance } from "fastify";
import { scheduleJobsOnce } from "./job-scheduler.js";

test("registra os jobs uma vez e limpa todos os intervalos no shutdown", async () => {
  const scheduled: unknown[] = [];
  const cleared: unknown[] = [];
  let onClose: (() => Promise<void>) | undefined;

  const fastify = {
    log: { error: () => undefined },
    addHook: (_name: string, hook: () => Promise<void>) => {
      onClose = hook;
    },
  } as unknown as FastifyInstance;

  const scheduler = {
    setInterval: (() => {
      const handle = { id: scheduled.length + 1 };
      scheduled.push(handle);
      return handle;
    }) as unknown as typeof globalThis.setInterval,
    clearInterval: ((handle: unknown) => {
      cleared.push(handle);
    }) as typeof globalThis.clearInterval,
  };

  const jobs = [async () => undefined, async () => undefined, async () => undefined];
  scheduleJobsOnce(fastify, jobs, 300000, scheduler);
  scheduleJobsOnce(fastify, jobs, 300000, scheduler);

  assert.equal(scheduled.length, 3);
  assert.ok(onClose);
  await onClose();
  assert.deepEqual(cleared, scheduled);

  scheduleJobsOnce(fastify, jobs, 300000, scheduler);
  assert.equal(scheduled.length, 6);
});
