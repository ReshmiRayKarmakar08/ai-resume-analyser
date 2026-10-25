import type { LoaderFunctionArgs } from "react-router";
import { getKeepAliveStatus, startKeepAlive } from "~/lib/keepAlive.server";

// React Router Resource Route (API endpoint)
export async function loader({ request }: LoaderFunctionArgs) {
  // Ensure the background self-ping loop is running
  startKeepAlive();

  const isHead = request.method.toUpperCase() === "HEAD";
  const keepAlive = getKeepAliveStatus();

  const headers = {
    "Content-Type": "application/json",
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    Pragma: "no-cache",
    Expires: "0",
    "X-Service-Name": "ai-resume-analyser",
    "X-Render-KeepAlive": "active",
  };

  if (isHead) {
    return new Response(null, {
      status: 200,
      headers,
    });
  }

  const payload = {
    status: "healthy",
    service: "ai-resume-analyser",
    message: "Resumind backend is active and running",
    timestamp: new Date().toISOString(),
    uptimeSeconds: keepAlive.uptimeSeconds,
    keepAlive: {
      status: "active",
      intervalMinutes: keepAlive.intervalMinutes,
      targetUrl: keepAlive.targetUrl,
      totalPings: keepAlive.totalPings,
      successfulPings: keepAlive.successfulPings,
      failedPings: keepAlive.failedPings,
      lastPingAt: keepAlive.lastPingAt,
      lastPingStatus: keepAlive.lastPingStatus,
    },
  };

  return new Response(JSON.stringify(payload, null, 2), {
    status: 200,
    headers,
  });
}

// Support any mutation pings (POST/PUT) seamlessly
export async function action(args: LoaderFunctionArgs) {
  return loader(args);
}

