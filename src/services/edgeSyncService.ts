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
  private lastSyncedAt: string | null = null;
  private totalSyncs = 0;
  private isAutoSyncStarted = false;

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
        }
        const edgeCode = localStorage.getItem('EDGE_NODE_CODE');
        if (edgeCode) this.edgeNodeCode = edgeCode;
      } catch {
        // ignore
      }
    }
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

  /**
   * Initializes background connection from local frontend to VPS server
   */
  public async startEdgeSync(): Promise<void> {
    if (this.isAutoSyncStarted && this.connection) return;
    this.isAutoSyncStarted = true;
    this.readTenantConfig();

    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : '';
    const cleanBase = resolveBaseUrl().replace(/\/+$/, '');
    const connectionUrl = cleanBase.endsWith('/v1')
      ? `${cleanBase}/robots/tracking-hub`
      : `${cleanBase}/v1/robots/tracking-hub`;

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(connectionUrl, {
        accessTokenFactory: () => token || '',
        headers: { 'ngrok-skip-browser-warning': 'true' },
      })
      .configureLogging(signalR.LogLevel.Information)
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .build();

    // 1. Listen for background sync request initiated by SuperAdmin on VPS
    this.connection.on('SuperAdminRequestDataSync', async (request: EdgeSyncRequest) => {
      console.log('[EdgeSync Background] SuperAdmin trên VPS đã gửi yêu cầu đồng bộ data:', request);
      await this.handleSuperAdminSyncRequest(request);
    });

    // 2. Listen for sync acknowledgment
    this.connection.on('EdgeDataSyncConfirmed', (ack: any) => {
      console.log('[EdgeSync Background] Server VPS đã xác nhận nhận data đồng bộ:', ack);
      this.lastSyncedAt = new Date().toLocaleTimeString('vi-VN');
      this.totalSyncs++;
      window.dispatchEvent(
        new CustomEvent('vora:edge-sync-event', {
          detail: { type: 'confirmed', ack, timestamp: new Date().toISOString() },
        })
      );
    });

    this.connection.onreconnecting(() => {
      this.connectionState = 'connecting';
      this.notifyStateChanged();
    });

    this.connection.onreconnected(async () => {
      this.connectionState = 'connected';
      this.notifyStateChanged();
      await this.announceEdgeNode();
    });

    this.connection.onclose(() => {
      this.connectionState = 'disconnected';
      this.notifyStateChanged();
    });

    try {
      this.connectionState = 'connecting';
      this.notifyStateChanged();
      await this.connection.start();
      this.connectionState = 'connected';
      this.notifyStateChanged();
      console.log('[EdgeSync Background] Đã kết nối ngầm tới VPS Tracking Hub thành công. Sẵn sàng nhận lệnh đồng bộ từ SuperAdmin.');
      await this.announceEdgeNode();
    } catch (err) {
      console.warn('[EdgeSync Background] Chưa thể kết nối tới VPS Hub:', err);
      this.connectionState = 'disconnected';
      this.notifyStateChanged();
    }
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

      const responsePayload: EdgeSyncResponse = {
        requestId: request.requestId || `req-${Date.now()}`,
        edgeNodeCode: this.edgeNodeCode,
        tenantSlug: this.tenantSlug,
        dataType,
        status: 'success',
        recordCount,
        data: dataPayload,
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
        data: dump,
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
