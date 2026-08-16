import { build } from "esbuild";
import { readdirSync, statSync, rmSync } from "node:fs";
import { join } from "node:path";

// Clean stale artifacts (deleted sources would otherwise linger from prior builds).
rmSync("build", { recursive: true, force: true });

// Collect all .ts sources under src/, excluding tests (tsc type-checks them separately).
function collectTsFiles(dir) {
    const out = [];
    for (const name of readdirSync(dir)) {
        const full = join(dir, name);
        if (statSync(full).isDirectory()) {
            out.push(...collectTsFiles(full));
        } else if (name.endsWith(".ts") && !name.endsWith(".test.ts")) {
            out.push(full);
        }
    }
    return out;
}

// 1. Bundle the generated Prisma client into a single file. Its internal imports are
//    extensionless (`./internal/class`) and only resolve under a bundler; bundling is
//    safe because the client is self-contained (no Sapphire pieces).
await build({
    entryPoints: ["src/generated/prisma/client.ts"],
    bundle: true,
    outfile: "build/generated/prisma/client.js",
    format: "esm",
    platform: "node",
    packages: "external",
    target: "node22",
    logLevel: "info",
});

// 2. Transpile the app (no bundle — Sapphire discovers pieces from per-file output),
//    excluding the generated client (already bundled above) and tests.
const generatedPrefix = join("src", "generated");
const appFiles = collectTsFiles("src").filter((f) => !f.startsWith(generatedPrefix));

await build({
    entryPoints: appFiles,
    outdir: "build",
    outbase: "src",
    format: "esm",
    platform: "node",
    packages: "external",
    target: "node22",
    sourcemap: false,
    logLevel: "info",
});
