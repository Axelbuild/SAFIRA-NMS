import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_PRINTER_STATUS_CONCURRENCY,
  MAX_PRINTER_STATUS_CONCURRENCY,
  parsePrinterStatusConcurrency,
} from "./printer-status.js";

test("usa o padrão para configuração ausente ou inválida", () => {
  for (const value of [undefined, "", "0", "-1", "texto", "2.5", "Infinity"]) {
    assert.equal(
      parsePrinterStatusConcurrency(value),
      DEFAULT_PRINTER_STATUS_CONCURRENCY
    );
  }
});

test("respeita valor válido e limita valores acima do máximo", () => {
  assert.equal(parsePrinterStatusConcurrency("3"), 3);
  assert.equal(
    parsePrinterStatusConcurrency(String(MAX_PRINTER_STATUS_CONCURRENCY + 1)),
    MAX_PRINTER_STATUS_CONCURRENCY
  );
});
