import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import { git, root, sha256, verifyCanonicalGraph, verifyPins } from "./source.ts";

process.chdir(root);
const pins = verifyPins();
assert.equal(git(root, "status", "--porcelain", "--untracked-files=all", "--", "src", "abi", "canonical-source.json", "mikuos.manifest.json", "SHA256SUMS"), "",
  "Refusing to overwrite modified generated source");
const reference = resolve(root, "build/reference");
rmSync(reference, { recursive: true, force: true });
// The canonical boot graph is fixed here. A small entry cannot satisfy this build.
execFileSync(process.execPath, ["leek/src/cli.ts", "--target=wasm", "--source=mikuOS-thistle", "--out-dir=" + reference], { stdio: "inherit" });
const sources = verifyCanonicalGraph(resolve(reference, "canonical-source.json"));
const layout = resolve(reference, "wat/leek/layout.json");
assert.ok(existsSync(layout), "Leek did not emit Baguette's modular WAT layout");
rmSync("src", { recursive: true, force: true });
mkdirSync("src", { recursive: true });
mkdirSync("abi", { recursive: true });
cpSync(resolve(reference, "wat/leek"), "src/baseline", { recursive: true });
cpSync(resolve(reference, "host-interface.d.ts"), "abi/host-interface.d.ts");
writeFileSync("canonical-source.json", JSON.stringify(sources, null, 2) + "\n");
mkdirSync("build", { recursive: true });
execFileSync("tar", ["--sort=name", "--mtime=@0", "--owner=0", "--group=0", "--numeric-owner", "-czf", "build/mikuos-base.tar.gz", "-C", "mikuOS-thistle", ".thistle.base"]);
const manifest = {
  schema: 1, canonicalRepository: "kittycrow-kittyx/mikuOS-thistle", pins,
  entry: sources.entry, sourceManifest: "canonical-source.json", layout: "src/baseline/layout.json",
  referenceWasmSha256: sha256(resolve(reference, "leek.wasm")),
  base: { file: "build/mikuos-base.tar.gz", sha256: sha256("build/mikuos-base.tar.gz") }
};
writeFileSync("mikuos.manifest.json", JSON.stringify(manifest, null, 2) + "\n");
const files = ["canonical-source.json", "mikuos.manifest.json", ...["src", "abi"].flatMap(directory =>
  readdirSync(directory, { recursive: true, withFileTypes: true }).filter(entry => entry.isFile()).map(entry => relative(root, resolve(entry.parentPath, entry.name))))];
writeFileSync("SHA256SUMS", files.sort().map(file => sha256(file) + "  " + file + "\n").join(""));
assert.ok(readFileSync("SHA256SUMS", "utf8").length);
console.log("Generated modular WAT from " + sources.modules.length + " canonical mikuOS modules.");
