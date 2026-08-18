import assert from "node:assert/strict";
import test from "node:test";
import {
  assertValidDnsRecordType,
  DNS_RECORD_TYPES,
} from "./dns-monitor.config.js";

test("aceita record types DNS suportados e o default ausente", () => {
  assert.doesNotThrow(() => assertValidDnsRecordType(undefined));

  for (const recordType of DNS_RECORD_TYPES) {
    assert.doesNotThrow(() => assertValidDnsRecordType(recordType));
  }
});

test("rejeita record type DNS fora do contrato", () => {
  assert.throws(
    () => assertValidDnsRecordType("INVALID"),
    /DNS config\.recordType must be one of: A, AAAA, MX, NS, CNAME/
  );
});
