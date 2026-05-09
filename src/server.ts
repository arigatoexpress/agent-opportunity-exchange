import { serve } from "@hono/node-server";
import { createApp } from "./app.js";

const port = Number.parseInt(process.env.AOE_PORT ?? "4402", 10);
const hostname = process.env.AOE_HOST ?? "127.0.0.1";

serve(
  {
    fetch: createApp().fetch,
    port,
    hostname,
  },
  (info) => {
    console.log(`Agent Opportunity Exchange listening on http://${info.address}:${info.port}`);
  },
);
