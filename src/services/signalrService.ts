import * as signalR from '@microsoft/signalr';

type Status = 'connected' | 'connecting' | 'disconnected';
type EventHandler = (data: any) => void;
type StatusListener = (status: Status) => void;

interface HubState {
  connection: signalR.HubConnection | null;
  status: Status;
  reconnectCount: number;
  statusListeners: Set<StatusListener>;
  handlers: Map<string, Set<EventHandler>>;
  name: string;
  path: string;
}

const getToken = () => localStorage.getItem('authToken');

const buildConnectionOptions = () => ({
  accessTokenFactory: () => getToken() || '',
  headers: import.meta.env.DEV ? { 'ngrok-skip-browser-warning': 'true' } : undefined,
  skipNegotiation: false,
  transport: signalR.HttpTransportType.WebSockets,
});

const getRetryDelay = (retryCount: number) =>
  Math.min(2000 * Math.pow(2, retryCount), 30000);

function startHub(
  hub: HubState,
  onStatus: (s: Status) => void,
  userId?: string,
) {
  let url = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}${hub.path}`;
  if (userId) {
    url += `?userId=${userId}`;
  }

  hub.connection = new signalR.HubConnectionBuilder()
    .withUrl(url, buildConnectionOptions())
    .withAutomaticReconnect({
      nextRetryDelayInMilliseconds: (ctx) => getRetryDelay(ctx.previousRetryCount),
    })
    .configureLogging(signalR.LogLevel.Information)
    .build();

  hub.connection.onreconnecting((error) => {
    hub.reconnectCount++;
    hub.status = 'connecting';
    onStatus('connecting');
    console.warn(
      `[SignalR] ${hub.name} reconnecting... (attempt #${hub.reconnectCount})`,
      error?.message,
    );
  });

  hub.connection.onreconnected((connectionId) => {
    console.log(`[SignalR] ${hub.name} reconnected. ID: ${connectionId}`);
    hub.reconnectCount = 0;
    hub.status = 'connected';
    onStatus('connected');
  });

  hub.connection.onclose((error) => {
    console.error(`[SignalR] ${hub.name} closed.`, error?.message);
    hub.status = 'disconnected';
    onStatus('disconnected');
    if (hub.reconnectCount === 0) hub.reconnectCount = 1;
    setTimeout(() => {
      if (hub.connection && hub.status === 'disconnected') {
        console.log(`[SignalR] ${hub.name} restarting after close...`);
        startHub(hub, onStatus);
      }
    }, 10000);
  });

  hub.status = 'connecting';
  onStatus('connecting');

  hub.connection
    .start()
    .then(() => {
      hub.status = 'connected';
      hub.reconnectCount = 0;
      onStatus('connected');
      console.log(`[SignalR] ${hub.name} connected.`);
    })
    .catch((err) => {
      hub.status = 'disconnected';
      onStatus('disconnected');
      console.error(`[SignalR] ${hub.name} start failed:`, err.message);
      setTimeout(() => {
        if (hub.connection && hub.status === 'disconnected') {
          console.log(`[SignalR] ${hub.name} retrying start...`);
          startHub(hub, onStatus);
        }
      }, 5000);
    });
}

// ── Hub instances ──────────────────────────────────────────────────────────

const metricsHub: HubState = {
  connection: null,
  status: 'disconnected',
  reconnectCount: 0,
  statusListeners: new Set(),
  handlers: new Map(),
  name: 'Metrics Hub',
  path: '/metrics/hub',
};

function emitStatus(hub: HubState, status: Status) {
  hub.statusListeners.forEach((fn) => fn(status));
}

// ── Public API ──────────────────────────────────────────────────────────────

export const signalRService = {
  // --- Metrics Hub --------------------------------------------------------

  connectMetrics() {
    startHub(metricsHub, (s) => emitStatus(metricsHub, s));
  },

  onMetric(event: string, handler: EventHandler) {
    if (!metricsHub.handlers.has(event)) {
      metricsHub.handlers.set(event, new Set());
    }
    metricsHub.handlers.get(event)!.add(handler);
    if (metricsHub.connection) {
      metricsHub.connection.on(event, handler);
    }
  },

  offMetric(event: string, handler: EventHandler) {
    metricsHub.handlers.get(event)?.delete(handler);
    metricsHub.connection?.off(event, handler);
  },

  getMetricsStatus(): Status {
    return metricsHub.status;
  },

  // --- Status subscription (for UI feedback) ------------------------------

  onStatusChange(_hub: 'metrics', fn: StatusListener) {
    const target = metricsHub;
    target.statusListeners.add(fn);
    fn(target.status);
  },

  offStatusChange(_hub: 'metrics', fn: StatusListener) {
    const target = metricsHub;
    target.statusListeners.delete(fn);
  },

  // --- Lifecycle ----------------------------------------------------------

  async disconnectAll() {
    await Promise.all([
      metricsHub.connection?.stop().catch(() => {}),
    ]);
    metricsHub.status = 'disconnected';
    emitStatus(metricsHub, 'disconnected');
  },
};
