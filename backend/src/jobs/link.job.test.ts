import assert from "node:assert/strict";
import test from "node:test";
import { calculateSnmpTraffic, consolidateStatus } from "./link-job.utils.js";

test("consolidação diferencia ONLINE, SUSPECT, OFFLINE e UNKNOWN", () => {
  assert.equal(consolidateStatus([]), "UNKNOWN");
  assert.equal(consolidateStatus(["UNKNOWN"]), "UNKNOWN");
  assert.equal(consolidateStatus(["ONLINE", "SUSPECT"]), "SUSPECT");
  assert.equal(consolidateStatus(["ONLINE", "OFFLINE"]), "OFFLINE");
});

test("tráfego SNMP usa duas amostras e calcula Mbps", () => {
  const result = calculateSnmpTraffic(
    { ifHCInOctets: 1_000_000, ifHCOutOctets: 2_000_000 },
    { ifHCInOctets: 2_000_000, ifHCOutOctets: 4_000_000, timestamp: 11_000 },
    new Date(1_000),
    100
  );
  assert.equal(result.downloadMbps, 0.8);
  assert.equal(result.uploadMbps, 1.6);
});
