import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { sha256, shortHash } from "./hash.js";

export const TELEGRAM_STATUS_SCHEMA_ID = "aoe.telegram.status.v1";
export const TELEGRAM_REGISTRATION_SCHEMA_ID = "aoe.telegram.registration.v1";

const TELEGRAM_MINI_APPS_DOC_URL = "https://core.telegram.org/bots/webapps";
const TELEGRAM_BOT_FEATURES_DOC_URL = "https://core.telegram.org/bots/features";
const MIRA_PUBLIC_URL = "https://mira.tg/";
const DEFAULT_MAX_INIT_DATA_AGE_SECONDS = 86_400;

const cadenceSchema = z.enum(["immediate", "daily", "weekly"]);

export const telegramRegistrationRequestSchema = z.object({
  initData: z.string().min(20).max(12_000),
  preferences: z
    .object({
      productUpdates: z.boolean().default(true),
      marketProofs: z.boolean().default(true),
      cyberAlerts: z.boolean().default(false),
      wildfireReadOnly: z.boolean().default(false),
      developerRadar: z.boolean().default(true),
      cadence: cadenceSchema.default("daily"),
    })
    .default({
      productUpdates: true,
      marketProofs: true,
      cyberAlerts: false,
      wildfireReadOnly: false,
      developerRadar: true,
      cadence: "daily",
    }),
  consent: z.object({
    telegramUpdates: z.literal(true),
    privacyAcknowledged: z.literal(true),
    noFinancialAdviceAcknowledged: z.literal(true),
  }),
});

type TelegramRegistrationRequest = z.infer<typeof telegramRegistrationRequestSchema>;
type TelegramPreferences = TelegramRegistrationRequest["preferences"];

interface TelegramUser {
  id: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  language_code?: string;
  allows_write_to_pm?: boolean;
}

export type TelegramInitDataValidation =
  | {
      ok: true;
      authDate: string;
      queryId: string | null;
      startParam: string | null;
      user: TelegramUser;
    }
  | {
      ok: false;
      reason:
        | "missing_hash"
        | "malformed_hash"
        | "missing_auth_date"
        | "expired_auth_date"
        | "missing_user"
        | "malformed_user"
        | "signature_mismatch";
    };

export function getTelegramBotToken(env: NodeJS.ProcessEnv = process.env): string | null {
  return env.AOE_TELEGRAM_BOT_TOKEN || env.TELEGRAM_BOT_TOKEN || null;
}

export function buildTelegramStatus(baseUrl = "", now = new Date()) {
  const tokenConfigured = Boolean(getTelegramBotToken());
  const miniAppRoute = "/telegram";
  const registerRoute = "/v1/telegram/register";

  return {
    schemaId: TELEGRAM_STATUS_SCHEMA_ID,
    generatedAt: now.toISOString(),
    integrationId: "telegram_mini_app_opt_in",
    status: tokenConfigured ? "configured_for_verified_init_data" : "bot_token_required",
    telegramSurface: "Mini App / Web App",
    miraPosture: "Mira is treated as a market/UX reference, not an official Telegram API dependency.",
    tokenConfigured,
    initDataVerificationRequired: true,
    outboundTelegramSendsAllowed: false,
    webhookRegistrationAllowed: false,
    messagesSent: 0,
    optInLedgerEnabled: false,
    liveSettlementAllowed: false,
    externalSideEffectsAllowed: false,
    endpoints: {
      miniApp: absoluteUrl(baseUrl, miniAppRoute),
      status: absoluteUrl(baseUrl, "/v1/telegram/status"),
      register: absoluteUrl(baseUrl, registerRoute),
    },
    docs: {
      telegramMiniApps: TELEGRAM_MINI_APPS_DOC_URL,
      telegramBotFeatures: TELEGRAM_BOT_FEATURES_DOC_URL,
      miraReference: MIRA_PUBLIC_URL,
    },
    setup: [
      "Create a Telegram bot with BotFather and configure the Mini App URL to /telegram.",
      "Set AOE_TELEGRAM_BOT_TOKEN in the service environment.",
      "Only after a separate apply gate, add webhook registration and outbound update delivery.",
    ],
    caveats: tokenConfigured
      ? ["Registration verifies Telegram initData and returns a non-secret receipt only.", "No Telegram messages are sent by this service."]
      : ["AOE_TELEGRAM_BOT_TOKEN is not configured; /v1/telegram/register fails closed for real registration."],
  };
}

