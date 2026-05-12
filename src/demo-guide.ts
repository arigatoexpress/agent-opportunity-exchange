export const DEMO_GUIDE_SCHEMA_ID = "aoe.demo_guide.v1";

export function buildDemoGuide(baseUrl = "") {
  const origin = baseUrl || "https://agent-opportunity-exchange-trgi34bxuq-uc.a.run.app";
  return {
    schemaId: DEMO_GUIDE_SCHEMA_ID,
    title: "Agent Opportunity Exchange demo guide",
    generatedAt: new Date().toISOString(),
    recommendedBaseUrl: origin,
    oneLine:
      "Agent Opportunity Exchange is a paid intelligence artifact broker for agents: discover, quote, preflight, and unlock source-cited derived packets over an x402-shaped API.",
    videoFlow: [
      { label: "Public workbench", method: "GET", path: "/" },
      { label: "Health and safety flags", method: "GET", path: "/health" },
      { label: "Buyer product contracts", method: "GET", path: "/v1/products" },
      { label: "Adapter and contract readiness", method: "GET", path: "/v1/readiness" },
      { label: "x402 rail posture", method: "GET", path: "/v1/x402/status" },
      { label: "Live SEC/FRED upstream proof", method: "POST", path: "/v1/streams/market-context/live-proof" },
      { label: "Defensive cyber preview", method: "POST", path: "/v1/adapters/cyber/vuln-priority/preview" },
      { label: "Separate WFIGS wildfire lane", method: "POST", path: "/v1/adapters/wildfire/wfigs-perimeters/preview" },
      { label: "402 paid artifact gate", method: "GET", path: "/v1/artifacts/aoe_cyber_kev_epss_priority/content" },
    ],
    curlExamples: [
      `curl -fsS ${origin}/health`,
      `curl -fsS ${origin}/v1/readiness`,
      `curl -fsS ${origin}/v1/x402/status`,
      `curl -fsS -X POST ${origin}/v1/streams/market-context/live-proof -H 'content-type: application/json' -d '{"ticker":"AAPL","seriesIds":["FEDFUNDS","UNRATE","CPIAUCSL"],"filingLimit":3,"seriesLimit":2}'`,
      `curl -fsS -X POST ${origin}/v1/adapters/cyber/vuln-priority/preview -H 'content-type: application/json' -d '{"cves":["CVE-2023-34362","CVE-2024-3094"]}'`,
      `curl -sS ${origin}/v1/artifacts/aoe_cyber_kev_epss_priority/content`,
      `curl -fsS ${origin}/v1/artifacts/aoe_cyber_kev_epss_priority/content -H 'X-AOE-Payment: simulated:<workOrderId>'`,
    ],
    say: [
      "Payment is access control, not permission to resell raw public data.",
      "The live market proof route reaches SEC/FRED now and returns mockDataUsed=false.",
      "The cyber preview ranks buyer-provided CVEs defensively from CISA KEV, EPSS, and NVD.",
      "Wildfire/WFIGS is separate read-only situational awareness, not an x402 emergency command product.",
      "The x402 flow is simulated by default and Base Sepolia testnet only when explicitly configured.",
    ],
    avoidClaims: [
      "live settlement",
      "mainnet payments",
      "investment advice, price targets, or trade execution",
      "unauthorized scanning or exploit output",
      "incident command, dispatch, alert sending, flight authorization, or drone action",
      "payment grants raw-source redistribution rights",
      "first or only unless separately proven",
    ],
    safety: {
      liveSettlementAllowed: false,
      externalSideEffectsAllowed: false,
      marketOutput: "research_only_no_advice_no_execution",
      cyberOutput: "defensive_only_no_exploit_payloads_no_scans",
      wildfireOutput: "separate_read_only_no_dispatch_no_flight_authorization",
    },
  };
}

function escapeHtml(value: unknown): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderDemoGuideHtml(baseUrl = ""): string {
  const guide = buildDemoGuide(baseUrl);
  const flow = guide.videoFlow
    .map((item) => `<li><code>${escapeHtml(item.method)} ${escapeHtml(item.path)}</code><span>${escapeHtml(item.label)}</span></li>`)
    .join("");
  const examples = guide.curlExamples.map((example) => `<pre>${escapeHtml(example)}</pre>`).join("");
  const say = guide.say.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  const avoid = guide.avoidClaims.map((item) => `<li>${escapeHtml(item)}</li>`).join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Agent Opportunity Exchange - Demo Guide</title>
  <style>
    :root { --bg:#f4f7f5; --panel:#fff; --ink:#111817; --muted:#5d6964; --line:#d8e0dc; --teal:#08756f; --red:#b3261e; --code:#101816; }
    * { box-sizing: border-box; }
    body { margin:0; color:var(--ink); background:linear-gradient(135deg,#f7faf8,#eef4f1 48%,#f7f8f4); font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; letter-spacing:0; }
    main { width:min(1120px, calc(100vw - 32px)); margin:0 auto; padding:28px 0 44px; display:grid; gap:16px; }
    header, section { border:1px solid var(--line); border-radius:8px; background:rgba(255,255,255,.9); padding:18px; box-shadow:0 18px 44px rgba(17,24,23,.08); }
    h1, h2, p { margin:0; }
    h1 { font-size:34px; line-height:1.04; max-width:820px; }
    h2 { font-size:19px; margin-bottom:10px; }
    p { color:var(--muted); line-height:1.52; margin-top:10px; }
    a { color:var(--teal); font-weight:750; }
    .grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
    ul { margin:0; padding-left:20px; color:var(--muted); line-height:1.55; }
    li { margin:7px 0; }
    li span { margin-left:8px; }
    code, pre { font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace; letter-spacing:0; }
    code { color:var(--teal); }
    pre { white-space:pre-wrap; overflow:auto; background:var(--code); color:#e9f3ef; border-radius:8px; padding:12px; margin:10px 0 0; font-size:12px; line-height:1.45; }
    .bad li::marker { color:var(--red); }
    .good li::marker { color:var(--teal); }
    .pillrow { display:flex; flex-wrap:wrap; gap:8px; margin-top:14px; }
    .pill { border:1px solid var(--line); border-radius:999px; padding:6px 9px; color:var(--muted); background:#fbfdfc; font-size:12px; }
    @media (max-width:800px) { .grid { grid-template-columns:1fr; } h1 { font-size:28px; } }
  </style>
</head>
<body>
  <main>
    <header>
      <h1>${escapeHtml(guide.title)}</h1>
      <p>${escapeHtml(guide.oneLine)}</p>
      <p>Production base URL: <a href="${escapeHtml(guide.recommendedBaseUrl)}">${escapeHtml(guide.recommendedBaseUrl)}</a></p>
      <div class="pillrow">
        <span class="pill">mockDataUsed=false proof</span>
        <span class="pill">simulated x402 by default</span>
        <span class="pill">source-rights first</span>
        <span class="pill">no live settlement</span>
      </div>
    </header>
    <section>
      <h2>Video Flow</h2>
      <ul>${flow}</ul>
    </section>
    <section>
      <h2>Copy-Paste Commands</h2>
      ${examples}
    </section>
    <div class="grid">
      <section>
        <h2>Say This</h2>
        <ul class="good">${say}</ul>
      </section>
      <section>
        <h2>Avoid These Claims</h2>
        <ul class="bad">${avoid}</ul>
      </section>
    </div>
    <section>
      <h2>Machine-Readable Guide</h2>
      <p>Agents and judges can fetch the same guide as JSON at <code>/v1/demo-guide</code>.</p>
    </section>
  </main>
</body>
</html>`;
}
