import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { linkWat } from "../leek/src/wat.ts";
import { root, sha256, verifyCanonicalGraph, verifyPins } from "./source.ts";

process.chdir(root);
const pins = verifyPins();
execFileSync("sha256sum", ["-c", "SHA256SUMS"], { stdio: "inherit" });
verifyCanonicalGraph("canonical-source.json");
interface BuildManifest { schema: number; pins: typeof pins; entry: string; layout: string; referenceWasmSha256: string; base: { file: string; sha256: string } }
const buildManifest: (text: string) => BuildManifest = JSON.parse;
const manifest = buildManifest(readFileSync("mikuos.manifest.json", "utf8"));
assert.equal(manifest.schema, 1);
assert.deepEqual(manifest.pins, pins);
assert.equal(manifest.entry, "src/main/boot.ts");
assert.equal(manifest.layout, "src/baseline/layout.json");
assert.equal(manifest.base.file, "build/mikuos-base.tar.gz");
assert.equal(sha256(manifest.base.file), manifest.base.sha256);
mkdirSync("build", { recursive: true });
mkdirSync("dist/mikuos", { recursive: true });
writeFileSync("build/mikuos.wat", linkWat(manifest.layout));
execFileSync(process.execPath, ["leek/baguette/node_modules/.bin/wasm-opt", "build/mikuos.wat", "-O3", "--all-features", "--strip-debug", "-o", "dist/mikuos/mikuos.wasm"], { stdio: "inherit" });
assert.equal(sha256("dist/mikuos/mikuos.wasm"), manifest.referenceWasmSha256, "Modular WAT did not reproduce Baguette's reference binary");
console.log("Compiled canonical mikuOS modular WAT and reproduced the reference binary.");
