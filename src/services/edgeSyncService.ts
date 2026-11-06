import * as signalR from '@microsoft/signalr';
import { resolveBaseUrl } from './api';
import { sqliteService } from './sqliteService';

export interface EdgeSyncRequest {
  requestId: string;
  dataType: 'all' | 'robots' | 'map' | 'transfer_logs' | 'waypoints' | 'sqlite_dump';
  requester?: string;
  timestamp: string;
}

export interface EdgeSyncResponse {
  requestId: string;
  edgeNodeCode: string;
  tenantSlug: string;
  dataType: string;
  status: 'success' | 'error';
  recordCount: number;
  data: any;
  sqliteDumpBase64?: string;
  syncedAt: string;
  errorMessage?: string;
}

export type SyncConnectionState = 'connected' | 'connecting' | 'disconnected';

class EdgeSyncService {
  private connection: signalR.HubConnection | null = null;
  private connectionState: SyncConnectionState = 'disconnected';
  private edgeNodeCode = 'VORA-EDGE-LOCAL-01';
  private tenantSlug = 'launuong-saigon';
  private tenantId = '11111111-1111-1111-1111-111111111111';
  private storeId = '11111111-1111-1111-1111-111111111111';
  private lastSyncedAt: string | null = null;
  private totalSyncs = 0;
  private isAutoSyncStarted = false;
  private backgroundIntervalId: any = null;

  constructor() {
    this.readTenantConfig();
  }

