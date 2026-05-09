export function renderPublicFrontend(): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#f4f7f5">
  <link rel="icon" href="data:,">
  <title>SapphireAlpha - Market Data Streams</title>
  <style>
    :root {
      --paper: #f4f7f5;
      --panel: #ffffff;
      --panel-soft: #f9fbfa;
      --ink: #111817;
      --muted: #5e6a65;
      --line: #d8e0dc;
      --line-strong: #acbab4;
      --green: #1f7a52;
      --teal: #08756f;
      --blue: #285da8;
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
        linear-gradient(90deg, rgba(17, 24, 23, 0.045) 1px, transparent 1px),
        linear-gradient(180deg, rgba(17, 24, 23, 0.035) 1px, transparent 1px),
        linear-gradient(135deg, #f7faf8 0%, #eef4f1 46%, #f7f8f4 100%);
      background-size: 48px 48px, 48px 48px, auto;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      letter-spacing: 0;
    }
    button, input, select { font: inherit; }
    h1, h2, h3, p, dl, dd { margin: 0; }
    .shell {
      width: min(1420px, calc(100vw - 40px));
      margin: 0 auto;
      padding: 18px 0 34px;
    }
    header {
      display: grid;
      grid-template-columns: minmax(260px, 1fr) auto;
      gap: 18px;
      align-items: center;
      min-height: 64px;
      border-bottom: 1px solid var(--line);
      margin-bottom: 18px;
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
      border: 1px solid rgba(255,255,255,.72);
      border-radius: 8px;
      background:
        linear-gradient(135deg, transparent 0 48%, rgba(255,255,255,.85) 49% 52%, transparent 53%),
        linear-gradient(145deg, var(--teal), var(--blue));
      box-shadow: 0 10px 24px rgba(8, 117, 111, 0.2);
      flex: 0 0 auto;
    }
    .brand strong { display: block; font-size: 17px; line-height: 1.1; }
    .brand span { display: block; color: var(--muted); font-size: 12px; margin-top: 3px; }
    .top-actions { display: flex; gap: 10px; flex-wrap: wrap; justify-content: flex-end; }
    .btn {
      min-height: 40px;
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
    .btn.primary:hover { background: var(--teal); border-color: var(--teal); }
    .status-strip {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 1px;
      overflow: hidden;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--line);
      margin-bottom: 18px;
    }
    .status-cell {
      min-height: 74px;
      background: rgba(255,255,255,.74);
      padding: 13px 14px;
    }
    .status-cell dt {
      color: var(--muted);
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      margin-bottom: 8px;
    }
    .status-cell dd {
      font-size: 22px;
      font-weight: 820;
      line-height: 1;
    }
    .ok { color: var(--green); }
    .warn { color: var(--amber); }
    .danger { color: var(--red); }
    .blue { color: var(--blue); }
    .first-screen {
      min-height: calc(100vh - 120px);
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(460px, .92fr);
      gap: 18px;
      align-items: stretch;
    }
    .storefront, .workbench-panel, .lane, .boundary {
      border: 1px solid var(--line);
      border-radius: 8px;
      background: rgba(255,255,255,.82);
      box-shadow: var(--shadow);
    }
    .storefront, .workbench-panel {
      min-height: 640px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .panel-head {
      display: grid;
      gap: 10px;
      padding: 18px;
      border-bottom: 1px solid var(--line);
      background: rgba(249, 251, 250, .88);
    }
    .eyebrow {
      color: var(--teal);
      font-size: 11px;
      font-weight: 850;
      text-transform: uppercase;
    }
    h1 {
      max-width: 760px;
      font-size: clamp(28px, 3.1vw, 40px);
      line-height: 1.06;
    }
    h2 { font-size: 21px; line-height: 1.2; }
    h3 { font-size: 15px; line-height: 1.25; }
    .lead {
      max-width: 820px;
      color: var(--muted);
      font-size: 15px;
      line-height: 1.55;
    }
    .stream-spec {
      display: grid;
      grid-template-columns: minmax(0, 1.2fr) repeat(3, minmax(110px, .5fr));
      border-bottom: 1px solid var(--line);
      background: var(--panel);
    }
    .spec-cell {
      padding: 14px 16px;
      min-width: 0;
      border-right: 1px solid var(--line);
    }
    .spec-cell:last-child { border-right: 0; }
    .spec-cell span {
      display: block;
      color: var(--muted);
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      margin-bottom: 7px;
    }
    .route, .mono {
      font: 12px/1.45 ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace;
      overflow-wrap: anywhere;
    }
    .route { color: var(--blue); }
    .price { font-size: 23px; font-weight: 850; line-height: 1; }
    .schema { color: var(--teal); }
    .product-table {
      display: grid;
      grid-template-columns: minmax(180px, .78fr) minmax(220px, 1.05fr) 108px 122px;
      border-bottom: 1px solid var(--line);
    }
    #products {
      display: grid;
      grid-template-columns: minmax(180px, .78fr) minmax(220px, 1.05fr) 108px 122px;
    }
    .table-head {
      color: var(--muted);
      background: var(--panel-soft);
      font-size: 11px;
      font-weight: 850;
      text-transform: uppercase;
    }
    .product-table > div {
      padding: 10px 14px;
      border-right: 1px solid var(--line);
      min-width: 0;
    }
    .product-table > div:nth-child(4n) { border-right: 0; }
    .product-row {
      display: contents;
    }
    .product-row > div {
      padding: 13px 14px;
      border-right: 1px solid var(--line);
      border-bottom: 1px solid var(--line);
      background: rgba(255,255,255,.72);
      min-width: 0;
    }
    .product-row > div:nth-child(4n) { border-right: 0; }
    .product-row:last-child > div { border-bottom: 0; }
    .product-title { font-weight: 760; }
    .small {
      color: var(--muted);
      font-size: 12px;
      line-height: 1.45;
    }
    .tagrow {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      margin-top: 9px;
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
    .storefront-foot {
      margin-top: auto;
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 14px;
      align-items: center;
      padding: 14px 18px;
      border-top: 1px solid var(--line);
      background: rgba(249, 251, 250, .86);
    }
    .workbench-grid {
      display: grid;
      grid-template-columns: 260px minmax(0, 1fr);
      gap: 0;
      flex: 1;
      min-height: 0;
    }
    .controls {
      display: grid;
      gap: 11px;
      align-content: start;
      border-right: 1px solid var(--line);
      padding: 16px;
      background: rgba(249, 251, 250, .64);
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
      grid-template-rows: auto minmax(0, 1fr);
      min-width: 0;
      min-height: 0;
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
      max-width: 210px;
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
    .below {
      display: grid;
      grid-template-columns: minmax(0, .94fr) minmax(0, 1.06fr);
      gap: 18px;
      margin-top: 18px;
    }
    .lane, .boundary { padding: 18px; }
    .lane-grid, .boundary-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 1px;
      margin-top: 14px;
      overflow: hidden;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--line);
    }
    .lane-cell, .boundary-cell {
      min-height: 132px;
      padding: 14px;
      background: rgba(255,255,255,.78);
    }
    .footer {
      color: var(--muted);
      font-size: 12px;
      padding-top: 18px;
    }
    @media (max-width: 1120px) {
      .first-screen, .below { grid-template-columns: 1fr; }
      .storefront, .workbench-panel { min-height: auto; }
    }
    @media (max-width: 760px) {
      .shell { width: min(100vw - 20px, 1420px); padding-top: 10px; }
      header, .storefront-foot, .workbench-grid, .stream-spec, .status-strip { grid-template-columns: 1fr; }
      .top-actions { justify-content: flex-start; }
      .status-cell, .spec-cell { border-right: 0; border-bottom: 1px solid var(--line); }
      .status-cell:last-child, .spec-cell:last-child { border-bottom: 0; }
      #products, .product-table, .product-row { display: block; }
      .product-table.table-head { display: none; }
      .product-row > div {
        border-right: 0;
        border-bottom: 0;
        padding: 8px 14px;
      }
      .product-row {
        display: grid;
        border-bottom: 1px solid var(--line);
        padding: 8px 0;
        background: rgba(255,255,255,.74);
      }
      .product-row:last-child { border-bottom: 0; }
      .controls { border-right: 0; border-bottom: 1px solid var(--line); }
      .lane-grid, .boundary-grid { grid-template-columns: 1fr; }
      h1 { font-size: 31px; }
    }
  </style>
</head>
<body>
  <div class="shell">
    <header>
      <div class="brand">
        <div class="mark" aria-hidden="true"></div>
        <div>
          <strong>SapphireAlpha</strong>
          <span>Market Data Streams</span>
        </div>
      </div>
      <div class="top-actions">
        <button class="btn" id="refresh">Refresh Data</button>
        <button class="btn primary" data-action="markets">Open Stream</button>
      </div>
    </header>

    <dl class="status-strip" aria-label="System readiness">
      <div class="status-cell"><dt>Live adapters</dt><dd id="liveAdapters">-</dd></div>
      <div class="status-cell"><dt>Key gated</dt><dd id="keyGated">-</dd></div>
      <div class="status-cell"><dt>Live settlement</dt><dd class="ok">off</dd></div>
      <div class="status-cell"><dt>External side effects</dt><dd class="ok">none</dd></div>
    </dl>

    <main class="first-screen">
      <section class="storefront" aria-labelledby="storefront-title">
        <div class="panel-head">
          <div class="eyebrow">API storefront</div>
          <h1 id="storefront-title">Pay-per-call evidence streams for market agents.</h1>
          <p class="lead">Source-cited SEC, macro, defensive cyber, and developer-change packets. Simulated x402 settlement only; research context only; no trading, no scans, no external sends.</p>
          <div class="tagrow">
            <span class="tag">rights-cleared derived facts</span>
            <span class="tag">agent-readable schema</span>
            <span class="tag">public preview</span>
          </div>
        </div>

        <div class="stream-spec" aria-label="Featured stream contract">
          <div class="spec-cell">
            <span>Route</span>
            <div class="route">POST /v1/streams/market-context/preview</div>
          </div>
          <div class="spec-cell">
            <span>Price</span>
            <div class="price">$1.0000</div>
          </div>
          <div class="spec-cell">
            <span>Schema</span>
            <div class="mono schema">sapphirealpha.market_context.v1</div>
          </div>
          <div class="spec-cell">
            <span>Sources</span>
            <div class="mono">SEC EDGAR + FRED</div>
          </div>
        </div>

        <div class="product-table table-head" aria-hidden="true">
          <div>Product</div>
          <div>Buyer value</div>
          <div>Price</div>
          <div>Route</div>
        </div>
        <div id="products" aria-live="polite"></div>

        <div class="storefront-foot">
          <p class="small">Paid endpoints return full artifact content after simulated/testnet payment. Preview routes stay public for inspection and integration testing.</p>
          <button class="btn" data-action="cyber">Run Cyber Data Preview</button>
        </div>
      </section>

      <section class="workbench-panel" id="workbench" aria-labelledby="workbench-title">
        <div class="panel-head">
          <div class="eyebrow">Live stream workbench</div>
          <h2 id="workbench-title">Preview the stream contract</h2>
          <p class="lead">Choose a route, send a small public preview request, and inspect the JSON shape the buyer or agent receives.</p>
        </div>
        <div class="workbench-grid">
          <div class="controls">
            <div>
              <label for="previewKind">Route</label>
              <select id="previewKind">
                <option value="marketContext">SEC + Macro Context</option>
                <option value="cyber">Cyber CVE Priority</option>
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
              <span class="route" id="routeLabel">/v1/streams/market-context/preview</span>
            </div>
            <button class="btn primary" id="runPreview">Run Preview</button>
            <button class="btn" data-action="wildfire">Check Separate Fire Signals</button>
            <p class="small">Wildfire routes are visible here only as a separate read-only public-safety research lane. They are not x402 stream products.</p>
          </div>
          <div class="output-wrap">
            <div class="output-toolbar">
              <span id="outputTitle">Market context response</span>
              <span class="schema-pill" id="schemaLabel">sapphirealpha.market_context.v1</span>
            </div>
            <pre id="output" tabindex="-1">Loading readiness...</pre>
          </div>
        </div>
      </section>
    </main>

    <div class="below">
      <section class="lane">
        <div class="eyebrow">Separate operational lane</div>
        <h2>Wildfire remains planning-only</h2>
        <p class="lead">Fire weather and WFIGS previews stay outside the x402 storefront. The page exposes them for boundary clarity and read-only research, not monetized incident operations.</p>
        <div class="lane-grid">
          <div class="lane-cell"><h3>Read-only</h3><p class="small">Public WFIGS/NWS data is retrieved for preview and situational research.</p></div>
          <div class="lane-cell"><h3>Not x402</h3><p class="small">No payment stream, no resale of incident operations, no dispatch surface.</p></div>
          <div class="lane-cell"><h3>No control actions</h3><p class="small">No alert sends, flight authorization, drone operations, or incident command claims.</p></div>
        </div>
      </section>

      <section class="boundary">
        <div class="eyebrow">Boundary</div>
        <h2>What the interface will not do</h2>
        <div class="boundary-grid">
          <div class="boundary-cell"><h3>Markets</h3><p class="small">Research context only. No investment advice, recommendations, or execution.</p></div>
          <div class="boundary-cell"><h3>Cyber</h3><p class="small">Defensive prioritization only. No exploit payloads, unauthorized scans, or credential material.</p></div>
          <div class="boundary-cell"><h3>Payment</h3><p class="small">Simulated/testnet settlement only until rights, terms, refunds, tax/accounting, and KYT are ready.</p></div>
        </div>
      </section>
    </div>

    <div class="footer">SapphireAlpha public frontend. THO and wildfire/drone remain separate from the x402 market data stream catalog.</div>
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
    let activePreviewRequest = 0;
    let userStartedPreview = false;

    const examples = {
      cyber: 'CVE-2021-44228,CVE-2023-34362,CVE-2024-3094',
      marketContext: 'AAPL',
      wildfire: 'CO',
      alerts: 'CO',
      sec: 'AAPL',
      fred: 'FEDFUNDS,CPIAUCSL,UNRATE'
    };
    const labels = {
      cyber: 'Cyber CVE Priority',
      marketContext: 'SEC + Macro Context',
      wildfire: 'Separate Wildfire WFIGS Preview',
      alerts: 'NWS Fire Weather Alerts',
      sec: 'SEC Recent Filings',
      fred: 'FRED Macro Series'
    };
    const routes = {
      cyber: '/v1/adapters/cyber/vuln-priority/preview',
      marketContext: '/v1/streams/market-context/preview',
      wildfire: '/v1/adapters/wildfire/wfigs-perimeters/preview',
      alerts: '/v1/adapters/wildfire/alerts/preview',
      sec: '/v1/adapters/markets/sec-filings/preview',
      fred: '/v1/adapters/markets/fred-series/preview'
    };
    const schemas = {
      cyber: 'sapphirealpha.cyber_priority.v1',
      marketContext: 'sapphirealpha.market_context.v1',
      wildfire: 'separate.wfigs_public_preview.v1',
      alerts: 'separate.nws_fire_weather.v1',
      sec: 'sapphirealpha.sec_filings.v1',
      fred: 'sapphirealpha.fred_series.v1'
    };
    const heroActions = {
      cyber: 'cyber',
      wildfire: 'wildfire',
      markets: 'marketContext'
    };

    function escapeHtml(value) {
      return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    function pretty(value) {
      output.textContent = JSON.stringify(value, null, 2);
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
      document.getElementById('liveAdapters').textContent = readiness.counts.live_read_only;
      document.getElementById('keyGated').textContent = readiness.counts.key_required;
    }

    async function loadProducts() {
      const data = await getJson('/v1/products');
      document.getElementById('products').innerHTML = data.products.map(product => {
        return '<article class="product-row">' +
          '<div><div class="product-title">' + escapeHtml(product.title) + '</div><div class="tagrow">' +
          product.tags.slice(0, 3).map(tag => '<span class="tag">' + escapeHtml(tag) + '</span>').join('') +
          '</div></div>' +
          '<div class="small">' + escapeHtml(product.buyerValue) + '</div>' +
          '<div class="price">$' + escapeHtml(product.priceUsd) + '</div>' +
          '<div class="route">' + escapeHtml(product.method + ' ' + product.route) + '</div>' +
          '</article>';
      }).join('');
    }

    async function runPreview(options) {
      const opts = options || {};
      if (!opts.system) userStartedPreview = true;
      const requestId = ++activePreviewRequest;
      const raw = input.value.trim();
      const selected = kind.value;
      const label = labels[selected] || 'Selected';
      updateRouteChrome();
      output.textContent = 'Running ' + label + ' preview...';
      runButton.textContent = 'Running...';
      runButton.setAttribute('aria-busy', 'true');
      if (opts.scroll) {
        workbench.scrollIntoView({ behavior: 'smooth', block: 'start' });
        output.focus({ preventScroll: true });
      }
      let path = '';
      let body = {};
      if (selected === 'marketContext') {
        path = '/v1/streams/market-context/preview';
        body = { ticker: raw || 'AAPL', seriesIds: ['FEDFUNDS', 'UNRATE', 'CPIAUCSL'], filingLimit: 3, seriesLimit: 2 };
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
        const result = await getJson(path, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        if (requestId === activePreviewRequest) pretty(result);
      } catch (error) {
        if (requestId === activePreviewRequest) pretty({ error });
      } finally {
        if (requestId === activePreviewRequest) {
          runButton.textContent = 'Run Preview';
          runButton.removeAttribute('aria-busy');
        }
      }
    }

    kind.addEventListener('change', () => {
      input.value = examples[kind.value];
      updateRouteChrome();
    });
    document.getElementById('runPreview').addEventListener('click', runPreview);
    document.getElementById('refresh').addEventListener('click', async () => { await loadReadiness(); await loadProducts(); await runPreview(); });
    document.querySelectorAll('[data-action]').forEach(button => {
      button.addEventListener('click', () => {
        kind.value = heroActions[button.dataset.action] || button.dataset.action;
        input.value = examples[kind.value];
        updateRouteChrome();
        runPreview({ scroll: true });
      });
    });

    updateRouteChrome();
    Promise.all([loadReadiness(), loadProducts()])
      .then(() => { if (!userStartedPreview) return runPreview({ system: true }); })
      .catch(error => pretty({ error }));
  </script>
</body>
</html>`;
}