export function validateTelegramInitData(
  initData: string,
  botToken: string,
  now = new Date(),
  maxAgeSeconds = DEFAULT_MAX_INIT_DATA_AGE_SECONDS,
): TelegramInitDataValidation {
  const params = new URLSearchParams(initData);
  const receivedHash = params.get("hash");

  if (!receivedHash) {
    return { ok: false, reason: "missing_hash" };
  }

  if (!/^[a-f0-9]{64}$/i.test(receivedHash)) {
    return { ok: false, reason: "malformed_hash" };
  }

  params.delete("hash");
  const dataCheckString = [...params.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
  const expectedHash = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  if (!safeHexEqual(expectedHash, receivedHash)) {
    return { ok: false, reason: "signature_mismatch" };
  }

  const authDateRaw = params.get("auth_date");
  const authDateSeconds = Number(authDateRaw);
  if (!authDateRaw || !Number.isFinite(authDateSeconds)) {
    return { ok: false, reason: "missing_auth_date" };
  }

  const ageSeconds = Math.floor(now.getTime() / 1000) - authDateSeconds;
  if (ageSeconds > maxAgeSeconds) {
    return { ok: false, reason: "expired_auth_date" };
  }

  const userRaw = params.get("user");
  if (!userRaw) {
    return { ok: false, reason: "missing_user" };
  }

  const user = parseTelegramUser(userRaw);
  if (!user) {
    return { ok: false, reason: "malformed_user" };
  }

  return {
    ok: true,
    authDate: new Date(authDateSeconds * 1000).toISOString(),
    queryId: params.get("query_id"),
    startParam: params.get("start_param"),
    user,
  };
}

export function buildTelegramRegistrationReceipt(request: TelegramRegistrationRequest, validation: Extract<TelegramInitDataValidation, { ok: true }>, now = new Date()) {
  const preferenceSummary = summarizePreferences(request.preferences);
  const registrationId = `tg_reg_${shortHash(
    {
      telegramUserId: validation.user.id,
      authDate: validation.authDate,
      startParam: validation.startParam,
      preferences: preferenceSummary,
      consentVersion: "2026-05-11",
    },
    20,
  )}`;

  return {
    schemaId: TELEGRAM_REGISTRATION_SCHEMA_ID,
    registered: true,
    mode: "verified_telegram_mini_app_init_data",
    registrationId,
    generatedAt: now.toISOString(),
    telegramUserHash: sha256({ telegramUserId: validation.user.id }),
    userPreview: {
      usernamePresent: Boolean(validation.user.username),
      languageCode: validation.user.language_code ?? null,
      allowsWriteToPm: validation.user.allows_write_to_pm ?? null,
    },
    auth: {
      authDate: validation.authDate,
      queryIdPresent: Boolean(validation.queryId),
      startParam: validation.startParam,
      verifiedWithBotToken: true,
      rawInitDataEchoed: false,
    },
    optIn: {
      telegramUpdates: true,
      cadence: request.preferences.cadence,
      topics: preferenceSummary.topics,
      consent: {
        privacyAcknowledged: true,
        noFinancialAdviceAcknowledged: true,
      },
    },
    storage: {
      stored: false,
      mode: "stateless_demo_receipt",
      reason: "Persistent opt-in storage is disabled until retention, unsubscribe, and outbound-send policy are approved.",
    },
    outboundTelegramSendsAllowed: false,
    webhookRegistrationAllowed: false,
    messagesSent: 0,
    liveSettlementAllowed: false,
    externalSideEffectsAllowed: false,
    nextSteps: [
      "Add a reviewed opt-in table with retention and unsubscribe semantics.",
      "Add webhook registration behind an explicit apply gate.",
      "Add outbound Telegram update delivery only after production-send approval.",
    ],
  };
}

export function renderTelegramMiniAppHtml(baseUrl = ""): string {
  const statusUrl = absoluteUrl(baseUrl, "/v1/telegram/status");
  const registerUrl = absoluteUrl(baseUrl, "/v1/telegram/register");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>AOE Telegram Registration</title>
  <script src="https://telegram.org/js/telegram-web-app.js?62"></script>
  <style>
    :root {
      color-scheme: light dark;
      --bg: var(--tg-theme-bg-color, #f8fafc);
      --text: var(--tg-theme-text-color, #0f172a);
      --muted: var(--tg-theme-hint-color, #64748b);
      --panel: var(--tg-theme-secondary-bg-color, #ffffff);
      --button: var(--tg-theme-button-color, #2563eb);
      --button-text: var(--tg-theme-button-text-color, #ffffff);
      --border: rgba(15, 23, 42, 0.12);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--text);
    }
    main {
      min-height: 100vh;
      padding: 20px;
      display: grid;
      align-content: start;
      gap: 14px;
    }
    .panel {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 16px;
      box-shadow: 0 16px 40px rgba(15, 23, 42, 0.08);
    }
    h1 {
      margin: 0 0 8px;
      font-size: 22px;
      line-height: 1.15;
      letter-spacing: 0;
    }
    p {
      margin: 0;
      color: var(--muted);
      line-height: 1.5;
      font-size: 14px;
    }
    .status {
      display: grid;
      gap: 8px;
      margin-top: 12px;
      font-size: 13px;
    }
    .status div {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      border-top: 1px solid var(--border);
      padding-top: 8px;
    }
    .status strong { text-align: right; }
    fieldset {
      border: 0;
      padding: 0;
      margin: 0;
      display: grid;
      gap: 10px;
    }
    label {
      display: flex;
      gap: 10px;
      align-items: center;
      font-size: 15px;
    }
    select {
      width: 100%;
      padding: 10px;
      border: 1px solid var(--border);
      border-radius: 6px;
      background: var(--bg);
      color: var(--text);
      font: inherit;
    }
    button {
      width: 100%;
      border: 0;
      border-radius: 7px;
      padding: 12px 14px;
      background: var(--button);
      color: var(--button-text);
      font: inherit;
      font-weight: 700;
      cursor: pointer;
    }
    button:disabled {
      opacity: 0.55;
      cursor: wait;
    }
    pre {
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      margin: 0;
      padding: 12px;
      border-radius: 7px;
      border: 1px solid var(--border);
      background: rgba(15, 23, 42, 0.05);
      font-size: 12px;
      line-height: 1.45;
      max-height: 280px;
      overflow: auto;
    }
    .warn { color: #b45309; }
    .ok { color: #047857; }
  </style>
</head>
<body>
  <main>
    <section class="panel">
      <h1>Agent Opportunity Exchange</h1>
      <p>Secure Telegram opt-in for evidence-stream updates. The service verifies Telegram Mini App init data before creating a registration receipt.</p>
      <div class="status" aria-label="Telegram readiness">
        <div><span>Mini App context</span><strong id="contextState">checking</strong></div>
        <div><span>Registration endpoint</span><strong id="endpointState">checking</strong></div>
        <div><span>Telegram sends</span><strong>disabled</strong></div>
      </div>
    </section>

    <section class="panel">
      <fieldset>
        <label><input type="checkbox" id="productUpdates" checked> Product updates</label>
        <label><input type="checkbox" id="marketProofs" checked> Market proof alerts</label>
        <label><input type="checkbox" id="cyberAlerts"> Cyber priority alerts</label>
        <label><input type="checkbox" id="developerRadar" checked> Developer radar</label>
        <label><input type="checkbox" id="wildfireReadOnly"> Wildfire read-only signals</label>
        <label for="cadence">Cadence</label>
        <select id="cadence">
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="immediate">Immediate</option>
        </select>
      </fieldset>
    </section>

    <section class="panel">
      <fieldset>
        <label><input type="checkbox" id="privacy" checked> I consent to Telegram updates from this system.</label>
        <label><input type="checkbox" id="risk" checked> I understand market outputs are research context, not financial advice.</label>
        <button id="register">Register Securely</button>
      </fieldset>
    </section>

    <pre id="result">Loading Telegram integration status...</pre>
  </main>

  <script>
    const tg = window.Telegram && window.Telegram.WebApp;
    const result = document.getElementById('result');
    const register = document.getElementById('register');
    const contextState = document.getElementById('contextState');
    const endpointState = document.getElementById('endpointState');

    function write(value) {
      result.textContent = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
    }

    function preferences() {
      return {
        productUpdates: document.getElementById('productUpdates').checked,
        marketProofs: document.getElementById('marketProofs').checked,
        cyberAlerts: document.getElementById('cyberAlerts').checked,
        developerRadar: document.getElementById('developerRadar').checked,
        wildfireReadOnly: document.getElementById('wildfireReadOnly').checked,
        cadence: document.getElementById('cadence').value
      };
    }

    async function loadStatus() {
      if (tg) {
        tg.ready();
        tg.expand();
      }
      contextState.textContent = tg && tg.initData ? 'signed initData present' : 'open inside Telegram';
      contextState.className = tg && tg.initData ? 'ok' : 'warn';
      if (!(tg && tg.initData)) {
        register.disabled = true;
        register.textContent = 'Open Inside Telegram';
      }
      const response = await fetch('${statusUrl}');
      const status = await response.json();
      endpointState.textContent = status.tokenConfigured ? 'configured' : 'token required';
      endpointState.className = status.tokenConfigured ? 'ok' : 'warn';
      write(status);
    }

    register.addEventListener('click', async () => {
      register.disabled = true;
      try {
        const response = await fetch('${registerUrl}', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            initData: tg && tg.initData ? tg.initData : '',
            preferences: preferences(),
            consent: {
              telegramUpdates: document.getElementById('privacy').checked,
              privacyAcknowledged: document.getElementById('privacy').checked,
              noFinancialAdviceAcknowledged: document.getElementById('risk').checked
            }
          })
        });
        write(await response.json());
      } catch (error) {
        write({ error: 'registration_failed', message: String(error) });
      } finally {
        register.disabled = false;
      }
    });

    loadStatus().catch(error => write({ error: 'status_failed', message: String(error) }));
  </script>
</body>
</html>`;
}

function summarizePreferences(preferences: TelegramPreferences) {
  const topics = [
    preferences.productUpdates ? "product_updates" : null,
    preferences.marketProofs ? "market_proofs" : null,
    preferences.cyberAlerts ? "cyber_alerts" : null,
    preferences.wildfireReadOnly ? "wildfire_read_only" : null,
    preferences.developerRadar ? "developer_radar" : null,
  ].filter((topic): topic is string => Boolean(topic));

  return {
    cadence: preferences.cadence,
    topics,
  };
}

function parseTelegramUser(raw: string): TelegramUser | null {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const id = parsed.id;
    if (typeof id !== "number" && typeof id !== "string") return null;

    return {
      id: String(id),
      username: typeof parsed.username === "string" ? parsed.username : undefined,
      first_name: typeof parsed.first_name === "string" ? parsed.first_name : undefined,
      last_name: typeof parsed.last_name === "string" ? parsed.last_name : undefined,
      language_code: typeof parsed.language_code === "string" ? parsed.language_code : undefined,
      allows_write_to_pm: typeof parsed.allows_write_to_pm === "boolean" ? parsed.allows_write_to_pm : undefined,
    };
  } catch {
    return null;
  }
}

function safeHexEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, "hex");
  const rightBuffer = Buffer.from(right, "hex");
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function absoluteUrl(baseUrl: string, path: string): string {
  return baseUrl ? `${baseUrl.replace(/\/$/, "")}${path}` : path;
}
