# mikuOS Teto

**MIKU**: MIKU Is Not the Kernel; it's Userspace.

This repository builds the canonical mikuOS TypeScript graph through Leek,
Bake and Baguette. Its only direct source pins are `mikuOS-thistle` and `leek`.
The kernel comes from `mikuOS-thistle/thistle`; this repository contains no
separate kernel or userspace implementation. The old `mikuOS` repository serves
Pages and is outside this build.

The build follows Teto's two stages:

1. Leek extends the canonical TypeScript graph, then invokes the pinned Baguette
   compiler and its mandatory Bake stage. Baguette produces modular WAT and a
   reference binary. Source generation checks hashes against the canonical
   checkout and retains its `.thistle.base` userland unchanged.
2. An independent job checks the source hashes, links Baguette's modular layout
   and compiles it using the pinned Binaryen. The resulting binary must match
   Baguette's reference binary byte for byte.

## Build

```sh
bun run setup
bun run check
bun run source
bun run compile
```

`bun run build` performs both stages. The production entry is fixed to canonical
`src/main/boot.ts`; an isolated function or smaller entry cannot satisfy this
build. Exact clean gitlinks are checked before either stage. No canonical
TypeScript source is rewritten in place.

Successful generation writes modular source to `src/baseline`, ABI declarations
to `abi/`, the original module hashes to `canonical-source.json`, pinned build
metadata to `mikuos.manifest.json` and source checksums to `SHA256SUMS`.
The unchanged userland is packaged in `build/mikuos-base.tar.gz`. Compiled binaries
belong in `dist/mikuos` and are not committed.

## Current status

The whole-system build is not complete. Leek now stages the full canonical boot
graph, including inherited Thistle and ThistleASM. It still needs language
extensions for exceptions, optional primitive values, indexed records, Promise
continuations and explicit host capabilities, followed by a native OS boot ABI.

The source job fails on unsupported constructs and uploads Bake diagnostics.
It does not substitute a smaller kernel build or execute the OS in TypeScript.
No generated whole-OS WAT or working WASM distribution is claimed yet. Booting
with `.thistle.base`, reaching input and checking `/bin/dd` remain required
acceptance checks once the OS ABI is available.

Baguette, Bake, Thistle and the canonical mikuOS source remain immutable.
Transpilation corrections belong in Leek. A demonstrated canonical source defect
requires a separate `mikuOS-thistle` branch and its full CI.
