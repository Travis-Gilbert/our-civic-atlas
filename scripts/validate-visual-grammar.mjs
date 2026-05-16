import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const [css, grammar] = await Promise.all([
    readFile(
      path.join(root, "src/app/open-flint-atlas/atlas.css"),
      "utf8",
    ),
    readFile(
      path.join(root, "src/lib/atlas/visual-grammar.ts"),
      "utf8",
    ),
  ]);

  for (const token of [
    "--atlas-state-current",
    "--atlas-state-review",
    "--atlas-state-historical",
    "--atlas-state-proposed",
    "--atlas-state-comment",
    "--atlas-state-poll",
    "--atlas-state-safety",
    "--atlas-state-live",
  ]) {
    assert(css.includes(token), `atlas.css is missing ${token}`);
  }

  for (const stateId of [
    "current",
    "review",
    "historical",
    "proposed",
    "comment",
    "poll",
    "safety",
    "source",
    "live_signal",
  ]) {
    assert(
      grammar.includes(`id: "${stateId}"`),
      `visual-grammar.ts is missing semantic state ${stateId}`,
    );
  }

  assert(
    grammar.includes("ATLAS_STATE_LEGEND_ITEMS"),
    "visual-grammar.ts must export legend items",
  );

  console.log("Validated atlas visual grammar tokens and semantic states.");
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
