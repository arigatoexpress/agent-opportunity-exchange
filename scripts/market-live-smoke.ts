import { buildLiveMarketUpstreamProof, summarizeLiveMarketProof } from "../src/live-market-proof.js";

const args = process.argv.slice(2);
const json = args.includes("--json");
const ticker = readArg("--ticker") ?? "AAPL";
const seriesIds = (readArg("--series") ?? "FEDFUNDS,UNRATE,CPIAUCSL")
  .split(",")
  .map((seriesId) => seriesId.trim())
  .filter(Boolean);

const proof = await buildLiveMarketUpstreamProof({
  ticker,
  seriesIds,
  filingLimit: 3,
  seriesLimit: 2,
});

if (json) {
  console.log(JSON.stringify(proof, null, 2));
} else {
  console.log(summarizeLiveMarketProof(proof));
}

if (proof.overall === "fail") {
  process.exitCode = 1;
}

function readArg(name: string): string | undefined {
  const index = args.indexOf(name);
  if (index === -1) return undefined;
  return args[index + 1];
}
