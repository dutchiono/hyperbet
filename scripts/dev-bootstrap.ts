import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

import { runDoctor } from "./dev-doctor";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function buildToolPath(): string {
  const userProfile = process.env.USERPROFILE ?? process.env.HOME ?? "";
  const hints = [
    process.env.PATH ?? "",
    userProfile ? path.join(userProfile, ".cargo", "bin") : "",
    userProfile ? path.join(userProfile, ".bun", "bin") : "",
    userProfile
      ? path.join(userProfile, ".local", "share", "solana", "install", "active_release", "bin")
      : "",
  ].filter(Boolean);
  return hints.join(path.delimiter);
}

function run(command: string, args: string[], cwd = rootDir): void {
  const result = spawnSync(command, args, {
    cwd,
    stdio: "inherit",
    env: {
      ...process.env,
      PATH: buildToolPath(),
    },
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

const doctor = runDoctor();
if (doctor.missingTools.length > 0 || doctor.versionMismatches.length > 0) {
  console.error("Refusing to bootstrap until required tools and pinned versions match.");
  process.exit(1);
}

run("bun", ["install"], rootDir);

if (process.platform === "win32") {
  const nestedInstalls = [
    "packages/hyperbet-solana/anchor",
    "packages/hyperbet-solana/app",
    "packages/hyperbet-bsc/app",
    "packages/hyperbet-avax/app",
  ];
  for (const cwd of nestedInstalls) {
    run("bun", ["install"], path.join(rootDir, cwd));
  }
} else {
  run("bash", [
    "scripts/ci-install-verified.sh",
    "root",
    "hyperbet-solana-anchor",
    "hyperbet-solana-app",
    "hyperbet-solana-keeper",
    "hyperbet-bsc-app",
    "hyperbet-bsc-keeper",
    "hyperbet-avax-app",
    "hyperbet-avax-keeper",
  ]);
}
