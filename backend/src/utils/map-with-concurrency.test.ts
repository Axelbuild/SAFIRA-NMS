import assert from "node:assert/strict";
import test from "node:test";
import { mapWithConcurrency } from "./map-with-concurrency.js";

async function measureConcurrency(itemCount: number, concurrency: number) {
  let active = 0;
  let peak = 0;

  const result = await mapWithConcurrency(
    Array.from({ length: itemCount }, (_, index) => index),
    concurrency,
    async (item) => {
      active++;
      peak = Math.max(peak, active);
      await new Promise<void>((resolve) => setImmediate(resolve));
      active--;
      return item;
    }
  );

  return { active, peak, result };
}

test("limite 1 processa uma única tarefa por vez", async () => {
  const measured = await measureConcurrency(8, 1);
  assert.equal(measured.peak, 1);
  assert.equal(measured.active, 0);
});

test("limite 3 executa concorrentemente sem ultrapassar três", async () => {
  const measured = await measureConcurrency(9, 3);
  assert.equal(measured.peak, 3);
  assert.equal(measured.active, 0);
});

test("muitas tarefas respeitam o limite e preservam a ordem", async () => {
  const measured = await measureConcurrency(25, 4);
  assert.equal(measured.peak, 4);
  assert.deepEqual(measured.result, Array.from({ length: 25 }, (_, index) => index));
});

test("uma tarefa rejeitada libera a vaga e não deixa promises pendentes", async () => {
  let active = 0;
  let completed = 0;

  await assert.rejects(
    mapWithConcurrency([0, 1, 2], 1, async (item) => {
      active++;
      try {
        if (item === 1) throw new Error("falha controlada");
        completed++;
        return item;
      } finally {
        active--;
      }
    }),
    /falha controlada/
  );

  assert.equal(active, 0);
  assert.equal(completed, 1);
});
