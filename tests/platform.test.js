import assert from "node:assert/strict";
import test from "node:test";
import { formatPlatform, matchesPlatform, parsePlatform } from "../dist/platform.js";

test("parses two-part platforms", () => {
  assert.deepEqual(parsePlatform("linux/amd64"), { os: "linux", architecture: "amd64" });
});

test("parses platform variants", () => {
  assert.deepEqual(parsePlatform("linux/arm/v7"), { os: "linux", architecture: "arm", variant: "v7" });
});

test("rejects invalid platforms", () => {
  assert.throws(() => parsePlatform("amd64"), /expected os\/architecture/);
});

test("matches a required platform without forcing a variant", () => {
  assert.equal(matchesPlatform(
    { os: "linux", architecture: "arm64", variant: "v8" },
    { os: "linux", architecture: "arm64" },
  ), true);
});

test("formats variants", () => {
  assert.equal(formatPlatform({ os: "linux", architecture: "arm", variant: "v7" }), "linux/arm/v7");
});
