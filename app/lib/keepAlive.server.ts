/**
 * Background Keep-Alive Service for Render.com
 *
 * Render free web services spin down after 15 minutes of inactivity.
 * This service automatically sends an HTTP ping to the server's /health
 * endpoint every 10 minutes to keep the instance active and responsive.
 */

interface KeepAliveState {
  isInitialized: boolean;
  targetUrl: string;
  intervalMinutes: number;
  startedAt: string;
  totalPings: number;
  successfulPings: number;
  failedPings: number;
  lastPingAt: string | null;
  lastPingStatus: number | string | null;
}

// Attach state to globalThis to persist across module re-evaluations
const globalKey = "__resumindKeepAliveState";

function getState(): KeepAliveState {
  if (!(globalThis as any)[globalKey]) {
    const rawBaseUrl =
      process.env.APP_URL ||
      process.env.RENDER_EXTERNAL_URL ||
      "https://ai-resume-analyser-frgy.onrender.com";

    const cleanBase = rawBaseUrl.replace(/\/+$/, "");
    const targetUrl = `${cleanBase}/health`;

    (globalThis as any)[globalKey] = {
      isInitialized: false,
      targetUrl,
      intervalMinutes: 10,
      startedAt: new Date().toISOString(),
      totalPings: 0,
      successfulPings: 0,
      failedPings: 0,
      lastPingAt: null,
      lastPingStatus: null,
    };
  }
  return (globalThis as any)[globalKey];
}

export async function pingHealthEndpoint(): Promise<{
  success: boolean;
  status: number | string;
  timestamp: string;
}> {
  const state = getState();
  const timestamp = new Date().toISOString();
  state.totalPings += 1;
  state.lastPingAt = timestamp;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(state.targetUrl, {
      method: "GET",
      headers: {
        "User-Agent": "Resumind-KeepAlive/1.0 (Render Keep-Alive Bot)",
        Accept: "application/json",
        "X-Self-Ping": "true",
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    state.successfulPings += 1;
    state.lastPingStatus = res.status;

    console.log(
      `[KeepAlive] 🟢 Self-ping succeeded at ${timestamp} -> ${state.targetUrl} [Status ${res.status}]`
    );

    return {
      success: res.ok,
      status: res.status,
      timestamp,
    };
  } catch (err: any) {
    const errorMsg = err?.name === "AbortError" ? "Timeout (15s)" : err?.message || "Unknown error";
    state.failedPings += 1;
    state.lastPingStatus = errorMsg;

    console.warn(
      `[KeepAlive] ⚠️ Self-ping failed at ${timestamp} -> ${state.targetUrl} [${errorMsg}]`
    );

    return {
      success: false,
      status: errorMsg,
      timestamp,
    };
  }
}

export function startKeepAlive(): KeepAliveState {
  const state = getState();

  if (state.isInitialized) {
    return state;
  }

  state.isInitialized = true;
  const intervalMs = state.intervalMinutes * 60 * 1000; // 10 minutes = 600,000ms

  console.log(
    `[KeepAlive] 🚀 Keep-alive worker started. Target: ${state.targetUrl} (every ${state.intervalMinutes}m)`
  );

  // Initial warmup ping after 30 seconds
  setTimeout(() => {
    pingHealthEndpoint().catch(() => {});
  }, 30000);

  // Recurring interval every 10 minutes
  setInterval(() => {
    pingHealthEndpoint().catch(() => {});
  }, intervalMs);

  return state;
}

export function getKeepAliveStatus() {
  const state = getState();
  return {
    ...state,
    uptimeSeconds: Math.floor(process.uptime ? process.uptime() : 0),
  };
}
