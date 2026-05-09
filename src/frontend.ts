export function renderPublicFrontend(): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#f7faf8">
  <link rel="icon" href="data:,">
  <title>SapphireAlpha - Agent Opportunity Exchange</title>
  <style>
    :root {
      --paper: #f7faf8;
      --surface: #ffffff;
      --ink: #16211d;
      --muted: #5e6b65;
      --line: #d9e1dd;
      --line-strong: #b8c7c0;
      --teal: #0f766e;
      --green: #2e7d32;
      --blue: #2457a7;
      --red: #b3261e;
      --amber: #915d00;
      --violet: #6247aa;
      --shadow: 0 18px 48px rgba(22, 33, 29, 0.09);
    }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      min-height: 100%;
      color: var(--ink);
      background:
        linear-gradient(120deg, rgba(15, 118, 110, .12), transparent 30%),
        linear-gradient(260deg, rgba(36, 87, 167, .10), transparent 34%),
        var(--paper);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      letter-spacing: 0;
    }
    button, input, select { font: inherit; }
    .shell {
      width: min(1180px, calc(100vw - 32px));
      margin: 0 auto;
      padding: 28px 0 56px;
    }
    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 18px;
      margin-bottom: 22px;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .mark {
      width: 44px;
      height: 44px;
      border-radius: 8px;
      background:
        radial-gradient(circle at 30% 25%, rgba(255,255,255,.95) 0 12%, transparent 13%),
        linear-gradient(135deg, var(--teal), var(--blue));
      box-shadow: var(--shadow);
    }
    h1, h2, h3, p { margin: 0; }
    h1 { font-size: clamp(28px, 5vw, 58px); line-height: .98; max-width: 850px; }
    h2 { font-size: 22px; margin-bottom: 12px; }
    h3 { font-size: 15px; margin-bottom: 8px; }
    .eyebrow {
      color: var(--teal);
      font-weight: 800;
      text-transform: uppercase;
      font-size: 12px;
      letter-spacing: .08em;
      margin-bottom: 14px;
    }
    .hero {
      min-height: 520px;
      display: grid;
      grid-template-columns: minmax(0, 1.08fr) minmax(320px, .92fr);
      gap: 28px;
      align-items: stretch;
      padding: 26px 0 34px;
    }
    .hero-copy {
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 22px;
      padding: 24px 0;
    }
    .lead {
      color: var(--muted);
      max-width: 740px;
      font-size: 18px;
      line-height: 1.6;
    }
    .actions { display: flex; gap: 12px; flex-wrap: wrap; }
    .btn {
      border: 1px solid var(--line-strong);
      background: var(--surface);
      color: var(--ink);
      min-height: 42px;
      border-radius: 8px;
      padding: 0 14px;
      cursor: pointer;
      box-shadow: 0 1px 0 rgba(255,255,255,.7);
    }
    .btn.primary { color: white; background: var(--teal); border-color: var(--teal); }
    .status-board {
      background: rgba(255,255,255,.82);
      border: 1px solid var(--line);
      border-radius: 8px;
      box-shadow: var(--shadow);
      padding: 18px;
      align-self: center;
    }
    .metric-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
      margin: 14px 0 16px;
    }
    .metric {
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 13px;
      background: #fbfdfc;
      min-height: 92px;
    }
    .metric strong { display: block; font-size: 30px; line-height: 1; margin-bottom: 8px; }
    .metric span { color: var(--muted); font-size: 13px; }
    .ticker {
      display: grid;
      gap: 10px;
      margin-top: 16px;
    }
    .line {
      display: flex;
      justify-content: space-between;
      gap: 14px;
      border-top: 1px solid var(--line);
      padding-top: 10px;
      color: var(--muted);
      font-size: 13px;
    }
    main { display: grid; gap: 26px; }
    section.band {
      background: rgba(255,255,255,.78);
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 20px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 14px;
    }
    .item {
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 16px;
      background: var(--surface);
      min-height: 164px;
    }
    .item p, .small { color: var(--muted); font-size: 13px; line-height: 1.5; }
    .tagrow { display: flex; gap: 7px; flex-wrap: wrap; margin-top: 12px; }
    .tag {
      display: inline-flex;
      align-items: center;
      border: 1px solid var(--line);
      border-radius: 999px;
      padding: 3px 8px;
      color: var(--muted);
      font-size: 12px;
      background: #fbfdfc;
    }
    .workspace {
      display: grid;
      grid-template-columns: 330px minmax(0, 1fr);
      gap: 16px;
    }
    .controls {
      display: grid;
      gap: 10px;
      align-content: start;
    }
    label { color: var(--muted); font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; }
    input, select {
      width: 100%;
      border: 1px solid var(--line-strong);
      border-radius: 8px;
      background: white;
      color: var(--ink);
      padding: 11px 12px;
    }
    pre {
      margin: 0;
      overflow: auto;
      min-height: 320px;
      max-height: 520px;
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 14px;
      background: #111815;
      color: #dce7e0;
      font: 12px/1.55 ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace;
    }
    .ok { color: var(--green); }
    .warn { color: var(--amber); }
    .danger { color: var(--red); }
    .blue { color: var(--blue); }
    .footer {
      color: var(--muted);
      font-size: 12px;
      padding: 16px 0 0;
    }
    @media (max-width: 860px) {
      .hero, .workspace { grid-template-columns: 1fr; }
      .grid { grid-template-columns: 1fr; }
      .metric-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      h1 { font-size: 38px; }
    }
    @media (max-width: 520px) {
      .shell { width: min(100vw - 20px, 1180px); padding-top: 16px; }
      header { align-items: flex-start; flex-direction: column; }
      .metric-grid { grid-template-columns: 1fr; }
      h1 { font-size: 32px; }
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
          <div class="small">Agent Opportunity Exchange</div>
        </div>
      </div>
      <button class="btn" id="refresh">Refresh Data</button>
    </header>

    <div class="hero">
      <div class="hero-copy">
        <div>
          <div class="eyebrow">Public preview surface</div>
          <h1>Paid intelligence artifacts for agents, builders, and operators.</h1>
        </div>
        <p class="lead">Rights-cleared previews, source provenance, simulated x402 receipts, and live public-source adapters for cyber, wildfire, filings, and macro evidence.</p>
        <div class="actions">
          <button class="btn primary" data-action="cyber">Run Cyber Preview</button>
          <button class="btn" data-action="wildfire">Check Colorado Fire Signals</button>
          <button class="btn" data-action="markets">Load Market Evidence</button>
        </div>
      </div>
      <aside class="status-board" aria-label="System readiness">
        <h2>Adapter Readiness</h2>
        <p class="small">Live read-only sources stay separated from paid content and side-effecting actions.</p>
        <div class="metric-grid">
          <div class="metric"><strong id="liveAdapters">-</strong><span>live read-only adapters</span></div>
          <div class="metric"><strong id="keyGated">-</strong><span>key-gated future adapters</span></div>
          <div class="metric"><strong class="ok">off</strong><span>live settlement</span></div>
          <div class="metric"><strong class="ok">none</strong><span>external side effects</span></div>
        </div>
        <div class="ticker" id="adapterLines"></div>
      </aside>
    </div>

    <main>
      <section class="band">
        <h2>Sellable Artifacts</h2>
        <div class="grid" id="products"></div>
      </section>

      <section class="band" id="workbench">
        <h2>Live Preview Workbench</h2>
        <div class="workspace">
          <div class="controls">
            <label for="previewKind">Preview</label>
            <select id="previewKind">
              <option value="cyber">Cyber CVE Priority</option>
              <option value="wildfire">Wildfire WFIGS Perimeters</option>
              <option value="alerts">NWS Fire Weather Alerts</option>
              <option value="sec">SEC Recent Filings</option>
              <option value="fred">FRED Macro Series</option>
            </select>
            <label for="previewInput">Input</label>
            <input id="previewInput" value="CVE-2021-44228,CVE-2023-34362,CVE-2024-3094">
            <button class="btn primary" id="runPreview">Run Preview</button>
            <p class="small">The public site performs read-only API calls only. Paid access is still simulated/testnet and no scans, trades, sends, or drone actions are enabled.</p>
          </div>
          <pre id="output" tabindex="-1">Loading readiness...</pre>
        </div>
      </section>

      <section class="band">
        <h2>Boundary</h2>
        <div class="grid">
          <div class="item"><h3>Payment</h3><p>x402 is a payment rail, not permission. Live settlement remains disabled until KYT, refunds, tax/accounting, source rights, and buyer terms are ready.</p></div>
          <div class="item"><h3>Cyber</h3><p>Defensive prioritization only. No exploit payloads, unauthorized scans, credential material, or offensive automation.</p></div>
          <div class="item"><h3>Wildfire</h3><p>Planning and situational awareness only. No incident command claims, public alert sends, dispatch, or drone authorization.</p></div>
        </div>
      </section>
    </main>

    <div class="footer">SapphireAlpha public frontend. THO remains separate at its own canonical host.</div>
  </div>

  <script>
    const output = document.getElementById('output');
    const kind = document.getElementById('previewKind');
    const input = document.getElementById('previewInput');
    const workbench = document.getElementById('workbench');
    const runButton = document.getElementById('runPreview');
    let activePreviewRequest = 0;
    let userStartedPreview = false;

    const examples = {
      cyber: 'CVE-2021-44228,CVE-2023-34362,CVE-2024-3094',
      wildfire: 'CO',
      alerts: 'CO',
      sec: 'AAPL',
      fred: 'FEDFUNDS,CPIAUCSL,UNRATE'
    };
    const labels = {
      cyber: 'Cyber CVE Priority',
      wildfire: 'Wildfire WFIGS Perimeters',
      alerts: 'NWS Fire Weather Alerts',
      sec: 'SEC Recent Filings',
      fred: 'FRED Macro Series'
    };
    const heroActions = {
      cyber: 'cyber',
      wildfire: 'wildfire',
      markets: 'sec'
    };

    function pretty(value) {
      output.textContent = JSON.stringify(value, null, 2);
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
      document.getElementById('adapterLines').innerHTML = readiness.adapters.slice(0, 6).map(adapter => {
        const cls = adapter.status === 'live_read_only' ? 'ok' : 'warn';
        return '<div class="line"><span>' + adapter.adapterId + '</span><strong class="' + cls + '">' + adapter.status + '</strong></div>';
      }).join('');
    }

    async function loadProducts() {
      const data = await getJson('/v1/products');
      document.getElementById('products').innerHTML = data.products.map(product => {
        return '<article class="item"><h3>' + product.title + '</h3><p>' + product.buyerValue + '</p><div class="tagrow">' +
          product.tags.slice(0, 4).map(tag => '<span class="tag">' + tag + '</span>').join('') +
          '</div></article>';
      }).join('');
    }

    async function runPreview(options) {
      const opts = options || {};
      if (!opts.system) userStartedPreview = true;
      const requestId = ++activePreviewRequest;
      const raw = input.value.trim();
      const selected = kind.value;
      const label = labels[selected] || 'Selected';
      output.textContent = 'Running ' + label + ' preview...';
      runButton.textContent = 'Running...';
      runButton.setAttribute('aria-busy', 'true');
      if (opts.scroll) {
        workbench.scrollIntoView({ behavior: 'smooth', block: 'start' });
        output.focus({ preventScroll: true });
      }
      let path = '';
      let body = {};
      if (selected === 'cyber') {
        path = '/v1/adapters/cyber/vuln-priority/preview';
        body = { cves: raw.split(/[,\s]+/).filter(Boolean) };
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
        body = { seriesIds: raw.split(/[,\s]+/).filter(Boolean), limit: 3 };
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

    kind.addEventListener('change', () => { input.value = examples[kind.value]; });
    document.getElementById('runPreview').addEventListener('click', runPreview);
    document.getElementById('refresh').addEventListener('click', async () => { await loadReadiness(); await loadProducts(); await runPreview(); });
    document.querySelectorAll('[data-action]').forEach(button => {
      button.addEventListener('click', () => {
        kind.value = heroActions[button.dataset.action] || button.dataset.action;
        input.value = examples[kind.value];
        runPreview({ scroll: true });
      });
    });

    Promise.all([loadReadiness(), loadProducts()])
      .then(() => { if (!userStartedPreview) return runPreview({ system: true }); })
      .catch(error => pretty({ error }));
  </script>
</body>
</html>`;
}
