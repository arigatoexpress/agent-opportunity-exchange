import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const forbiddenRuntimeClaims = [
  "liveSettlementAllowed: true",
  "\"liveSettlementAllowed\": true",
  "externalSideEffectsAllowed: true",
  "\"externalSideEffectsAllowed\": true",
];

const self = new URL(import.meta.url).pathname;
const ignoredDirs = new Set([".git", ".playwright-cli", "coverage", "dist", "node_modules", "playwright-report", "test-results"]);
const files = walk(root).filter((file) => file !== self);

const violations = [];
for (const file of files) {
  const text = readFileSync(file, "utf8");
  for (const claim of forbiddenRuntimeClaims) {
    if (text.includes(claim)) {
      violations.push(`${file}: forbidden runtime claim ${claim}`);
    }
  }
}

if (violations.length > 0) {
  console.error(violations.join("\n"));
  process.exit(1);
}

console.log(`Boundary check passed for ${files.length} files.`);

function walk(dir) {
  return readdirSync(dir).flatMap((entry) => {
    if (ignoredDirs.has(entry)) return [];
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) return walk(path);
    if (!stat.isFile()) return [];
    return [path];
  });
}
