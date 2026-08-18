import assert from "node:assert/strict";
import test from "node:test";
import { resolveDnsWithTimeout, type DnsResolver } from "./dns-query.js";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function harness(query: Promise<unknown>) {
  let timerCallback: (() => void) | undefined;
  let cancelCount = 0;
  let clearCount = 0;
  const servers: string[][] = [];
  const resolver: DnsResolver = {
    setServers: (value) => servers.push(value),
    resolve: () => query,
    cancel: () => { cancelCount += 1; },
  };
  const dependencies = {
    createResolver: () => resolver,
    setTimer: (callback: () => void) => {
      timerCallback = callback;
      return 1 as unknown as ReturnType<typeof setTimeout>;
    },
    clearTimer: () => { clearCount += 1; },
  };
  return {
    dependencies,
    fireTimer: () => timerCallback?.(),
    get cancelCount() { return cancelCount; },
    get clearCount() { return clearCount; },
    servers,
  };
}

const config = { dnsServer: "127.0.0.1:53535", query: "ok.fixture.test", recordType: "A" as const };

test("sucesso rapido limpa o timer sem cancelar o resolver", async () => {
  const control = harness(Promise.resolve(["127.0.0.42"]));
  assert.deepEqual(await resolveDnsWithTimeout(config, 1000, control.dependencies), ["127.0.0.42"]);
  assert.equal(control.clearCount, 1);
  assert.equal(control.cancelCount, 0);
  assert.deepEqual(control.servers, [["127.0.0.1:53535"]]);
});

test("erro DNS real limpa o timer e preserva o erro sem cancelar", async () => {
  const nxdomain = Object.assign(new Error("queryA ENOTFOUND missing.test"), { code: "ENOTFOUND" });
  const control = harness(Promise.reject(nxdomain));
  await assert.rejects(resolveDnsWithTimeout(config, 1000, control.dependencies), (error) => error === nxdomain);
  assert.equal(control.clearCount, 1);
  assert.equal(control.cancelCount, 0);
});

test("timeout cancela uma vez, rejeita uma vez e ignora resolucao tardia", async () => {
  const query = deferred<unknown>();
  const control = harness(query.promise);
  const result = resolveDnsWithTimeout(config, 1000, control.dependencies);
  let rejectionCount = 0;
  result.catch(() => { rejectionCount += 1; });
  control.fireTimer();
  await assert.rejects(result, /DNS timeout/);
  query.resolve(["127.0.0.42"]);
  await Promise.resolve();
  control.fireTimer();
  assert.equal(control.cancelCount, 1);
  assert.equal(control.clearCount, 1);
  assert.equal(rejectionCount, 1);
});

test("rejeicao tardia apos timeout fica tratada sem unhandled rejection", async () => {
  const query = deferred<unknown>();
  const control = harness(query.promise);
  const result = resolveDnsWithTimeout(config, 1000, control.dependencies);
  control.fireTimer();
  await assert.rejects(result, /DNS timeout/);
  query.reject(Object.assign(new Error("cancelled"), { code: "ECANCELLED" }));
  await Promise.resolve();
  assert.equal(control.cancelCount, 1);
});

test("consultas simultaneas usam resolvers independentes", async () => {
  const firstQuery = deferred<unknown>();
  const secondQuery = deferred<unknown>();
  const controls = [harness(firstQuery.promise), harness(secondQuery.promise)];
  let index = 0;
  const createResolver = () => controls[index++].dependencies.createResolver();
  const first = resolveDnsWithTimeout(config, 1000, { ...controls[0].dependencies, createResolver });
  const second = resolveDnsWithTimeout(config, 1000, { ...controls[1].dependencies, createResolver });
  controls[0].fireTimer();
  secondQuery.resolve(["127.0.0.42"]);
  await assert.rejects(first, /DNS timeout/);
  assert.deepEqual(await second, ["127.0.0.42"]);
  assert.equal(controls[0].cancelCount, 1);
  assert.equal(controls[1].cancelCount, 0);
});
