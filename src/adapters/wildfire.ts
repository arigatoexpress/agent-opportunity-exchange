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

export interface WfigsPerimeterRequest {
  state?: string;
  limit?: number;
}

export interface WfigsPerimeterSummary {
  incidentName: string | null;
  uniqueFireIdentifier: string | null;
  irwinId: string | null;
  state: string | null;
  county: string | null;
  gisAcres: number | null;
  finalAcres: number | null;
  percentContained: number | null;
  fireCause: string | null;
  featureCategory: string | null;
  dateCurrent: string | null;
  modifiedAt: string | null;
}

export interface WfigsPerimetersReport {
  generatedAt: string;
  query: WfigsPerimeterRequest;
  source: {
    sourceId: "nifc_wfigs";
    url: string;
    retrievalMode: "read_only_public_arcgis";
  };
  perimeterCount: number;
  perimeters: WfigsPerimeterSummary[];
  caveats: string[];
}

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

const NWS_ALERTS_URL = "https://api.weather.gov/alerts/active";
const WFIGS_CURRENT_PERIMETERS_URL =
  "https://services3.arcgis.com/T4QMspbfLg3qTGWY/arcgis/rest/services/WFIGS_Interagency_Perimeters_Current/FeatureServer/0/query";

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

export async function fetchWfigsCurrentPerimeters(request: WfigsPerimeterRequest, fetcher: FetchLike = fetch): Promise<WfigsPerimetersReport> {
  const limit = Math.max(1, Math.min(request.limit ?? 10, 100));
  const url = new URL(WFIGS_CURRENT_PERIMETERS_URL);
  url.searchParams.set("f", "json");
  url.searchParams.set("returnGeometry", "false");
  url.searchParams.set("resultRecordCount", String(limit));
  url.searchParams.set("orderByFields", "poly_DateCurrent DESC");
  url.searchParams.set(
    "outFields",
    [
      "poly_IncidentName",
      "poly_FeatureCategory",
      "poly_GISAcres",
      "poly_DateCurrent",
      "poly_IRWINID",
      "attr_IncidentName",
      "attr_UniqueFireIdentifier",
      "attr_POOState",
      "attr_POOCounty",
      "attr_FinalAcres",
      "attr_PercentContained",
      "attr_FireCause",
      "attr_ModifiedOnDateTime_dt",
    ].join(","),
  );
  url.searchParams.set("where", request.state ? `attr_POOState='US-${request.state.toUpperCase()}'` : "1=1");

  const response = await fetcher(url.toString(), {
    headers: {
      Accept: "application/json",
      "User-Agent": "agent-opportunity-exchange/0.1 read-only wildfire source adapter",
    },
  });
  if (!response.ok) {
    throw new Error(`NIFC/WFIGS current perimeters request failed: ${response.status}`);
  }

  const body = (await response.json()) as ArcgisQueryResponse;
  if (body.error) {
    throw new Error(`NIFC/WFIGS current perimeters request failed: ${body.error.message}`);
  }
  const perimeters = (body.features ?? []).map((feature) => summarizePerimeter(feature.attributes ?? {}));
  return {
    generatedAt: new Date().toISOString(),
    query: request,
    source: {
      sourceId: "nifc_wfigs",
      url: url.toString(),
      retrievalMode: "read_only_public_arcgis",
    },
    perimeterCount: perimeters.length,
    perimeters,
    caveats: [
      "WFIGS current perimeters are public interagency geospatial records, but perimeters are not available for every incident.",
      "Use this as situational-awareness and planning evidence, not incident command or evacuation authority.",
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

function summarizePerimeter(attributes: Record<string, unknown>): WfigsPerimeterSummary {
  return {
    incidentName: asString(attributes.attr_IncidentName) ?? asString(attributes.poly_IncidentName),
    uniqueFireIdentifier: asString(attributes.attr_UniqueFireIdentifier),
    irwinId: asString(attributes.poly_IRWINID),
    state: asString(attributes.attr_POOState),
    county: asString(attributes.attr_POOCounty),
    gisAcres: asNumber(attributes.poly_GISAcres),
    finalAcres: asNumber(attributes.attr_FinalAcres),
    percentContained: asNumber(attributes.attr_PercentContained),
    fireCause: asString(attributes.attr_FireCause),
    featureCategory: asString(attributes.poly_FeatureCategory),
    dateCurrent: asDate(attributes.poly_DateCurrent),
    modifiedAt: asDate(attributes.attr_ModifiedOnDateTime_dt),
  };
}

function isWildfireRelevant(text: string): boolean {
  return /red flag|fire weather|wildfire|wild land fire|wildland fire|smoke|evacuat|air quality/i.test(text);
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3).trim()}...`;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asDate(value: unknown): string | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return new Date(value).toISOString();
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

interface ArcgisQueryResponse {
  error?: {
    message: string;
  };
  features?: Array<{
    attributes?: Record<string, unknown>;
  }>;
}
