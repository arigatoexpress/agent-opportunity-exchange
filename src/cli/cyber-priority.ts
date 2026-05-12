import { readFile, writeFile } from "node:fs/promises";
import { buildCyberInventoryPriorityPreviewFromContext, buildVulnPriorityReport } from "../adapters/cyber.js";
import { parseCyberInventoryInput } from "../inputs/cyber-inventory.js";
import { renderCyberInventoryPriorityHtml, renderCyberPriorityHtml } from "../reporting/cyber-html.js";

interface CliOptions {
  cves: string[];
  input?: string;
  output?: string;
  format: "json" | "html";
}

const CVE_PATTERN = /^CVE-\d{4}-\d{4,}$/i;

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const inputText = options.input ? await readFile(options.input, "utf8") : undefined;
  const inventory = inputText ? parseCyberInventoryInput(inputText, options.input) : undefined;
  const useInventoryReport = Boolean(inventory && (inventory.assetRows > 0 || inventory.buyer));
  const cves = inventory ? inventory.cves : options.cves;
  const normalized = [...new Set(cves.map((cve) => cve.toUpperCase()))];

  if (normalized.length === 0) {
    throw new Error("Provide CVEs as positional args or with --input <json-file>.");
  }

  const invalid = normalized.filter((cve) => !CVE_PATTERN.test(cve));
  if (invalid.length > 0) {
    throw new Error(`Invalid CVE ids: ${invalid.join(", ")}`);
  }

  const report = useInventoryReport ? await buildCyberInventoryPriorityPreviewFromContext(inventory!) : await buildVulnPriorityReport(normalized);
  const output =
    options.format === "html"
      ? useInventoryReport
        ? renderCyberInventoryPriorityHtml(report as Awaited<ReturnType<typeof buildCyberInventoryPriorityPreviewFromContext>>)
        : renderCyberPriorityHtml(report as Awaited<ReturnType<typeof buildVulnPriorityReport>>)
      : `${JSON.stringify(report, null, 2)}\n`;
  if (options.output) {
    await writeFile(options.output, output, "utf8");
  } else {
    process.stdout.write(output);
  }
}

function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = { cves: [], format: "json" };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--input" || arg === "-i") {
      options.input = args[++index];
      continue;
    }
    if (arg === "--output" || arg === "-o") {
      options.output = args[++index];
      continue;
    }
    if (arg === "--format" || arg === "-f") {
      const format = args[++index];
      if (format !== "json" && format !== "html") {
        throw new Error("--format must be json or html");
      }
      options.format = format;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }
    options.cves.push(arg);
  }
  return options;
}

function printHelp() {
  console.log(`Usage:
  npm run cyber:priority -- CVE-2021-44228 CVE-2023-34362
  npm run cyber:priority -- --input ./cves.json --output ./report.json
  npm run cyber:priority -- --input ./asset-inventory.csv --output ./inventory-report.json
  npm run cyber:priority -- --input ./asset-inventory.csv --format html --output ./inventory-report.html
  npm run cyber:priority -- --format html --output ./cve-report.html CVE-2021-44228

This command performs read-only public API lookups against CISA KEV, FIRST EPSS,
and NVD. Inventory files must be buyer-authorized; the command does not scan
targets or return exploit instructions.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
