export function renderPublicFrontend(): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#f4f7f5">
  <link rel="icon" href="data:,">
  <title>Agent Opportunity Exchange - Evidence Streams</title>
  <style>
    :root {
      --bg: #f4f7f5;
      --panel: #ffffff;
      --panel-soft: #f9fbfa;
      --panel-strong: #eef4f0;
      --ink: #111817;
      --muted: #5d6964;
      --line: #d8e0dc;
      --line-strong: #aebbb5;
      --green: #1f7a52;
      --teal: #08756f;
      --blue: #285da8;
      --violet: #7257a5;
      --red: #b3261e;
      --amber: #8c6200;
      --code: #0f1514;
      --code-line: #25312e;
      --shadow: 0 18px 44px rgba(17, 24, 23, 0.08);
    }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      min-height: 100%;
      color: var(--ink);
      background:
        linear-gradient(90deg, rgba(17, 24, 23, 0.04) 1px, transparent 1px),
        linear-gradient(180deg, rgba(17, 24, 23, 0.03) 1px, transparent 1px),
        linear-gradient(135deg, #f7faf8 0%, #eef4f1 48%, #f7f8f4 100%);
      background-size: 48px 48px, 48px 48px, auto;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      letter-spacing: 0;
    }
    button, input, select, a { font: inherit; }
    a { text-decoration: none; }
    h1, h2, h3, p, dl, dd { margin: 0; }
    .shell {
      width: min(1500px, calc(100vw - 32px));
      margin: 0 auto;
      padding: 16px 0 28px;
    }
    header {
      display: grid;
      grid-template-columns: minmax(280px, 1fr) auto;
      gap: 16px;
      align-items: center;
      min-height: 64px;
      border-bottom: 1px solid var(--line);
      margin-bottom: 14px;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 14px;
      min-width: 0;
    }
    .mark {
      width: 38px;
      height: 38px;
      border: 1px solid rgba(255, 255, 255, .72);
      border-radius: 8px;
      background:
        linear-gradient(135deg, transparent 0 48%, rgba(255, 255, 255, .86) 49% 52%, transparent 53%),
        linear-gradient(145deg, var(--teal), var(--blue));
      box-shadow: 0 10px 24px rgba(8, 117, 111, 0.2);
      flex: 0 0 auto;
    }
    .brand strong {
      display: block;
      font-size: 17px;
      line-height: 1.1;
    }
    .brand span {
      display: block;
      color: var(--muted);
      font-size: 12px;
      margin-top: 3px;
    }
    .top-actions {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      justify-content: flex-end;
    }
    .btn {
      min-height: 38px;
      border: 1px solid var(--line-strong);
      border-radius: 8px;
      background: var(--panel);
      color: var(--ink);
      padding: 0 13px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      white-space: nowrap;
    }
    .btn:hover { border-color: var(--teal); }
    .btn.primary {
      background: var(--ink);
      border-color: var(--ink);
      color: white;
    }
    .btn.primary:hover {
      background: var(--teal);
      border-color: var(--teal);
    }
    .workspace {
      min-height: calc(100vh - 106px);
      display: grid;
      grid-template-columns: 292px minmax(520px, 1fr) 360px;
      gap: 14px;
      align-items: start;
    }
    .rail, .canvas, .inspector, .lane {
      border: 1px solid var(--line);
      border-radius: 8px;
      background: rgba(255, 255, 255, .86);
      box-shadow: var(--shadow);
      min-width: 0;
      overflow: hidden;
    }
    .rail {
      display: grid;
      grid-template-rows: auto auto minmax(0, 1fr);
      min-height: 0;
    }
    .inspector {
      display: grid;
      grid-template-rows: auto minmax(0, 1fr);
      min-height: 0;
    }
    .canvas {
      display: grid;
      grid-template-rows: auto auto auto auto auto minmax(420px, 620px) auto;
      min-height: 0;
    }
    .panel-head {
      display: grid;
      gap: 9px;
      padding: 16px;
      border-bottom: 1px solid var(--line);
      background: rgba(249, 251, 250, .9);
    }
    .eyebrow {
      color: var(--teal);
      font-size: 11px;
      font-weight: 850;
      text-transform: uppercase;
    }
    h1 {
      font-size: 28px;
      line-height: 1.05;
      max-width: 760px;
    }
    h2 {
      font-size: 22px;
      line-height: 1.15;
    }
    h3 {
      font-size: 14px;
      line-height: 1.25;
    }
    .lead {
      color: var(--muted);
      font-size: 14px;
      line-height: 1.48;
      max-width: 820px;
    }
    .status-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 1px;
      background: var(--line);
      border-bottom: 1px solid var(--line);
    }
    .status-cell {
      min-height: 74px;
      background: rgba(255, 255, 255, .78);
      padding: 12px;
    }
    .status-cell dt {
      color: var(--muted);
      font-size: 10px;
      font-weight: 850;
      text-transform: uppercase;
      margin-bottom: 7px;
    }
    .status-cell dd {
      font-size: 22px;
      font-weight: 830;
      line-height: 1;
    }
    .ok { color: var(--green); }
    .warn { color: var(--amber); }
    .danger { color: var(--red); }
    .blue { color: var(--blue); }
    .violet { color: var(--violet); }
    .rail-body, .inspector-body {
      min-height: 0;
      overflow: auto;
      padding: 12px;
      display: grid;
      gap: 12px;
      align-content: start;
    }
    .section-label {
      display: grid;
      gap: 4px;
      padding: 3px 2px 0;
    }
    .section-label span {
      color: var(--muted);
      font-size: 11px;
      font-weight: 850;
      text-transform: uppercase;
    }
    .section-label strong {
      font-size: 13px;
      line-height: 1.25;
    }
    .tagrow {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }
    .tag {
      border: 1px solid var(--line);
      border-radius: 999px;
      background: #fbfdfc;
      color: var(--muted);
      font-size: 11px;
      line-height: 1;
      padding: 5px 7px;
    }
    #products {
      display: grid;
      gap: 8px;
    }
    .product-table.table-head {
      display: none;
    }
    .product-row {
      display: grid;
      gap: 9px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: rgba(255, 255, 255, .78);
      padding: 11px;
    }
    .product-row > div {
      min-width: 0;
      overflow-wrap: anywhere;
    }
    .product-title {
      font-weight: 790;
      line-height: 1.25;
    }
    .product-action {
      width: 100%;
      min-height: 34px;
      padding: 0 9px;
      font-size: 12px;
    }
    .small {
      color: var(--muted);
      font-size: 12px;
      line-height: 1.45;
    }
    .price {
      color: var(--green);
      font-size: 20px;
      font-weight: 850;
      line-height: 1;
    }
    .mono, .route {
      font: 12px/1.45 ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace;
      overflow-wrap: anywhere;
    }
    .route { color: var(--blue); }
    .schema { color: var(--teal); }
    .proof-strip {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 1px;
      background: var(--line);
      border-bottom: 1px solid var(--line);
    }
    .proof-cell {
      min-height: 104px;
      padding: 13px 14px;
      background: rgba(255, 255, 255, .78);
    }
    .proof-cell span {
      display: block;
      color: var(--muted);
      font-size: 11px;
      font-weight: 850;
      text-transform: uppercase;
      margin-bottom: 8px;
    }
    .proof-cell strong {
      display: block;
      font-size: 18px;
      line-height: 1.1;
      margin-bottom: 7px;
    }
    .stream-spec {
      display: grid;
      grid-template-columns: minmax(0, 1.2fr) repeat(3, minmax(118px, .5fr));
      border-bottom: 1px solid var(--line);
      background: var(--panel);
    }
    .spec-cell {
      min-width: 0;
      padding: 13px 14px;
      border-right: 1px solid var(--line);
    }
    .spec-cell:last-child { border-right: 0; }
    .spec-cell span {
      display: block;
      color: var(--muted);
      font-size: 11px;
      font-weight: 850;
      text-transform: uppercase;
      margin-bottom: 7px;
    }
    .controls {
      display: grid;
      grid-template-columns: minmax(170px, .85fr) minmax(130px, .55fr) minmax(0, 1fr) auto auto;
      gap: 10px;
      align-items: end;
      padding: 12px;
      border-bottom: 1px solid var(--line);
      background: rgba(249, 251, 250, .72);
    }
    label {
      display: block;
      color: var(--muted);
      font-size: 11px;
      font-weight: 850;
      text-transform: uppercase;
      margin-bottom: 6px;
    }
    input, select {
      width: 100%;
      min-height: 40px;
      border: 1px solid var(--line-strong);
      border-radius: 8px;
      background: white;
      color: var(--ink);
      padding: 9px 10px;
    }
    .request-line {
      display: grid;
      grid-template-columns: 54px minmax(0, 1fr);
      border: 1px solid var(--line);
      border-radius: 8px;
      overflow: hidden;
      background: var(--panel);
      min-height: 40px;
      height: 40px;
      max-height: 40px;
      align-self: end;
    }
    .request-line strong {
      display: grid;
      place-items: center;
      color: white;
      background: var(--blue);
      font-size: 11px;
    }
    .request-line span {
      padding: 9px 10px;
      min-width: 0;
    }
    .output-wrap {
      display: grid;
      grid-template-rows: auto auto minmax(0, 1fr);
      min-width: 0;
      min-height: 0;
      height: 100%;
    }
    .proof-summary {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 1px;
      background: var(--line);
      border-bottom: 1px solid var(--line);
    }
    .summary-cell {
      min-height: 86px;
      padding: 12px 14px;
      background: rgba(255, 255, 255, .82);
      min-width: 0;
    }
    .summary-cell span {
      display: block;
      color: var(--muted);
      font-size: 10px;
      font-weight: 850;
      text-transform: uppercase;
      margin-bottom: 7px;
    }
    .summary-cell strong {
      display: block;
      font-size: 17px;
      line-height: 1.15;
      margin-bottom: 6px;
      overflow-wrap: anywhere;
    }
    .output-toolbar {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 12px;
      align-items: center;
      min-height: 48px;
      padding: 0 14px;
      border-bottom: 1px solid var(--code-line);
      background: var(--code);
      color: #dce7e0;
    }
    #outputTitle {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 12px;
    }
    .schema-pill {
      justify-self: end;
      border: 1px solid #39504a;
      border-radius: 999px;
      color: #a8dad2;
      padding: 5px 8px;
      font-size: 11px;
      max-width: 250px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    pre {
      margin: 0;
      min-height: 0;
      overflow: auto;
      padding: 15px;
      background: #111817;
      color: #dce7e0;
      font: 12px/1.55 ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace;
    }
    .decision-card, .source-list, .boundary-box {
      border: 1px solid var(--line);
      border-radius: 8px;
      background: rgba(255, 255, 255, .76);
      overflow: hidden;
    }
    .decision-card {
      display: grid;
      gap: 1px;
      background: var(--line);
    }
    .decision-row {
      display: grid;
      gap: 5px;
      padding: 11px;
      background: rgba(255, 255, 255, .82);
      min-width: 0;
    }
    .decision-row span {
      color: var(--muted);
      font-size: 10px;
      font-weight: 850;
      text-transform: uppercase;
    }
    .source-list {
      display: grid;
      gap: 1px;
      background: var(--line);
    }
    .rail-map {
      display: grid;
      gap: 1px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--line);
      overflow: hidden;
    }
    .rail-row {
      display: grid;
      gap: 5px;
      padding: 11px;
      background: rgba(255, 255, 255, .82);
      min-width: 0;
    }
    .rail-row strong {
      min-width: 0;
      overflow-wrap: anywhere;
    }
    .rail-row span {
      color: var(--muted);
      font-size: 11px;
      line-height: 1.35;
    }
    .source-row {
      display: grid;
      gap: 4px;
      padding: 11px;
      background: rgba(255, 255, 255, .82);
      min-width: 0;
    }
    .source-row strong, .source-row span {
      min-width: 0;
      overflow-wrap: anywhere;
    }
    .boundary-box {
      display: grid;
      gap: 10px;
      padding: 12px;
    }
    .lane-strip {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 1px;
      background: var(--line);
      border-top: 1px solid var(--line);
    }
    .lane-cell {
      min-height: 108px;
      padding: 12px;
      background: rgba(255, 255, 255, .78);
    }
    .footer {
      color: var(--muted);
      font-size: 12px;
      padding-top: 14px;
    }
    @media (max-width: 1260px) {
      .workspace {
        grid-template-columns: 280px minmax(0, 1fr);
      }
      .inspector {
        grid-column: 1 / -1;
        min-height: auto;
      }
      .inspector-body {
        grid-template-columns: repeat(3, minmax(0, 1fr));
        align-items: start;
      }
    }
    @media (max-width: 920px) {
      .workspace, header, .controls, .proof-strip, .stream-spec, .proof-summary, .lane-strip {
        grid-template-columns: 1fr;
      }
      .inspector-body {
        grid-template-columns: 1fr;
      }
      .top-actions {
        justify-content: flex-start;
      }
      .spec-cell {
        border-right: 0;
        border-bottom: 1px solid var(--line);
      }
      .spec-cell:last-child {
        border-bottom: 0;
      }
      h1 {
        font-size: 30px;
      }
    }
    @media (max-width: 620px) {
      .shell {
        width: min(100vw - 18px, 1500px);
        padding-top: 10px;
      }
      .status-grid {
        grid-template-columns: 1fr;
      }
      .schema-pill {
        display: none;
      }
    }
  </style>