  private readTenantConfig() {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('user');
        if (stored) {
          const u = JSON.parse(stored);
          if (u.subdomain) this.tenantSlug = u.subdomain;
          if (u.tenantId) this.tenantId = u.tenantId;
          if (u.storeId) this.storeId = u.storeId;
        }
        const edgeCode = localStorage.getItem('EDGE_NODE_CODE');
        if (edgeCode) this.edgeNodeCode = edgeCode;
        const savedTenantId = localStorage.getItem('TENANT_ID');
        if (savedTenantId) this.tenantId = savedTenantId;
        const savedStoreId = localStorage.getItem('STORE_ID');
        if (savedStoreId) this.storeId = savedStoreId;
      } catch {
        // ignore
      }
    }
  }

  /**
   * Enriches outgoing sync records with TenantId and StoreId before transmitting to Supabase.
   * Ensures local SQLite remains completely clean of store_id / tenant_id columns.
   */
  public enrichPayloadWithTenantContext(data: any): any {
    if (!data) return data;
    this.readTenantConfig();

    if (Array.isArray(data)) {
      return data.map((item) => ({
        ...item,
        tenant_id: this.tenantId,
        store_id: this.storeId,
        tenantId: this.tenantId,
        storeId: this.storeId,
      }));
    }

    if (typeof data === 'object') {
      const enriched: any = { ...data };
      if (Array.isArray(enriched.tables)) {
        enriched.tables = enriched.tables.map((t: any) => ({
          ...t,
          tenant_id: this.tenantId,
          store_id: this.storeId,
          tenantId: this.tenantId,
          storeId: this.storeId,
        }));
      }
      if (Array.isArray(enriched.transferLogs)) {
        enriched.transferLogs = enriched.transferLogs.map((l: any) => ({
          ...l,
          tenant_id: this.tenantId,
          store_id: this.storeId,
          tenantId: this.tenantId,
          storeId: this.storeId,
        }));
      }
      if (Array.isArray(enriched.robots)) {
        enriched.robots = enriched.robots.map((r: any) => ({
          ...r,
          assigned_tenant_id: this.tenantId,
          assignedTenantId: this.tenantId,
        }));
      }
      return enriched;
    }

    return data;
  }

  /**
   * Strips out store_id and tenant_id from incoming cloud data before saving to local SQLite.
   */
  public stripTenantContext(data: any): any {
    if (!data) return data;
    if (Array.isArray(data)) {
      return data.map((item) => {
        const { tenant_id, store_id, tenantId, storeId, assigned_tenant_id, assignedTenantId, ...rest } = item;
        return rest;
      });
    }
    if (typeof data === 'object') {
      const { tenant_id, store_id, tenantId, storeId, assigned_tenant_id, assignedTenantId, ...rest } = data;
      return rest;
    }
    return data;
  }

  public getConnectionState(): SyncConnectionState {
    return this.connectionState;
  }

  public getLastSyncedAt(): string | null {
    return this.lastSyncedAt;
  }

  public getTotalSyncs(): number {
    return this.totalSyncs;
  }

  public isStarted(): boolean {
    return this.isAutoSyncStarted;
  }

  /**
   * Attaches background synchronization and listeners to a single shared HubConnection
   * to guarantee zero connection duplication and prevent hopping.
   */
  public attachToHubConnection(connection: signalR.HubConnection): void {
    if (!connection) return;
    this.readTenantConfig();
    this.connection = connection;
    this.isAutoSyncStarted = true;

    // Remove any previous handlers to prevent duplicates
    try {
      connection.off('SuperAdminRequestDataSync');
      connection.off('EdgeDataSyncConfirmed');
    } catch {
      // safe ignore
    }

    // 1. Listen for background sync request initiated by SuperAdmin on VPS
    connection.on('SuperAdminRequestDataSync', async (request: EdgeSyncRequest) => {
      console.log('[EdgeSync Background] SuperAdmin trên VPS đã gửi yêu cầu đồng bộ data:', request);
      await this.handleSuperAdminSyncRequest(request);
    });

    // 2. Listen for sync acknowledgment
    connection.on('EdgeDataSyncConfirmed', (ack: any) => {
      console.log('[EdgeSync Background] Server VPS đã xác nhận nhận data đồng bộ:', ack);
      this.lastSyncedAt = new Date().toLocaleTimeString('vi-VN');
      this.totalSyncs++;
      window.dispatchEvent(
        new CustomEvent('vora:edge-sync-event', {
          detail: { type: 'confirmed', ack, timestamp: new Date().toISOString() },
        })
      );
    });

    if (connection.state === signalR.HubConnectionState.Connected) {
      this.connectionState = 'connected';
      this.notifyStateChanged();
      void this.announceEdgeNode();
    } else {
      this.connectionState = 'connecting';
      this.notifyStateChanged();
    }

    // Launch periodic announce loop (30s heartbeat) without creating extra connections
    if (!this.backgroundIntervalId && typeof window !== 'undefined') {
      this.backgroundIntervalId = setInterval(async () => {
        if (this.connection && this.connection.state === signalR.HubConnectionState.Connected) {
          await this.announceEdgeNode();
        }
      }, 30000);
    }
  }

  /**
   * Initializes background connection from local frontend to VPS server.
   * Leverages the shared Robot Hub connection to prevent duplicate WebSockets.
   */
  public async startEdgeSync(existingConnection?: signalR.HubConnection): Promise<void> {
    if (existingConnection) {
      this.attachToHubConnection(existingConnection);
      return;
    }
    if (this.connection && (this.connection.state === signalR.HubConnectionState.Connected || this.connection.state === signalR.HubConnectionState.Connecting)) {
      return;
    }
    this.readTenantConfig();
    this.isAutoSyncStarted = true;
  }

  /**
   * Announces local frontend presence and SQLite stats to VPS Hub
   */
  public async announceEdgeNode(): Promise<void> {
    if (!this.connection || this.connectionState !== 'connected') return;
    try {
      const stats = await sqliteService.getStats();
      const payload = {
        edgeNodeCode: this.edgeNodeCode,
        tenantSlug: this.tenantSlug,
        localDbName: 'vora_local_sqlite',
        status: 'online',
        stats,
        announcedAt: new Date().toISOString(),
      };

      await this.connection.invoke('RegisterEdgeNode', payload);
      console.log('[EdgeSync Background] Đã đăng ký trạm Edge Node và thống kê SQLite lên VPS.');
    } catch (err) {
      // Hub might not have method yet or network issue
      console.warn('[EdgeSync Background] announceEdgeNode warning:', err);
    }
  }

  /**
   * Handles incoming SuperAdmin background sync request from VPS
   */
  public async handleSuperAdminSyncRequest(request: EdgeSyncRequest): Promise<void> {
    const dataType = request?.dataType || 'all';
    const requester = request?.requester || 'SuperAdmin VPS';

    try {
      window.dispatchEvent(
        new CustomEvent('vora:edge-sync-event', {
          detail: {
            type: 'request_received',
            dataType,
            requester,
            timestamp: new Date().toISOString(),
          },
        })
      );

      let dataPayload: any = null;
      let recordCount = 0;
      let sqliteDumpBase64: string | undefined = undefined;

      if (dataType === 'robots') {
        const robots = await sqliteService.getRobots();
        dataPayload = robots;
        recordCount = robots.length;
      } else if (dataType === 'map') {
        const map = await sqliteService.getSlamMap();
        dataPayload = map;
        recordCount = map ? 1 : 0;
      } else if (dataType === 'waypoints') {
        const waypoints = await sqliteService.getWaypoints();
        dataPayload = waypoints;
        recordCount = waypoints.length;
      } else if (dataType === 'transfer_logs') {
        const logs = await sqliteService.getTransferLogs();
        dataPayload = logs;
        recordCount = logs.length;
      } else if (dataType === 'sqlite_dump') {
        const binary = await sqliteService.exportSqliteBinary();
        sqliteDumpBase64 = this.uint8ArrayToBase64(binary);
        dataPayload = { sizeBytes: binary.byteLength };
        recordCount = 1;
      } else {
        // 'all' / 'full'
        dataPayload = await sqliteService.dumpAllDataJson();
        recordCount =
          (dataPayload.robots?.length || 0) +
          (dataPayload.waypoints?.length || 0) +
          (dataPayload.tables?.length || 0) +
          (dataPayload.transferLogs?.length || 0);
      }

      // Automatically enrich with TenantId and StoreId for Supabase ingestion
      const enrichedPayload = this.enrichPayloadWithTenantContext(dataPayload);

      const responsePayload: EdgeSyncResponse = {
        requestId: request.requestId || `req-${Date.now()}`,
        edgeNodeCode: this.edgeNodeCode,
        tenantSlug: this.tenantSlug,
        dataType,
        status: 'success',
        recordCount,
        data: enrichedPayload,
        sqliteDumpBase64,
        syncedAt: new Date().toISOString(),
      };

      // 1. Send via SignalR if connected
      if (this.connection && this.connectionState === 'connected') {
        try {
          await this.connection.invoke('SubmitEdgeSyncData', responsePayload);
          console.log('[EdgeSync Background] Đã gửi data SQLite qua SignalR lên VPS.');
        } catch (hubErr) {
          console.warn('[EdgeSync Background] Gửi qua SignalR thất bại, thử REST API...', hubErr);
          await this.sendSyncViaHttp(responsePayload);
        }
      } else {
        // 2. Fallback to REST API
        await this.sendSyncViaHttp(responsePayload);
      }

      // Record audit in local SQLite
      await sqliteService.recordSyncAudit({
        action: `Sync ${dataType.toUpperCase()}`,
        requestedBy: requester,
        status: 'SUCCESS',
        details: `Đã đồng bộ ${recordCount} bản ghi từ SQLite lên VPS`,
      });

      this.lastSyncedAt = new Date().toLocaleTimeString('vi-VN');
      this.totalSyncs++;

      window.dispatchEvent(
        new CustomEvent('vora:edge-sync-event', {
          detail: {
            type: 'completed',
            dataType,
            recordCount,
            timestamp: new Date().toISOString(),
          },
        })
      );
    } catch (err: any) {
      console.error('[EdgeSync Background] Lỗi xử lý yêu cầu đồng bộ SQLite:', err);
      await sqliteService.recordSyncAudit({
        action: `Sync ${dataType.toUpperCase()}`,
        requestedBy: requester,
        status: 'FAILED',
        details: err?.message || 'Unknown error',
      });
    }
  }

  private async sendSyncViaHttp(payload: EdgeSyncResponse): Promise<void> {
    const cleanBase = resolveBaseUrl().replace(/\/+$/, '');
    const url = cleanBase.endsWith('/v1')
      ? `${cleanBase}/robots/sync-edge-data`
      : `${cleanBase}/v1/robots/sync-edge-data`;

    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : '';
    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: token ? `Bearer ${token}` : '',
        'ngrok-skip-browser-warning': 'true',
      },
      body: JSON.stringify(payload),
    });
  }

  /**
   * Manually push SQLite data up to VPS
   */
  public async triggerManualSyncToVps(dataType: 'all' | 'robots' | 'map' | 'transfer_logs' | 'waypoints' = 'all'): Promise<boolean> {
    try {
      const dump = await sqliteService.dumpAllDataJson();
      const enrichedDump = this.enrichPayloadWithTenantContext(dump);
      const payload: EdgeSyncResponse = {
        requestId: `manual-${Date.now()}`,
        edgeNodeCode: this.edgeNodeCode,
        tenantSlug: this.tenantSlug,
        dataType,
        status: 'success',
        recordCount:
          (dump.robots?.length || 0) +
          (dump.waypoints?.length || 0) +
          (dump.tables?.length || 0) +
          (dump.transferLogs?.length || 0),
        data: enrichedDump,
        syncedAt: new Date().toISOString(),
      };

      if (this.connection && this.connectionState === 'connected') {
        try {
          await this.connection.invoke('SubmitEdgeSyncData', payload);
        } catch {
          await this.sendSyncViaHttp(payload);
        }
      } else {
        await this.sendSyncViaHttp(payload);
      }

      await sqliteService.recordSyncAudit({
        action: `Manual Push ${dataType.toUpperCase()}`,
        requestedBy: 'Local Operator (Thủ công)',
        status: 'SUCCESS',
        details: `Đồng bộ toàn bộ dữ liệu SQLite lên máy chủ VPS`,
      });

      this.lastSyncedAt = new Date().toLocaleTimeString('vi-VN');
      this.totalSyncs++;

      window.dispatchEvent(
        new CustomEvent('vora:edge-sync-event', {
          detail: { type: 'manual_completed', recordCount: payload.recordCount },
        })
      );
      return true;
    } catch (err) {
      console.error('[EdgeSync] Lỗi đồng bộ thủ công lên VPS:', err);
      return false;
    }
  }

  /**
   * Allows user to download the `.sqlite` binary file locally
   */
  public async downloadSqliteFile(): Promise<void> {
    const binary = await sqliteService.exportSqliteBinary();
    const blob = new Blob([binary as unknown as BlobPart], { type: 'application/x-sqlite3' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vora_local_db_${new Date().toISOString().slice(0, 10)}.sqlite`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  private notifyStateChanged() {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('vora:edge-sync-state', {
          detail: { state: this.connectionState },
        })
      );
    }
  }

  private uint8ArrayToBase64(bytes: Uint8Array): string {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }
}

export const edgeSyncService = new EdgeSyncService();
