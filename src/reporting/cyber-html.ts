import type { CyberInventoryPriorityPreview, VulnPriorityReport } from "../adapters/cyber.js";
import type { CyberExpertCaseBrief } from "../adapters/cyber-case-brief.js";

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

export function renderCyberInventoryPriorityHtml(report: CyberInventoryPriorityPreview): string {
  const rows = report.findings
    .map((finding) => {
      const assets =
        finding.buyerEvidence.affectedAssets.length === 0
          ? "No submitted asset row"
          : finding.buyerEvidence.affectedAssets
              .map((asset) =>
                [
                  asset.label,
                  asset.criticality ? `criticality: ${asset.criticality}` : null,
                  asset.environment ? `env: ${asset.environment}` : null,
                  asset.internetFacing === true ? "internet-facing" : null,
                  asset.owner ? `owner: ${asset.owner}` : null,
                ]
                  .filter(Boolean)
                  .map((part) => escapeHtml(String(part)))
                  .join("<br>"),
              )
              .join("<hr>");
      const signals = finding.buyerEvidence.exposureSignals.length
        ? finding.buyerEvidence.exposureSignals.map(escapeHtml).join(", ")
        : "No submitted exposure signal";

      return `
        <tr>
          <td><code>${escapeHtml(finding.cve)}</code></td>
          <td><span class="tier ${escapeHtml(finding.tier)}">${escapeHtml(finding.tier.replaceAll("_", " "))}</span></td>
          <td>${finding.kev.knownExploited ? "Yes" : "No"}</td>
          <td>${formatNumber(finding.epss.score)}</td>
          <td>${escapeHtml(finding.nvd?.baseSeverity ?? "Unknown")}</td>
          <td>${escapeHtml(signals)}</td>
          <td>${assets}</td>
          <td>${escapeHtml(finding.buyerEvidence.buyerPriorityReason)}</td>
        </tr>`;
    })
    .join("\n");

  const buyer = report.input.buyer;
  const caveats = report.caveats.map((caveat) => `<li>${escapeHtml(caveat)}</li>`).join("\n");
  const outputPolicy = report.outputPolicy.map((policy) => `<li>${escapeHtml(policy)}</li>`).join("\n");
  const sources = report.sources
    .map((source) => `<li><code>${escapeHtml(source.sourceId)}</code> - <a href="${escapeAttribute(source.url)}">${escapeHtml(source.url)}</a></li>`)
    .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Authorized Cyber Inventory Priority Report</title>
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
      max-width: 1180px;
      margin: 0 auto;
      padding: 32px 24px 48px;
    }
    h1 {
      margin: 0 0 8px;
      font-size: 28px;
      letter-spacing: 0;
    }
    h2 {
      font-size: 18px;
      margin: 0 0 10px;
    }
    .summary {
      color: var(--muted);
      margin: 0 0 24px;
    }
    .meta, .notice, .summary-grid {
      background: var(--wash);
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 14px 16px;
      margin: 18px 0;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 12px;
    }
    .metric strong {
      display: block;
      font-size: 24px;
      line-height: 1;
    }
    .metric span {
      color: var(--muted);
      font-size: 12px;
      text-transform: uppercase;
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
    hr {
      border: 0;
      border-top: 1px solid var(--line);
      margin: 8px 0;
    }
    .tier {
      display: inline-block;
      border-radius: 999px;
      padding: 2px 8px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
    }
    .fix_today { color: #fff; background: var(--fix); }
    .fix_this_week { color: #fff; background: var(--week); }
    .monitor { color: #fff; background: var(--monitor); }
    .needs_review { color: var(--ink); background: #dbe4ee; }
    a { color: #1459a8; }
    @media (max-width: 860px) {
      .summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      table { display: block; overflow-x: auto; }
    }
  </style>
</head>
<body>
  <main>
    <h1>Authorized Cyber Inventory Priority Report</h1>
    <p class="summary">Buyer-supplied inventory mapped to public CISA KEV, FIRST EPSS, and NVD evidence. No active scan was performed and no exploit instructions are included.</p>

    <section class="meta">
      <strong>Generated:</strong> ${escapeHtml(report.generatedAt)}<br>
      <strong>Buyer:</strong> ${escapeHtml(buyer?.name ?? buyer?.buyerId ?? "not provided")}<br>
      <strong>Use case:</strong> ${escapeHtml(buyer?.useCase ?? "defensive prioritization")}<br>
      <strong>Inventory rows:</strong> ${report.input.assetRows}<br>
      <strong>Unique CVEs:</strong> ${report.input.cveCount}<br>
      <strong>Authorized inventory required:</strong> ${report.input.authorizedInventoryRequired ? "Yes" : "No"}
    </section>

    <section class="summary-grid" aria-label="Priority summary">
      <div class="metric"><strong>${report.summary.fixToday}</strong><span>Fix today</span></div>
      <div class="metric"><strong>${report.summary.fixThisWeek}</strong><span>Fix this week</span></div>
      <div class="metric"><strong>${report.summary.needsReview}</strong><span>Needs review</span></div>
      <div class="metric"><strong>${report.summary.monitor}</strong><span>Monitor</span></div>
      <div class="metric"><strong>${report.summary.affectedAssets}</strong><span>Affected assets</span></div>
    </section>

    <table>
      <thead>
        <tr>
          <th>CVE</th>
          <th>Tier</th>
          <th>KEV</th>
          <th>EPSS</th>
          <th>NVD Severity</th>
          <th>Exposure</th>
          <th>Submitted Assets</th>
          <th>Buyer Priority Reason</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>

    <section class="notice">
      <h2>Output Policy</h2>
      <ul>${outputPolicy}</ul>
    </section>

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

export function renderCyberExpertCaseBriefHtml(brief: CyberExpertCaseBrief): string {
  const priorityRows = brief.deterministicPreview.priorityQueue
    .map(
      (priority) => `
        <tr>
          <td><code>${escapeHtml(priority.priorityId)}</code></td>
          <td><span class="tier ${escapeHtml(priority.tier)}">${escapeHtml(priority.tier.replaceAll("_", " "))}</span></td>
          <td>${escapeHtml(priority.title)}</td>
          <td>${escapeHtml(priority.rationale)}</td>
          <td>${escapeHtml(priority.nextAction)}</td>
          <td>${priority.citations.map((citation) => `<code>${escapeHtml(citation)}</code>`).join("<br>")}</td>
        </tr>`,
    )
    .join("\n");
  const publicRefreshRows = (brief.publicCveRefresh?.sourceResults ?? [])
    .map(
      (source) => `
        <tr>
          <td><code>${escapeHtml(source.sourceId)}</code></td>
          <td>${escapeHtml(source.status)}</td>
          <td>official public source</td>
          <td>${escapeHtml(source.cacheStatus ?? "n/a")}</td>
          <td>${escapeHtml(source.errorCode ?? "ok")}</td>
        </tr>`,
    )
    .join("\n");
  const recordRows = (brief.publicCveRefresh?.records ?? [])
    .slice(0, 25)
    .map(
      (record) => `
        <tr>
          <td><code>${escapeHtml(record.cve)}</code></td>
          <td>${record.kev.knownExploited ? "Yes" : "No"}</td>
          <td>${formatNumber(record.epss.score)}</td>
          <td>${escapeHtml(record.nvd.severity ?? "Unknown")}</td>
          <td>${record.sourceIds.map((sourceId) => `<code>${escapeHtml(sourceId)}</code>`).join("<br>")}</td>
        </tr>`,
    )
    .join("\n");
  const recommendedActions = brief.operatorDecision.recommendedActions.map((action) => `<li>${escapeHtml(action)}</li>`).join("\n");
  const blockedActions = brief.operatorDecision.blockedActions.map((action) => `<li>${escapeHtml(action)}</li>`).join("\n");
  const outputPolicy = brief.safety.outputPolicy.map((policy) => `<li>${escapeHtml(policy)}</li>`).join("\n");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Cyber Expert Case Brief</title>
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
      --review: #285da8;
    }
    body {
      margin: 0;
      font: 15px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      color: var(--ink);
      background: #fff;
    }
    main {
      max-width: 1180px;
      margin: 0 auto;
      padding: 32px 24px 48px;
    }
    h1 {
      margin: 0 0 8px;
      font-size: 28px;
      letter-spacing: 0;
    }
    h2 {
      font-size: 18px;
      margin: 0 0 10px;
    }
    .summary {
      color: var(--muted);
      margin: 0 0 24px;
    }
    .meta, .notice, .summary-grid {
      background: var(--wash);
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 14px 16px;
      margin: 18px 0;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 12px;
    }
    .metric strong {
      display: block;
      font-size: 24px;
      line-height: 1;
    }
    .metric span {
      color: var(--muted);
      font-size: 12px;
      text-transform: uppercase;
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
    .fix_today { color: #fff; background: var(--fix); }
    .fix_this_week { color: #fff; background: var(--week); }
    .monitor { color: #fff; background: var(--monitor); }
    .needs_human_review { color: #fff; background: var(--review); }
    a { color: #1459a8; }
    @media (max-width: 860px) {
      .summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      table { display: block; overflow-x: auto; }
    }
  </style>
</head>
<body>
  <main>
    <h1>Cyber Expert Case Brief</h1>
    <p class="summary">Defensive operator brief from hashed case-store evidence, optional public CVE freshness, and optional local model advisory output. No active scan was performed and no exploit instructions are included.</p>

    <section class="meta">
      <strong>Generated:</strong> ${escapeHtml(brief.generatedAt)}<br>
      <strong>Case:</strong> ${escapeHtml(brief.case.title)}<br>
      <strong>Case ID:</strong> <code>${escapeHtml(brief.case.caseId)}</code><br>
      <strong>Decision posture:</strong> ${escapeHtml(brief.operatorDecision.posture.replaceAll("_", " "))}<br>
      <strong>Human review required:</strong> ${brief.operatorDecision.humanReviewRequired ? "Yes" : "No"}<br>
      <strong>Local model:</strong> ${escapeHtml(brief.localModelPreview?.localModel.status ?? "not requested")}
    </section>

    <section class="summary-grid" aria-label="Operator decision summary">
      <div class="metric"><strong>${brief.operatorDecision.fixTodayCount}</strong><span>Fix today</span></div>
      <div class="metric"><strong>${brief.operatorDecision.knownExploitedCount}</strong><span>Known exploited</span></div>
      <div class="metric"><strong>${brief.operatorDecision.highEpssCount}</strong><span>High EPSS</span></div>
      <div class="metric"><strong>${brief.deterministicPreview.caseStore.evidenceRecords.length}</strong><span>Evidence records</span></div>
      <div class="metric"><strong>${brief.publicCveRefresh?.returnedCveCount ?? 0}</strong><span>Fresh CVEs</span></div>
    </section>

    <section>
      <h2>Priority Queue</h2>
      <table>
        <thead>
          <tr>
            <th>Priority</th>
            <th>Tier</th>
            <th>Title</th>
            <th>Rationale</th>
            <th>Next action</th>
            <th>Citations</th>
          </tr>
        </thead>
        <tbody>${priorityRows || `<tr><td colspan="6">No vulnerability priority rows were produced.</td></tr>`}</tbody>
      </table>
    </section>

    <section class="notice">
      <h2>Recommended Actions</h2>
      <ul>${recommendedActions}</ul>
    </section>

    <section class="notice">
      <h2>Blocked Actions</h2>
      <ul>${blockedActions}</ul>
    </section>

    <section>
      <h2>Public Source Freshness</h2>
      <table>
        <thead>
          <tr>
            <th>Source</th>
            <th>Status</th>
            <th>Retrieval</th>
            <th>Cache</th>
            <th>Message</th>
          </tr>
        </thead>
        <tbody>${publicRefreshRows || `<tr><td colspan="5">Public CVE refresh was not requested for this brief.</td></tr>`}</tbody>
      </table>
    </section>

    <section>
      <h2>Refreshed CVE Evidence</h2>
      <table>
        <thead>
          <tr>
            <th>CVE</th>
            <th>KEV</th>
            <th>EPSS</th>
            <th>NVD Severity</th>
            <th>Sources</th>
          </tr>
        </thead>
        <tbody>${recordRows || `<tr><td colspan="5">No refreshed public CVE records are attached.</td></tr>`}</tbody>
      </table>
    </section>

    <section class="notice">
      <h2>Proof</h2>
      <p><strong>Brief hash:</strong> <code>${escapeHtml(brief.evidenceProof.briefHash)}</code></p>
      <p><strong>Deterministic preview hash:</strong> <code>${escapeHtml(brief.evidenceProof.deterministicPreviewHash)}</code></p>
      <p><strong>Public refresh hash:</strong> <code>${escapeHtml(brief.evidenceProof.publicCveRefreshHash ?? "not requested")}</code></p>
      <p><strong>Local model hash:</strong> <code>${escapeHtml(brief.evidenceProof.localModelPreviewHash ?? "not requested")}</code></p>
    </section>

    <section class="notice">
      <h2>Output Policy</h2>
      <ul>${outputPolicy}</ul>
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
