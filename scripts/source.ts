import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, realpathSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import type { SourceManifest } from "../leek/src/lower/index.ts";

export const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceManifest: (text: string) => SourceManifest = JSON.parse;

export const git = (checkout: string, ...args: string[]): string =>
  execFileSync("git", ["-C", checkout, ...args], { encoding: "utf8" }).trim();

/** Consume the exact root gitlinks and inherited toolchain, never a second kernel checkout. */
export function verifyPins(): { canonical: string; leek: string; thistle: string; baguette: string; bake: string } {
  const revisions = new Map<string, string>();
  for (const dependency of ["mikuOS-thistle", "leek"]) {
    const checkout = resolve(root, dependency);
    const entry = git(root, "ls-files", "--stage", "--", dependency);
    assert.match(entry, /^160000 [0-9a-f]{40} 0\t/);
    const revision = entry.slice(7, 47);
    assert.equal(git(checkout, "rev-parse", "--show-toplevel"), checkout);
    assert.equal(git(checkout, "rev-parse", "HEAD"), revision, "Root pin mismatch: " + dependency);
    assert.equal(git(checkout, "status", "--porcelain", "--untracked-files=no", "--ignore-submodules=none"), "", "Modified dependency: " + dependency);
    revisions.set(dependency, revision);
  }
  return {
    canonical: revisions.get("mikuOS-thistle") ?? "",
    leek: revisions.get("leek") ?? "",
    thistle: git(resolve(root, "mikuOS-thistle/thistle"), "rev-parse", "HEAD"),
    baguette: git(resolve(root, "leek/baguette"), "rev-parse", "HEAD"),
    bake: git(resolve(root, "leek/baguette/bake"), "rev-parse", "HEAD")
  };
}

export const sha256 = (file: string): string => createHash("sha256").update(readFileSync(file)).digest("hex");

/** Verify every production module against the pinned canonical checkout, including inherited Thistle. */
export function verifyCanonicalGraph(file: string): SourceManifest {
  const manifest = sourceManifest(readFileSync(file, "utf8"));
  assert.equal(manifest.schema, 1);
  assert.equal(manifest.entry, "src/main/boot.ts");
  assert.ok(Array.isArray(manifest.modules));
  const canonical = resolve(root, "mikuOS-thistle");
  const seen = new Set<string>();
  for (const module of manifest.modules) {
    assert.ok(typeof module.path === "string" && !seen.has(module.path), "Invalid canonical module path");
    const original = realpathSync(resolve(canonical, module.path));
    const path = relative(canonical, original);
    assert.ok(!isAbsolute(path) && path !== ".." && !path.startsWith(".." + sep), "Module outside canonical checkout");
    assert.equal(sha256(original), module.sha256, "Canonical source mismatch: " + module.path);
    seen.add(module.path);
  }
  for (const required of ["src/main/boot.ts", "src/main/image.ts", "src/sh/shell.ts", "src/apps/index.ts", "thistle/src/core/kernel.ts", "thistle/src/native/kernel.ts"]) {
    assert.ok(seen.has(required), "Incomplete canonical source graph: " + required);
  }
  return manifest;
}
