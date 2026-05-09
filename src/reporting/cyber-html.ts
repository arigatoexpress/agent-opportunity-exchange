import type { VulnPriorityReport } from "../adapters/cyber.js";

export function renderCyberPriorityHtml(report: VulnPriorityReport): string {
  const rows = report.findings
    .map(
      (finding) => `
        <tr>
          <td><code>${escapeHtml(finding.cve)}</code></td>
          <td><span class="tier ${escapeHtml(finding.tier)}">${escapeHtml(finding.tier.replaceAll("_", " "))}</span></td>
          <td>${finding.kev.knownExploited ? "Yes" : "No"}</td>
          <td>${formatNumber(finding.epss.score)}</td>
          <td>${escapeHtml(finding.nvd?.baseSeverity ?? "Unknown")}</td>
          <td>${formatNumber(finding.nvd?.baseScore ?? null)}</td>
          <td>${escapeHtml(finding.reason)}</td>
        </tr>`,
    )
    .join("\n");

  const caveats = report.caveats.map((caveat) => `<li>${escapeHtml(caveat)}</li>`).join("\n");
  const sources = report.sources
    .map((source) => `<li><code>${escapeHtml(source.sourceId)}</code> - <a href="${escapeAttribute(source.url)}">${escapeHtml(source.url)}</a></li>`)
    .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Exploited Vulnerability Priority Pack</title>
  <style>
    :root {
      color-scheme: light;
      --ink: #17202a;
      --muted: #52616f;
      --line: #d8dee6;
      --wash: #f6f8fb;
      --fix: #b3261e;
      --week: #8a5a00;
      --monitor: #246b4b;
    }
    body {
      margin: 0;
      font: 15px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      color: var(--ink);
      background: #fff;
    }
    main {
      max-width: 1120px;
      margin: 0 auto;
      padding: 32px 24px 48px;
    }
    h1 {
      margin: 0 0 8px;
      font-size: 28px;
      letter-spacing: 0;
    }
    .summary {
      color: var(--muted);
      margin: 0 0 24px;
    }
    .meta, .notice {
      background: var(--wash);
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 14px 16px;
      margin: 18px 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 18px;
    }
    th, td {
      text-align: left;
      vertical-align: top;
      border-bottom: 1px solid var(--line);
      padding: 10px 8px;
    }
    th {
      font-size: 12px;
      text-transform: uppercase;
      color: var(--muted);
      background: var(--wash);
    }
    code {
      font-family: "SFMono-Regular", Consolas, monospace;
      font-size: 13px;
    }
    .tier {
      display: inline-block;
      border-radius: 999px;
      padding: 2px 8px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
    }
    .fix_today {
      color: #fff;
      background: var(--fix);
    }
    .fix_this_week {
      color: #fff;
      background: var(--week);
    }
    .monitor {
      color: #fff;
      background: var(--monitor);
    }
    .needs_review {
      color: var(--ink);
      background: #dbe4ee;
    }
    a {
      color: #1459a8;
    }
  </style>
</head>
<body>
  <main>
    <h1>Exploited Vulnerability Priority Pack</h1>
    <p class="summary">Defensive prioritization from public CISA KEV, FIRST EPSS, and NVD data. No scan was performed and no exploit instructions are included.</p>

    <section class="meta">
      <strong>Generated:</strong> ${escapeHtml(report.generatedAt)}<br>
      <strong>Input CVEs:</strong> ${report.inputCount}
    </section>

    <table>
      <thead>
        <tr>
          <th>CVE</th>
          <th>Tier</th>
          <th>KEV</th>
          <th>EPSS</th>
          <th>NVD Severity</th>
          <th>NVD Score</th>
          <th>Reason</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>

    <section class="notice">
      <h2>Caveats</h2>
      <ul>${caveats}</ul>
    </section>

    <section class="notice">
      <h2>Sources</h2>
      <ul>${sources}</ul>
    </section>
  </main>
</body>
</html>
`;
}

function formatNumber(value: number | null): string {
  if (value === null) return "n/a";
  return value.toFixed(value >= 1 ? 1 : 4);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttribute(value: string): string {
  return escapeHtml(value).replaceAll("`", "&#96;");
}
