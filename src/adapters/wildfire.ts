export interface WildfireAlertRequest {
  area?: string;
  point?: {
    lat: number;
    lon: number;
  };
}

export interface WildfireAlertSummary {
  id: string;
  event: string;
  headline: string | null;
  severity: string | null;
  urgency: string | null;
  certainty: string | null;
  effective: string | null;
  expires: string | null;
  areaDesc: string | null;
  wildfireRelevant: boolean;
  instruction: string | null;
}

export interface WildfireAlertsReport {
  generatedAt: string;
  query: WildfireAlertRequest;
  source: {
    sourceId: "nws_alerts";
    url: string;
    retrievalMode: "read_only_public_api";
  };
  alertCount: number;
  wildfireRelevantCount: number;
  alerts: WildfireAlertSummary[];
  caveats: string[];
}

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

const NWS_ALERTS_URL = "https://api.weather.gov/alerts/active";

export async function fetchWildfireAlerts(request: WildfireAlertRequest, fetcher: FetchLike = fetch): Promise<WildfireAlertsReport> {
  const url = new URL(NWS_ALERTS_URL);
  if (request.area) {
    url.searchParams.set("area", request.area.toUpperCase());
  }
  if (request.point) {
    url.searchParams.set("point", `${request.point.lat.toFixed(4)},${request.point.lon.toFixed(4)}`);
  }

  const response = await fetcher(url.toString(), {
    headers: {
      Accept: "application/geo+json, application/json",
      "User-Agent": "agent-opportunity-exchange/0.1 read-only wildfire source adapter",
    },
  });
  if (!response.ok) {
    throw new Error(`NWS alerts request failed: ${response.status}`);
  }

  const body = (await response.json()) as NwsAlertsResponse;
  const alerts = (body.features ?? []).slice(0, 50).map((feature) => summarizeAlert(feature));
  return {
    generatedAt: new Date().toISOString(),
    query: request,
    source: {
      sourceId: "nws_alerts",
      url: url.toString(),
      retrievalMode: "read_only_public_api",
    },
    alertCount: alerts.length,
    wildfireRelevantCount: alerts.filter((alert) => alert.wildfireRelevant).length,
    alerts,
    caveats: [
      "This is a public NWS alert preview, not an incident-command product.",
      "Use official local emergency management channels for evacuation and life-safety decisions.",
      "No drone operation, dispatch, or public alert send is authorized by this report.",
    ],
  };
}

function summarizeAlert(feature: NwsAlertFeature): WildfireAlertSummary {
  const props = feature.properties ?? {};
  const event = props.event ?? "Unknown event";
  const headline = props.headline ?? null;
  const instruction = props.instruction ? truncate(props.instruction, 280) : null;
  return {
    id: feature.id ?? props.id ?? "unknown",
    event,
    headline,
    severity: props.severity ?? null,
    urgency: props.urgency ?? null,
    certainty: props.certainty ?? null,
    effective: props.effective ?? null,
    expires: props.expires ?? null,
    areaDesc: props.areaDesc ?? null,
    wildfireRelevant: isWildfireRelevant([event, headline, props.description, instruction].filter(Boolean).join(" ")),
    instruction,
  };
}

function isWildfireRelevant(text: string): boolean {
  return /red flag|fire weather|wildfire|wild land fire|wildland fire|smoke|evacuat|air quality/i.test(text);
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3).trim()}...`;
}

interface NwsAlertsResponse {
  features?: NwsAlertFeature[];
}

interface NwsAlertFeature {
  id?: string;
  properties?: {
    id?: string;
    event?: string;
    headline?: string;
    severity?: string;
    urgency?: string;
    certainty?: string;
    effective?: string;
    expires?: string;
    areaDesc?: string;
    description?: string;
    instruction?: string;
  };
}
