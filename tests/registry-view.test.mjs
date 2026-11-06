import test from "node:test";
import assert from "node:assert/strict";
import { registryQuality, observationMarkup } from "../registry-view.mjs";
const now = Date.parse("2026-11-06T22:00:00Z");
const tool = {
  lastObservedAt: "2026-11-06T21:50:00Z",
  observations: {
    quality: "verified",
    production: {
      foundation: "1.3.0",
      sha: "abc",
      evidence: "lockfile-at-commit",
    },
    main: { foundation: "1.4.0" },
    deployment: { latest: { state: "failure" } },
    errors: [],
  },
};
test("verified evidence is distinct from installation attestation", () => {
  assert.equal(registryQuality(tool, true, now), "verified");
  assert.match(observationMarkup(tool, "it", true, now), /Non attestati/);
});
test("main and published versions remain separate on failed deploy", () => {
  const html = observationMarkup(tool, "it", true, now);
  assert.match(html, /1.3.0 \/ 1.4.0/);
  assert.match(html, /failure/);
});
test("old data and disconnected listener are visibly stale", () => {
  assert.equal(registryQuality(tool, false, now), "stale");
  assert.equal(registryQuality(tool, true, now + 7200001), "stale");
});
test("fallback has no fabricated freshness or verified state", () => {
  assert.equal(registryQuality({}, false, now), "unavailable");
  assert.match(
    observationMarkup({}, "it", false, now),
    /Informazioni non disponibili/,
  );
});
test("legacy registry is never labelled verified", () => {
  assert.equal(
    registryQuality(
      { health: { checkedAt: "2026-11-06T21:50:00Z" } },
      true,
      now,
    ),
    "legacy",
  );
});
test("metadata is escaped before HTML rendering", () => {
  const html = observationMarkup(
    { ...tool, observations: { errors: ["<img src=x onerror=alert(1)>"] } },
    "de",
    true,
    now,
  );
  assert.ok(!html.includes("<img"));
  assert.match(html, /&lt;img/);
});