</head>
<body>
  <div class="shell">
    <header>
      <div class="brand">
        <div class="mark" aria-hidden="true"></div>
        <div>
          <strong>Agent Opportunity Exchange</strong>
          <span>Evidence Streams buyer workbench</span>
        </div>
      </div>
      <div class="top-actions">
        <a class="btn" href="/demo">Demo Guide</a>
        <button class="btn" id="refresh">Refresh Evidence</button>
        <button class="btn" id="showContracts">Show Contracts</button>
        <button class="btn" data-action="cyber">Run Cyber Preview</button>
        <button class="btn primary" data-action="markets">Run Market Preview</button>
      </div>
    </header>

    <main class="workspace">
      <aside class="rail" aria-labelledby="storefront-title">
        <div class="panel-head">
          <div class="eyebrow">Evidence storefront</div>
          <h1 id="storefront-title">Show buyers the proof before asking them to pay.</h1>
          <p class="lead">A rights-cleared x402 storefront for paid artifacts, public previews, quotes, readiness, and source proof. Simulated by default; Base Sepolia x402 testnet only when explicitly configured.</p>
          <div class="tagrow">
            <span class="tag">Proof before purchase</span>
            <span class="tag">No live settlement</span>
            <span class="tag">No external sends</span>
          </div>
        </div>

        <dl class="status-grid" aria-label="System readiness">
          <div class="status-cell"><dt>Live adapters</dt><dd id="liveAdapters">-</dd></div>
          <div class="status-cell"><dt>Source records</dt><dd id="sourceRecords">-</dd></div>
          <div class="status-cell"><dt>Paid products</dt><dd id="paidProducts">-</dd></div>
          <div class="status-cell"><dt>x402 rail</dt><dd class="ok" id="x402Rail">loading</dd></div>
        </dl>

        <div class="rail-body">
          <div class="section-label">
            <span>Buyer segment</span>
            <strong>Who has a reason to pay first</strong>
          </div>
          <div class="product-table table-head" aria-hidden="true">
            <div>Product</div>
            <div>Buyer segment</div>
            <div>Evidence basis</div>
            <div>Price</div>
            <div>Button output</div>
          </div>
          <div id="products" aria-live="polite"></div>
          <p class="small">Product buttons return source IDs, rights, preview, quote, route, and payment posture before any paid content is requested.</p>
        </div>
      </aside>

      <section class="canvas" id="workbench" aria-labelledby="workbench-title">
        <div class="panel-head">
          <div class="eyebrow">Live stream workbench</div>
          <h2 id="workbench-title">Run a route, inspect the exact proof.</h2>
          <p class="lead">Every button output names the route, request body, value signal, evidence basis, and safety posture a buyer or agent receives.</p>
        </div>

        <div class="proof-strip" aria-label="Proof before purchase">
          <div class="proof-cell">
            <span>Provenance</span>
            <strong id="sourceQuality">Loading source rights</strong>
            <p class="small" id="sourceQualityNote">Official owners, access modes, and rights envelopes come from /v1/sources.</p>
          </div>
          <div class="proof-cell">
            <span>Readiness</span>
            <strong id="readinessSignal">Loading adapters</strong>
            <p class="small">Only live read-only adapters are marketed as currently runnable.</p>
          </div>
          <div class="proof-cell">
            <span>Value Signal</span>
            <strong>Preview plus quote</strong>
            <p class="small">Inspect proof before simulated or testnet access.</p>
          </div>
          <div class="proof-cell">
            <span>Payment Posture</span>
            <strong class="ok" id="paymentPosture">Loading x402 status</strong>
            <p class="small" id="paymentPostureNote">No live settlement, money movement, or production side effects are enabled.</p>
          </div>
        </div>

        <div class="stream-spec" aria-label="Featured stream contract">
          <div class="spec-cell">
            <span>Featured live proof route</span>
            <div class="route">POST /v1/streams/market-context/live-proof</div>
          </div>
          <div class="spec-cell">
            <span>Mock data posture</span>
            <div class="price">false</div>
          </div>
          <div class="spec-cell">
            <span>Schema</span>
            <div class="mono schema">aoe.market_live_upstream_proof.v1</div>
          </div>
          <div class="spec-cell">
            <span>Sources</span>
            <div class="mono">SEC EDGAR + FRED</div>
          </div>
        </div>

        <div class="controls">
          <div>
            <label for="previewKind">Route</label>
            <select id="previewKind">
              <option value="liveMarketProof">Live SEC/FRED Upstream Proof</option>
              <option value="marketContext">SEC + Macro Context</option>
              <option value="cyberInventory">Cyber Inventory Proof</option>
              <option value="cyber">Cyber CVE List</option>
              <option value="wildfire">Wildfire WFIGS Perimeters</option>
              <option value="alerts">NWS Fire Weather Alerts</option>
              <option value="sec">SEC Recent Filings</option>
              <option value="fred">FRED Macro Series</option>
            </select>
          </div>
          <div>
            <label for="previewInput">Input</label>
            <input id="previewInput" value="AAPL">
          </div>
          <div class="request-line">
            <strong id="methodLabel">POST</strong>
            <span class="route" id="routeLabel">/v1/streams/market-context/live-proof</span>
          </div>
          <button class="btn primary" id="runPreview">Run Preview</button>
          <button class="btn" id="inspectFeatured">Inspect Featured Proof</button>
        </div>

        <div class="output-wrap">
          <div class="proof-summary" id="proofSummary" aria-live="polite">
            <div class="summary-cell">
              <span>Live Proof</span>
              <strong>Awaiting preview</strong>
              <p class="small">Run the market route to read current upstream proof.</p>
            </div>
            <div class="summary-cell">
              <span>Mock Data</span>
              <strong>Unknown</strong>
              <p class="small">Live proof must return false.</p>
            </div>
            <div class="summary-cell">
              <span>Upstreams</span>
              <strong>SEC + FRED</strong>
              <p class="small">Status appears here after the route returns.</p>
            </div>
            <div class="summary-cell">
              <span>Evidence Hash</span>
              <strong>Pending</strong>
              <p class="small">SHA-256 report hash binds normalized records.</p>
            </div>
          </div>
          <div class="output-toolbar">
            <span id="outputTitle">Live SEC/FRED proof response</span>
            <span class="schema-pill" id="schemaLabel">aoe.market_live_upstream_proof.v1</span>
          </div>
          <pre id="output" tabindex="-1">Loading readiness...</pre>
        </div>

        <div class="lane-strip" aria-label="Primary buyer lanes">
          <div class="lane-cell"><h3>MSPs and SMB security</h3><p class="small">Pay for a fix-today CVE packet backed by CISA KEV, EPSS, NVD, and remediation context.</p></div>
          <div class="lane-cell"><h3>Market research agents</h3><p class="small">Pay for explainable SEC plus macro evidence, with research-only caveats and no execution.</p></div>
          <div class="lane-cell"><h3>Agent builders</h3><p class="small">Pay for source-cited API change radar that separates tested contracts from stale generated code.</p></div>
        </div>
      </section>

      <aside class="inspector" aria-labelledby="inspector-title">
        <div class="panel-head">
          <div class="eyebrow">Provenance and readiness</div>
          <h2 id="inspector-title">Visible evidence, visible limits</h2>
          <p class="lead">The inspector follows the active button result and keeps rights, route, source, and boundary context beside the JSON.</p>
        </div>
        <div class="inspector-body">
          <section class="decision-card" aria-label="Active decision proof">
            <div class="decision-row">
              <span>Button output</span>
              <strong id="decisionLabel">Awaiting preview</strong>
            </div>
            <div class="decision-row">
              <span>Route</span>
              <strong class="route" id="decisionRoute">/v1/streams/market-context/live-proof</strong>
            </div>
            <div class="decision-row">
              <span>Evidence basis</span>
              <p class="small" id="decisionProof">Run a preview or inspect proof to update this rail.</p>
            </div>
            <div class="decision-row">
              <span>Value signal</span>
              <p class="small" id="decisionValue">Preview plus quote.</p>
            </div>
          </section>

          <section class="source-list" id="sourceRail" aria-live="polite">
            <div class="source-row"><strong>Loading sources</strong><span class="small">/v1/sources</span><span class="small">Waiting for registry data.</span></div>
          </section>

          <section class="rail-map" id="paymentRailMap" aria-label="x402 payment rail roadmap" aria-live="polite">
            <div class="rail-row">
              <strong>Loading payment rails</strong>
              <span>/v1/x402/status</span>
              <span>Base Sepolia and Solana/Pay.sh roadmap evidence will render here. Roadmap rail: solana-pay-sh-svm-candidate.</span>
            </div>
          </section>

          <section class="boundary-box">
            <div class="eyebrow">Boundary</div>
            <p class="small" id="buttonResultNote">Run Preview calls a live read-only route. Inspect Featured Proof calls artifact preview and quote endpoints only.</p>
            <p class="small">Wildfire routes are visible here only as a separate read-only public-safety research lane. They are not x402 stream products.</p>
            <p class="small">Retail/customer-facing assets, wildfire operations, and live settlement remain outside this storefront.</p>
            <button class="btn" data-action="wildfire">Check Separate Fire Signals</button>
          </section>
        </div>
      </aside>
    </main>

    <div class="footer">Agent Opportunity Exchange public frontend. Retail/customer-facing assets, wildfire operations, and live settlement remain outside this storefront.</div>
  </div>

  <script>
    const output = document.getElementById('output');
    const kind = document.getElementById('previewKind');
    const input = document.getElementById('previewInput');
    const workbench = document.getElementById('workbench');
    const runButton = document.getElementById('runPreview');
    const routeLabel = document.getElementById('routeLabel');
    const methodLabel = document.getElementById('methodLabel');
    const outputTitle = document.getElementById('outputTitle');
    const schemaLabel = document.getElementById('schemaLabel');
    const proofSummary = document.getElementById('proofSummary');
    let activePreviewRequest = 0;
    let userStartedPreview = false;
    let catalogState = { products: [], sources: [], artifacts: [], readiness: null, x402: null, contracts: null };

    const examples = {
      cyberInventory: 'demo-inventory',
      cyber: 'CVE-2021-44228,CVE-2023-34362,CVE-2024-3094',
      liveMarketProof: 'AAPL',
      marketContext: 'AAPL',
      wildfire: 'CO',
      alerts: 'CO',
      sec: 'AAPL',
      fred: 'FEDFUNDS,CPIAUCSL,UNRATE'
    };
    const labels = {
      cyberInventory: 'Cyber Inventory Proof',
      cyber: 'Cyber CVE Priority',
      liveMarketProof: 'Live SEC/FRED Upstream Proof',
      marketContext: 'SEC + Macro Context',
      wildfire: 'Separate Wildfire WFIGS Preview',
      alerts: 'NWS Fire Weather Alerts',
      sec: 'SEC Recent Filings',
      fred: 'FRED Macro Series'
    };
    const routes = {
      cyberInventory: '/v1/adapters/cyber/inventory-priority/preview',
      cyber: '/v1/adapters/cyber/vuln-priority/preview',
      liveMarketProof: '/v1/streams/market-context/live-proof',
      marketContext: '/v1/streams/market-context/preview',
      wildfire: '/v1/adapters/wildfire/wfigs-perimeters/preview',
      alerts: '/v1/adapters/wildfire/alerts/preview',
      sec: '/v1/adapters/markets/sec-filings/preview',
      fred: '/v1/adapters/markets/fred-series/preview'
    };
    const schemas = {
      cyberInventory: 'sapphirealpha.cyber_inventory_priority.preview.v1',
      cyber: 'sapphirealpha.cyber_priority.v1',
      liveMarketProof: 'aoe.market_live_upstream_proof.v1',
      marketContext: 'sapphirealpha.market_context.v1',
      wildfire: 'separate.wfigs_public_preview.v1',
      alerts: 'separate.nws_fire_weather.v1',
      sec: 'sapphirealpha.sec_filings.v1',
      fred: 'sapphirealpha.fred_series.v1'
    };
    const heroActions = {
      cyber: 'cyberInventory',
      wildfire: 'wildfire',
      markets: 'liveMarketProof'
    };
    const buyerSegments = {
      opportunity_intel_pack: 'Grant writers, founders, public-sector consultants',
      cyber_exploited_vuln_priority: 'MSPs, fractional IT, SMB security teams',
      market_regime_evidence_pack: 'Research analysts, operators, market agents',
      developer_api_change_radar: 'Agent builders, DevRel, developer tooling teams'
    };
    const productPreviewMap = {
      cyber_exploited_vuln_priority: 'cyberInventory',
      market_regime_evidence_pack: 'liveMarketProof'
    };
    const proofNotes = {
      cyberInventory: 'Maps a buyer-provided authorized asset inventory to live KEV, EPSS, and NVD priority evidence; no scans or exploit content.',
      cyber: 'Checks a buyer-provided CVE list against live read-only defensive sources; no scanning or exploit content.',
      liveMarketProof: 'Proves current SEC and FRED upstream reachability, freshness, latency, source URLs, hashes, and mockDataUsed=false.',
      marketContext: 'Combines SEC and FRED public-source context for research only; no advice or execution.',
      wildfire: 'Reads public WFIGS perimeter data for planning context only; separate from paid x402 streams.',
      alerts: 'Reads public NWS alert data for fire-weather context only; no alert sends.',
      sec: 'Reads SEC filing metadata and links; no recommendations or trading actions.',
      fred: 'Reads public FRED graph data; production research should add revision-aware ALFRED handling.',
      product: 'Shows pre-payment artifact preview, quote, source ids, rights, and readiness evidence.',
      contracts: 'Exports the buyer-facing OpenAPI and JSON Schema bundle generated from the current product, route, readiness, and x402 registries.'
    };
    const valueSignals = {
      cyberInventory: 'An MSP can show which client assets make each CVE urgent before paying for the full remediation proof packet.',
      cyber: 'A buyer can verify fix-today prioritization logic before paying for a full remediation packet.',
      liveMarketProof: 'A buyer can see that this is real SEC/FRED source data, when it was reached, and what evidence hashes bind the packet.',
      marketContext: 'A buyer can inspect filing/macro evidence shape before paying for the full market evidence pack.',
      wildfire: 'An operator can verify the separate read-only planning lane without treating it as a paid incident product.',
      alerts: 'An operator can verify source freshness and boundary language before using the preview for situational awareness.',
      sec: 'A research buyer can confirm public filing coverage and response shape before buying derived analysis.',
      fred: 'A research buyer can confirm macro series coverage and timestamps before buying packaged context.',
      product: 'A buyer can see what is sourced, what is priced, and what is withheld until simulated/testnet access.',
      contracts: 'A buyer or integrating agent can validate route schemas, payment boundaries, source-rights posture, and no-live-settlement guarantees before implementation.'
    };

    function escapeHtml(value) {
      return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    function updateDecisionRail(context) {
      if (!context) return;
      document.getElementById('decisionLabel').textContent = context.label;
      document.getElementById('decisionRoute').textContent = context.path;
      document.getElementById('decisionProof').textContent = context.proof;
      document.getElementById('decisionValue').textContent = context.valueSignal;
      document.getElementById('buttonResultNote').textContent = context.label + ' returned route, request, value, proof, safety, and response JSON.';
    }

    function shortHash(value) {
      if (!value) return 'Pending';
      return String(value).replace('sha256:', '').slice(0, 12);
    }

    function renderProofSummary(value, context) {
      const safeLabel = context ? context.label : 'Awaiting preview';
      if (value && value.schemaId === 'aoe.market_live_upstream_proof.v1') {
        const sec = value.upstream && value.upstream.sec_edgar ? value.upstream.sec_edgar : {};
        const fred = value.upstream && value.upstream.fred_alfred ? value.upstream.fred_alfred : {};
        const hash = value.reportSummary && value.reportSummary.evidenceProof ? value.reportSummary.evidenceProof.reportHash : null;
        const historicalClaims = value.historicalClaimsPolicy || {};
        const vintageLabel = historicalClaims.revisionAware ? 'Revision aware' : 'ALFRED required';
        const vintageNote = historicalClaims.productionHistoricalClaimsRequire === 'alfred_vintages'
          ? 'Historical claims require ALFRED vintages.'
          : 'Review macro source posture in JSON.';
        proofSummary.innerHTML =
          '<div class="summary-cell"><span>Live Proof</span><strong class="' + (value.overall === 'pass' ? 'ok' : value.overall === 'warn' ? 'warn' : 'danger') + '">' + escapeHtml(value.overall || 'unknown') + '</strong><p class="small">' + escapeHtml(value.query ? value.query.ticker + ' | ' + value.durationMs + 'ms' : safeLabel) + '</p></div>' +
          '<div class="summary-cell"><span>Mock Data</span><strong class="' + (value.mockDataUsed ? 'danger' : 'ok') + '">' + escapeHtml(String(value.mockDataUsed)) + '</strong><p class="small">Live buyer proof must stay false.</p></div>' +
          '<div class="summary-cell"><span>Upstreams</span><strong>' + escapeHtml('SEC ' + (sec.status || '?') + ' / FRED ' + (fred.status || '?')) + '</strong><p class="small">' + escapeHtml((sec.observedRecords || 0) + ' filings, ' + (fred.observedRecords || 0) + ' macro observations') + '</p></div>' +
          '<div class="summary-cell"><span>Evidence Hash</span><strong class="mono">' + escapeHtml(shortHash(hash)) + '</strong><p class="small">Latest SEC ' + escapeHtml(sec.latestRecordDate || 'none') + ' | FRED ' + escapeHtml(fred.latestRecordDate || 'none') + '</p></div>' +
          '<div class="summary-cell"><span>Historical Claims</span><strong>' + escapeHtml(vintageLabel) + '</strong><p class="small">' + escapeHtml(vintageNote) + '</p></div>';
        return;
      }
      if (value && value.error) {
        proofSummary.innerHTML =
          '<div class="summary-cell"><span>Route Result</span><strong class="danger">Failed</strong><p class="small">' + escapeHtml(safeLabel) + '</p></div>' +
          '<div class="summary-cell"><span>Mock Data</span><strong>Unknown</strong><p class="small">The route did not return a proof packet.</p></div>' +
          '<div class="summary-cell"><span>Upstreams</span><strong>Check JSON</strong><p class="small">Failure details remain visible below.</p></div>' +
          '<div class="summary-cell"><span>Evidence Hash</span><strong>None</strong><p class="small">No proof hash was returned.</p></div>' +
          '<div class="summary-cell"><span>Historical Claims</span><strong>Unknown</strong><p class="small">No vintage posture was returned.</p></div>';
        return;
      }
      proofSummary.innerHTML =
        '<div class="summary-cell"><span>Route Result</span><strong>' + escapeHtml(safeLabel) + '</strong><p class="small">See JSON for detailed proof.</p></div>' +
        '<div class="summary-cell"><span>Mock Data</span><strong>Not applicable</strong><p class="small">Only the live market proof route asserts this field.</p></div>' +
        '<div class="summary-cell"><span>Upstreams</span><strong>Source cited</strong><p class="small">Registry and response data stay visible below.</p></div>' +
        '<div class="summary-cell"><span>Evidence Hash</span><strong>See JSON</strong><p class="small">Hash availability depends on the route.</p></div>' +
        '<div class="summary-cell"><span>Historical Claims</span><strong>Route specific</strong><p class="small">Vintage posture is surfaced on the live proof route.</p></div>';
    }

    function pretty(value, context) {
      updateDecisionRail(context);
      renderProofSummary(value, context);
      if (!context) {
        output.textContent = JSON.stringify(value, null, 2);
        return;
      }
      output.textContent = JSON.stringify({
        buttonResult: {
          label: context.label,
          route: context.path,
          requestBody: context.body || null,
          valueSignal: context.valueSignal,
          proof: context.proof,
          safety: [
            'public_preview_or_quote_only',
            'read_only',
            'liveSettlementAllowed=false',
            'externalSideEffectsAllowed=false'
          ]
        },
        response: value
      }, null, 2);
    }

    function sourceLookup() {
      return Object.fromEntries(catalogState.sources.map(source => [source.sourceId, source]));
    }

    function summarizeSources(sourceIds) {
      const lookup = sourceLookup();
      const rows = sourceIds.map(sourceId => lookup[sourceId]).filter(Boolean);
      const green = rows.filter(source => source.risk === 'green').length;
      const official = rows.filter(source => source.accessPattern === 'official_api' || source.accessPattern === 'official_download').length;
      if (!rows.length) return 'Source registry pending.';
      return green + '/' + rows.length + ' green rights risk; ' + official + ' official APIs/downloads.';
    }

    function readinessForProduct(productId) {
      const readiness = catalogState.readiness;
      if (!readiness) return 'readiness pending';
      const adapters = readiness.adapters.filter(adapter => adapter.productId === productId);
      if (!adapters.length) return 'no live adapter yet; artifact preview/quote only';
      const live = adapters.filter(adapter => adapter.status === 'live_read_only').length;
      return live + '/' + adapters.length + ' live read-only adapters';
    }

    function updateRouteChrome() {
      const selected = kind.value;
      routeLabel.textContent = routes[selected] || routes.marketContext;
      methodLabel.textContent = 'POST';
      outputTitle.textContent = (labels[selected] || 'Selected') + ' response';
      schemaLabel.textContent = schemas[selected] || 'preview.schema.v1';
    }

    async function getJson(path, options) {
      const res = await fetch(path, options);
      const body = await res.json();
      if (!res.ok) throw body;
      return body;
    }

    async function loadReadiness() {
      const readiness = await getJson('/v1/readiness');
      catalogState.readiness = readiness;
      document.getElementById('liveAdapters').textContent = readiness.counts.live_read_only;
      document.getElementById('readinessSignal').textContent = readiness.counts.live_read_only + ' live read-only, ' + readiness.counts.key_required + ' key-gated';
    }

    async function loadX402Status() {
      const status = await getJson('/v1/x402/status');
      catalogState.x402 = status;
      const rail = status.activeRail === 'official_x402_testnet' ? 'Base Sepolia testnet' : status.activeRail === 'x402_testnet_config_required' ? 'config needed' : 'simulated';
      document.getElementById('x402Rail').textContent = rail;
      document.getElementById('paymentPosture').textContent = rail;
      document.getElementById('paymentPostureNote').textContent = status.activeRail === 'official_x402_testnet'
        ? 'Official @x402 middleware is active on Base Sepolia only; live mainnet settlement remains blocked.'
        : 'No official payment middleware is active until AOE_PAYMENT_MODE=x402_testnet and AOE_X402_PAY_TO are configured.';
      renderPaymentRailMap(status);
    }

    async function loadContracts() {
      const contracts = await getJson('/v1/contracts');
      catalogState.contracts = contracts;
      return contracts;
    }

    function renderProofSignals() {
      const sources = catalogState.sources;
      const products = catalogState.products;
      const green = sources.filter(source => source.risk === 'green').length;
      const official = sources.filter(source => source.accessPattern === 'official_api' || source.accessPattern === 'official_download').length;
      document.getElementById('sourceRecords').textContent = sources.length || '-';
      document.getElementById('paidProducts').textContent = products.length || '-';
      document.getElementById('sourceQuality').textContent = sources.length ? green + '/' + sources.length + ' green source-rights' : 'Loading source rights';
      document.getElementById('sourceQualityNote').textContent = sources.length ? official + ' official API/download sources; yellow entries stay terms-review gated.' : 'Official owners, access modes, and rights envelopes come from /v1/sources.';
      const featured = sources
        .filter(source => ['cisa_kev', 'first_epss', 'nvd_cve', 'sec_edgar', 'fred_alfred', 'developer_docs_public'].includes(source.sourceId))
        .slice(0, 6);
      document.getElementById('sourceRail').innerHTML = featured.map(source => {
        return '<div class="source-row">' +
          '<strong>' + escapeHtml(source.name) + '</strong>' +
          '<span class="small">' + escapeHtml(source.owner) + '</span>' +
          '<span class="small">' + escapeHtml(source.accessPattern + ' | risk=' + source.risk + ' | ' + source.rights.redistribution) + '</span>' +
          '</div>';
      }).join('');
    }

    function renderPaymentRailMap(status) {
      const rows = (status.rails || []).map(rail => {
        const state = rail.status === 'enabled_when_configured'
          ? 'testnet-ready when configured'
          : 'planned / simulated only';
        return '<div class="rail-row">' +
          '<strong>' + escapeHtml(rail.railId) + '</strong>' +
          '<span>' + escapeHtml(rail.runtime.toUpperCase() + ' | ' + rail.network + ' | ' + rail.asset + ' | ' + state) + '</span>' +
          '<span>' + escapeHtml((rail.caveats || []).join(' ')) + '</span>' +
          '</div>';
      });
      if (status.paySh) {
        rows.push(
          '<div class="rail-row">' +
            '<strong>Pay.sh / Solana provider catalog</strong>' +
            '<span>' + escapeHtml(status.paySh.gatewayPattern + ' | providerCatalogPlanned=' + status.paySh.providerCatalogPlanned) + '</span>' +
            '<span>' + escapeHtml('liveWalletsAllowed=' + status.paySh.liveWalletsAllowed + ' | liveProviderCredentialsAllowed=' + status.paySh.liveProviderCredentialsAllowed) + '</span>' +
          '</div>'
        );
      }
      document.getElementById('paymentRailMap').innerHTML = rows.join('');
    }

    function renderProducts() {
      document.getElementById('products').innerHTML = catalogState.products.map(product => {
        const artifact = catalogState.artifacts.find(row => row.productId === product.productId);
        const segment = buyerSegments[product.productId] || 'Agent and operator buyers';
        const evidence = summarizeSources(product.sourceIds) + ' ' + readinessForProduct(product.productId);
        const buttonLabel = 'Inspect proof';
        return '<article class="product-row">' +
          '<div><div class="product-title">' + escapeHtml(product.title) + '</div><div class="tagrow">' +
          product.tags.slice(0, 3).map(tag => '<span class="tag">' + escapeHtml(tag) + '</span>').join('') +
          '</div></div>' +
          '<div class="small"><strong>' + escapeHtml(segment) + '</strong><br>' + escapeHtml(product.buyerValue) + '</div>' +
          '<div class="small">' + escapeHtml(evidence) + '<br><span class="mono">' + escapeHtml((artifact && artifact.artifactId) || 'artifact preview pending') + '</span></div>' +
          '<div class="price">$' + escapeHtml(product.priceUsd) + '</div>' +
          '<div><button class="btn product-action" data-product-id="' + escapeHtml(product.productId) + '">' + escapeHtml(buttonLabel) + '</button></div>' +
          '</article>';
      }).join('');
    }

    async function loadCatalog() {
      const data = await Promise.all([getJson('/v1/products'), getJson('/v1/sources'), getJson('/v1/artifacts')]);
      catalogState.products = data[0].products;
      catalogState.sources = data[1].sources;
      catalogState.artifacts = data[2].artifacts;
      renderProofSignals();
      renderProducts();
    }

    async function runPreview(options) {
      const opts = options || {};
      if (!opts.system) userStartedPreview = true;
      const requestId = ++activePreviewRequest;
      const raw = input.value.trim();
      const selected = kind.value;
      const label = labels[selected] || 'Selected';
      updateRouteChrome();
      output.textContent = 'Running ' + label + ' preview against ' + (routes[selected] || routes.marketContext) + '...';
      runButton.textContent = 'Running...';
      runButton.setAttribute('aria-busy', 'true');
      if (opts.scroll) {
        workbench.scrollIntoView({ behavior: 'smooth', block: 'start' });
        output.focus({ preventScroll: true });
      }
      let path = '';
      let body = {};
      if (selected === 'liveMarketProof') {
        path = '/v1/streams/market-context/live-proof';
        body = { ticker: raw || 'AAPL', seriesIds: ['FEDFUNDS', 'UNRATE', 'CPIAUCSL'], filingLimit: 3, seriesLimit: 2 };
      } else if (selected === 'marketContext') {
        path = '/v1/streams/market-context/preview';
        body = { ticker: raw || 'AAPL', seriesIds: ['FEDFUNDS', 'UNRATE', 'CPIAUCSL'], filingLimit: 3, seriesLimit: 2 };
      } else if (selected === 'cyberInventory') {
        path = '/v1/adapters/cyber/inventory-priority/preview';
        body = {
          buyer: { buyerId: raw || 'demo-inventory', useCase: 'client remediation proof packet' },
          assets: [
            {
              assetId: 'asset-1',
              hostname: 'vpn-1',
              owner: 'security',
              environment: 'production',
              criticality: 'critical',
              internetFacing: true,
              vulnerabilities: ['CVE-2023-34362']
            },
            {
              assetId: 'asset-2',
              hostname: 'app-1',
              owner: 'platform',
              environment: 'production',
              criticality: 'high',
              internetFacing: false,
              vulnerabilities: ['CVE-2021-44228']
            }
          ]
        };
      } else if (selected === 'cyber') {
        path = '/v1/adapters/cyber/vuln-priority/preview';
        body = { cves: raw.split(/[,\\s]+/).filter(Boolean) };
      } else if (selected === 'wildfire') {
        path = '/v1/adapters/wildfire/wfigs-perimeters/preview';
        body = { state: raw || 'CO', limit: 5 };
      } else if (selected === 'alerts') {
        path = '/v1/adapters/wildfire/alerts/preview';
        body = { area: raw || 'CO' };
      } else if (selected === 'sec') {
        path = '/v1/adapters/markets/sec-filings/preview';
        body = { ticker: raw || 'AAPL', forms: ['10-K', '10-Q', '8-K'], limit: 5 };
      } else {
        path = '/v1/adapters/markets/fred-series/preview';
        body = { seriesIds: raw.split(/[,\\s]+/).filter(Boolean), limit: 3 };
      }
      try {
        const context = {
          label: label + ' public preview',
          path,
          body,
          valueSignal: valueSignals[selected],
          proof: proofNotes[selected]
        };
        const result = await getJson(path, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        if (requestId === activePreviewRequest) pretty(result, context);
      } catch (error) {
        if (requestId === activePreviewRequest) {
          pretty({ error }, {
            label: label + ' public preview failed',
            path,
            body,
            valueSignal: valueSignals[selected],
            proof: proofNotes[selected]
          });
        }
      } finally {
        if (requestId === activePreviewRequest) {
          runButton.textContent = 'Run Preview';
          runButton.removeAttribute('aria-busy');
        }
      }
    }

    async function inspectProduct(productId, options) {
      const opts = options || {};
      userStartedPreview = true;
      const requestId = ++activePreviewRequest;
      runButton.textContent = 'Run Preview';
      runButton.removeAttribute('aria-busy');
      const product = catalogState.products.find(row => row.productId === productId);
      const artifact = catalogState.artifacts.find(row => row.productId === productId);
      if (!product || !artifact) {
        pretty({
          error: 'product_or_artifact_not_loaded',
          productId
        }, {
          label: 'Product proof unavailable',
          path: '/v1/products + /v1/artifacts',
          body: { productId },
          valueSignal: valueSignals.product,
          proof: proofNotes.product
        });
        return;
      }
      if (opts.scroll) {
        workbench.scrollIntoView({ behavior: 'smooth', block: 'start' });
        output.focus({ preventScroll: true });
      }
      const previewPath = '/v1/artifacts/' + artifact.artifactId + '/preview';
      const quotePath = '/v1/artifacts/' + artifact.artifactId + '/quote';
      output.textContent = 'Inspecting ' + product.title + ' proof via preview and quote endpoints...';
      try {
        const data = await Promise.all([getJson(previewPath), getJson(quotePath)]);
        const lookup = sourceLookup();
        const sourceEvidence = product.sourceIds.map(sourceId => {
          const source = lookup[sourceId];
          return source ? {
            sourceId: source.sourceId,
            name: source.name,
            owner: source.owner,
            accessPattern: source.accessPattern,
            rightsRisk: source.risk,
            redistribution: source.rights.redistribution
          } : { sourceId, status: 'not_found_in_source_registry' };
        });
        const livePreviewKind = productPreviewMap[product.productId] || null;
        if (requestId === activePreviewRequest) {
          pretty({
            product: {
              productId: product.productId,
              title: product.title,
              buyerSegment: buyerSegments[product.productId] || 'Agent and operator buyers',
              buyerValue: product.buyerValue,
              priceUsd: product.priceUsd,
              settlementMode: product.settlementMode,
              liveSettlementAllowed: product.liveSettlementAllowed,
              externalSideEffectsAllowed: product.externalSideEffectsAllowed,
              readiness: readinessForProduct(product.productId),
              runnablePreviewButton: livePreviewKind ? labels[livePreviewKind] : 'artifact preview and quote only'
            },
            x402Status: catalogState.x402 && {
              mode: catalogState.x402.mode,
              activeRail: catalogState.x402.activeRail,
              network: catalogState.x402.network && catalogState.x402.network.id,
              facilitator: catalogState.x402.facilitator && catalogState.x402.facilitator.url,
              payToConfigured: catalogState.x402.payTo && catalogState.x402.payTo.configured,
              liveSettlementAllowed: catalogState.x402.liveSettlementAllowed
            },
            artifactPreview: data[0],
            quote: data[1].quote,
            sourceEvidence
          }, {
            label: 'Product proof: ' + product.title,
            path: previewPath + ' + ' + quotePath,
            body: { productId: product.productId },
            valueSignal: valueSignals.product,
            proof: proofNotes.product
          });
        }
      } catch (error) {
        if (requestId === activePreviewRequest) {
          pretty({ error }, {
            label: 'Product proof failed: ' + product.title,
            path: previewPath + ' + ' + quotePath,
            body: { productId: product.productId },
            valueSignal: valueSignals.product,
            proof: proofNotes.product
          });
        }
      }
    }

    async function inspectContracts(options) {
      const opts = options || {};
      userStartedPreview = true;
      const requestId = ++activePreviewRequest;
      runButton.textContent = 'Run Preview';
      runButton.removeAttribute('aria-busy');
      if (opts.scroll) {
        workbench.scrollIntoView({ behavior: 'smooth', block: 'start' });
        output.focus({ preventScroll: true });
      }
      output.textContent = 'Loading buyer contract bundle from /v1/contracts...';
      try {
        const contracts = catalogState.contracts || await loadContracts();
        if (requestId !== activePreviewRequest) return;
        pretty({
          schemaId: contracts.schemaId,
          bundleVersion: contracts.bundleVersion,
          generatedAt: contracts.generatedAt,
          coverage: contracts.coverage,
          paymentBoundary: contracts.paymentBoundary,
          rightsBoundary: contracts.rightsBoundary,
          pathContracts: contracts.pathContracts,
          openapi: {
            openapi: contracts.openapi.openapi,
            title: contracts.openapi.info.title,
            pathCount: Object.keys(contracts.openapi.paths || {}).length,
            schemaCount: Object.keys(contracts.openapi.components?.schemas || {}).length
          }
        }, {
          label: 'Buyer contract bundle',
          path: '/v1/contracts',
          body: null,
          valueSignal: valueSignals.contracts,
          proof: proofNotes.contracts
        });
      } catch (error) {
        if (requestId !== activePreviewRequest) return;
        pretty({ error }, {
          label: 'Buyer contract bundle failed',
          path: '/v1/contracts',
          body: null,
          valueSignal: valueSignals.contracts,
          proof: proofNotes.contracts
        });
      }
    }

    kind.addEventListener('change', () => {
      input.value = examples[kind.value];
      updateRouteChrome();
    });
    document.getElementById('runPreview').addEventListener('click', runPreview);
    document.getElementById('inspectFeatured').addEventListener('click', () => inspectProduct('market_regime_evidence_pack', { scroll: true }));
    document.getElementById('showContracts').addEventListener('click', () => inspectContracts({ scroll: true }));
    document.getElementById('products').addEventListener('click', event => {
      const button = event.target.closest('[data-product-id]');
      if (!button) return;
      const productId = button.getAttribute('data-product-id');
      const previewKind = productPreviewMap[productId];
      if (previewKind) {
        kind.value = previewKind;
        input.value = examples[kind.value];
        updateRouteChrome();
        inspectProduct(productId, { scroll: true });
        return;
      }
      inspectProduct(productId, { scroll: true });
    });
    document.getElementById('refresh').addEventListener('click', async () => {
      await Promise.all([loadReadiness(), loadCatalog(), loadX402Status(), loadContracts()]);
      renderProducts();
      await runPreview();
    });
    document.querySelectorAll('[data-action]').forEach(button => {
      button.addEventListener('click', () => {
        kind.value = heroActions[button.dataset.action] || button.dataset.action;
        input.value = examples[kind.value];
        updateRouteChrome();
        runPreview({ scroll: true });
      });
    });

    updateRouteChrome();
    Promise.all([loadReadiness(), loadCatalog(), loadX402Status(), loadContracts()])
      .then(() => {
        renderProducts();
        if (!userStartedPreview) return runPreview({ system: true });
      })
      .catch(error => pretty({ error }));
  </script>
</body>
</html>`;
}
