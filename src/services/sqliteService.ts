import initSqlJs, { type Database } from 'sql.js';
import type { Robot } from '@/types/robot';
import type { SlamMapResponse, SlamMapWaypointDto } from './robot';
import type { DiningTableDto } from './portalApi';
import type { LogTransfer } from '@/types/robot';

const IDB_NAME = 'vora_local_db';
const IDB_STORE = 'sqlite_storage';
const IDB_KEY_STORE = 'crypto_keys';
const IDB_KEY = 'vora_sqlite_binary';
const AES_KEY_ID = 'sqlite_aes_gcm_256';

/**
 * Web Crypto API AES-GCM (256-bit) client-side storage encryption
 * Chống xem trộm dữ liệu SQLite qua DevTools / F12 Application Tab
 */
class WebCryptoStorageSecurity {
  private static readonly MAGIC_HEADER = 'VORA_AESGCM_V1';
  private static cachedKey: CryptoKey | null = null;

  public static isCryptoSupported(): boolean {
    return typeof window !== 'undefined' && !!window.crypto && !!window.crypto.subtle;
  }

  public static async getOrCreateKey(db: IDBDatabase): Promise<CryptoKey | null> {
    if (this.cachedKey) return this.cachedKey;
    if (!this.isCryptoSupported()) return null;

    try {
      const existingKey = await new Promise<CryptoKey | null>((resolve) => {
        try {
          const tx = db.transaction(IDB_KEY_STORE, 'readonly');
          const store = tx.objectStore(IDB_KEY_STORE);
          const req = store.get(AES_KEY_ID);
          req.onsuccess = () => {
            if (req.result && req.result instanceof CryptoKey) {
              resolve(req.result);
            } else {
              resolve(null);
            }
          };
          req.onerror = () => resolve(null);
        } catch {
          resolve(null);
        }
      });

      if (existingKey) {
        this.cachedKey = existingKey;
        return existingKey;
      }

      // Generate a new 256-bit AES-GCM key
      const newKey = await window.crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      );

      await new Promise<void>((resolve, reject) => {
        try {
          const tx = db.transaction(IDB_KEY_STORE, 'readwrite');
          const store = tx.objectStore(IDB_KEY_STORE);
          const req = store.put(newKey, AES_KEY_ID);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        } catch (e) {
          reject(e);
        }
      });

      this.cachedKey = newKey;
      return newKey;
    } catch (err) {
      console.warn('[WebCrypto] Không thể lưu/tạo AES-GCM Key, fallback unencrypted:', err);
      return null;
    }
  }

  public static async encrypt(data: Uint8Array, key: CryptoKey): Promise<Uint8Array> {
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      data as unknown as BufferSource
    );

    const header = new TextEncoder().encode(this.MAGIC_HEADER);
    const cipherBytes = new Uint8Array(ciphertext);
    const payload = new Uint8Array(header.length + iv.length + cipherBytes.length);
    payload.set(header, 0);
    payload.set(iv, header.length);
    payload.set(cipherBytes, header.length + iv.length);
    return payload;
  }

  public static async decrypt(storedData: Uint8Array, key: CryptoKey): Promise<Uint8Array> {
    const headerBytes = new TextEncoder().encode(this.MAGIC_HEADER);
    let matchesHeader = storedData.length >= headerBytes.length + 12;
    if (matchesHeader) {
      for (let i = 0; i < headerBytes.length; i++) {
        if (storedData[i] !== headerBytes[i]) {
          matchesHeader = false;
          break;
        }
      }
    }

    if (!matchesHeader) {
      // Legacy unencrypted SQLite data (e.g. SQLite format 3)
      return storedData;
    }

    const iv = storedData.slice(headerBytes.length, headerBytes.length + 12);
    const ciphertext = storedData.slice(headerBytes.length + 12);
    try {
      const decrypted = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        ciphertext as unknown as BufferSource
      );
      return new Uint8Array(decrypted);
    } catch (decErr) {
      console.warn('[WebCrypto] Giải mã thất bại, có thể dữ liệu bị lỗi:', decErr);
      throw decErr;
    }
  }
}

/**
 * IndexedDB persistence helper with Web Crypto AES-GCM encryption
 */
class IndexedDbStorage {
  private static openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB not supported'));
        return;
      }
      const req = indexedDB.open(IDB_NAME, 2);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
        if (!db.objectStoreNames.contains(IDB_KEY_STORE)) {
          db.createObjectStore(IDB_KEY_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  static async loadBinary(): Promise<Uint8Array | null> {
    try {
      const db = await this.openDb();
      const rawStored: Uint8Array | null = await new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, 'readonly');
        const store = tx.objectStore(IDB_STORE);
        const req = store.get(IDB_KEY);
        req.onsuccess = () => {
          if (req.result && req.result instanceof Uint8Array) {
            resolve(req.result);
          } else if (req.result && req.result instanceof ArrayBuffer) {
            resolve(new Uint8Array(req.result));
          } else {
            resolve(null);
          }
        };
        req.onerror = () => reject(req.error);
      });

      if (!rawStored || rawStored.length === 0) {
        return null;
      }

      if (WebCryptoStorageSecurity.isCryptoSupported()) {
        const key = await WebCryptoStorageSecurity.getOrCreateKey(db);
        if (key) {
          try {
            const decrypted = await WebCryptoStorageSecurity.decrypt(rawStored, key);
            return decrypted;
          } catch {
            console.warn('[SQLite IDB] Không giải mã được, thử đọc trực tiếp dạng unencrypted');
            return rawStored;
          }
        }
      }

      return rawStored;
    } catch (err) {
      console.warn('[SQLite IDB] Không thể nạp binary từ IndexedDB:', err);
      return null;
    }
  }

  static async saveBinary(data: Uint8Array): Promise<void> {
    try {
      const db = await this.openDb();
      let dataToSave = data;

      if (WebCryptoStorageSecurity.isCryptoSupported()) {
        const key = await WebCryptoStorageSecurity.getOrCreateKey(db);
        if (key) {
          try {
            dataToSave = await WebCryptoStorageSecurity.encrypt(data, key);
          } catch (encErr) {
            console.warn('[SQLite IDB] Lỗi mã hóa AES-GCM, lưu dữ liệu thường:', encErr);
          }
        }
      }

      return new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, 'readwrite');
        const store = tx.objectStore(IDB_STORE);
        const req = store.put(dataToSave, IDB_KEY);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.warn('[SQLite IDB] Không thể lưu binary vào IndexedDB:', err);
    }
  }
}

export interface StoragePersistenceInfo {
  isPersisted: boolean;
  quotaBytes: number;
  usageBytes: number;
  isEncrypted: boolean;
}

export interface SqliteDbStats {
  robotsCount: number;
  hasMap: boolean;
  mapName?: string;
  waypointsCount: number;
  hasMqttWaypoints: boolean;
  tablesCount: number;
  transferLogsCount: number;
  dbSizeBytes: number;
  lastUpdated: string;
  isPersisted?: boolean;
  isEncrypted?: boolean;
  storageQuotaBytes?: number;
  storageUsageBytes?: number;
}

export interface SqliteAuditEntry {
  id: string;
  action: string;
  requestedBy: string;
  status: string;
  details?: string;
  timestamp: string;
}

/**
 * SqliteService (Frontend Thin Client)
 * 
 * KIẾN TRÚC VORA:
 * - Toàn bộ CSDL nghiệp vụ (Robots, Bàn ăn, Nhiệm vụ điều phối, Nhật ký chuyển hàng, SLAM Map, Waypoints)
 *   được lưu trữ và quản lý tập trung tại BACKEND (RobotDbContext sử dụng SQLite ở Edge Node cho Local Tenant,
 *   hoặc Supabase PostgreSQL khi triển khai Cloud VPS).
 * - Frontend (Vercel) là Thin Client, KHÔNG trực tiếp tạo bảng hay ghi dữ liệu nghiệp vụ vào SQLite trình duyệt.
 * - Mọi hàm ghi/đọc dữ liệu nghiệp vụ dưới đây được chuyển giao cho Backend API đảm nhiệm.
 */
class SqliteService {
  private db: Database | null = null;
  private initPromise: Promise<Database> | null = null;
  private isPersisting = false;

  public async getDb(): Promise<Database> {
    if (this.db) return this.db;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        void this.requestPersistentStorage();

        const SQL = await initSqlJs({
          locateFile: (file: string) => `/${file}`,
        });

        const savedBinary = await IndexedDbStorage.loadBinary();
        if (savedBinary && savedBinary.length > 0) {
          try {
            this.db = new SQL.Database(savedBinary);
            console.log('[SQLite Engine] Đã nạp SQLite client metadata từ IndexedDB (' + savedBinary.byteLength + ' bytes).');
          } catch (loadErr) {
            console.warn('[SQLite Engine] File binary cũ bị lỗi, khởi tạo DB mới:', loadErr);
            this.db = new SQL.Database();
          }
        } else {
          this.db = new SQL.Database();
          console.log('[SQLite Engine] Đã khởi tạo SQLite client trong bộ nhớ WebAssembly.');
        }

        this.createSchema(this.db);
        await this.persist();
        return this.db;
      } catch (err) {
        console.error('[SQLite Engine] Lỗi khởi tạo SQLite WebAssembly:', err);
        throw err;
      }
    })();

    return this.initPromise;
  }

  private createSchema(db: Database) {
    // Chỉ duy trì bảng audit/metadata phục vụ kiểm toán kết nối client-edge sync
    // Toàn bộ các bảng nghiệp vụ (robots, dining_tables, amr_tasks, local_orders, transfer_logs, slam_maps, waypoints)
    // được quản lý trên CSDL Backend (RobotDbContext).
    db.run(`
      CREATE TABLE IF NOT EXISTS sync_audit (
        id TEXT PRIMARY KEY,
        action TEXT NOT NULL,
        requested_by TEXT NOT NULL,
        status TEXT NOT NULL,
        details TEXT,
        timestamp TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sync_metadata (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
  }

  public async persist(): Promise<void> {
    if (!this.db || this.isPersisting) return;
    try {
      this.isPersisting = true;
      const binary = this.db.export();
      await IndexedDbStorage.saveBinary(binary);
    } catch (err) {
      console.warn('[SQLite Engine] Lỗi khi lưu vào IndexedDB:', err);
    } finally {
      this.isPersisting = false;
    }
  }

  // ==========================================
  // ROBOT OPERATIONS
  // Quản lý trên Backend API (/api/v1/robots)
  // ==========================================

  public async saveRobots(_robots: Robot[]): Promise<void> {
    // Dữ liệu danh sách Robot được lưu trữ và quản lý tập trung tại Backend CSDL (RobotService).
    // Không ghi vào SQLite trên Frontend.
  }

  public async updateRobotTelemetry(_robot: {
    id: string;
    name?: string;
    x: number;
    y: number;
    battery?: number;
    status?: string;
    destination?: string;
  }): Promise<void> {
    // Telemetry thời gian thực được quản lý trực tiếp trong Zustand store (robotStore.ts)
    // và đồng bộ qua Backend SignalR Hub / MQTT.
  }

  public async getRobots(): Promise<Robot[]> {
    // Danh sách Robot được tải trực tiếp từ Backend API (/api/v1/robots).
    return [];
  }

  // ==========================================
  // SLAM MAP & WAYPOINTS OPERATIONS
  // Quản lý trên Backend API & ROS 2
  // ==========================================

  public async saveSlamMap(_map: SlamMapResponse): Promise<void> {
    // Bản đồ SLAM được lưu trữ và quản lý bởi Backend CSDL.
  }

  public async getSlamMap(): Promise<SlamMapResponse | null> {
    // SLAM Map được nạp từ Backend API / SignalR broadcast.
    return null;
  }

  public async hasMqttWaypoints(): Promise<boolean> {
    return false;
  }

  public async getWaypoints(): Promise<SlamMapWaypointDto[]> {
    return [];
  }

  public async saveWaypointsFromMqtt(_waypoints: SlamMapWaypointDto[]): Promise<void> {
    // Waypoints nhận từ MQTT được Backend / ROS 2 xử lý và lưu trữ.
  }

  // ==========================================
  // DINING TABLES OPERATIONS
  // Quản lý trên Backend API (/api/v1/tables)
  // ==========================================

  public async getDiningTables(): Promise<DiningTableDto[]> {
    // Bàn ăn được quản lý tập trung tại Backend API (/api/v1/tables).
    return [];
  }

  // ==========================================
  // TRANSFER LOGS OPERATIONS
  // Quản lý trên Backend CSDL (LogTransfers)
  // ==========================================

  public async saveTransferLog(_log: Partial<LogTransfer>): Promise<void> {
    // Nhật ký chuyển món (LogTransfers) được lưu trực tiếp vào CSDL Backend qua MediatR/CQRS.
    // Không ghi vào SQLite trình duyệt trên Frontend.
  }

  public async getTransferLogs(_limit = 100): Promise<LogTransfer[]> {
    // Nhật ký chuyển hàng được truy xuất từ Backend API (/api/v1/tasks/{id}/logs).
    return [];
  }

  // ==========================================
  // STAFF DISPATCH & AMR TASKS OPERATIONS
  // Quản lý trên Backend API (/api/v1/tasks/sequence/start)
  // ==========================================

  public async recordDispatchTask(_orderId: string, _destinationTable: string, _robotCode: string): Promise<string> {
    // Điều phối nhiệm vụ được chuyển trực tiếp tới Backend API (TasksController / StartServiceSequenceCommand).
    // Toàn bộ việc ghi nhận CSDL do Backend đảm nhiệm, không ghi bảng amr_tasks hoặc local_orders vào SQLite trên Frontend.
    const taskId = `TSK-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    return taskId;
  }

  public async getRecentDispatchTasks(_limit = 10): Promise<Array<{
    taskId: string;
    orderId: string;
    robotCode: string;
    destination: string;
    status: string;
    createdAt: string;
  }>> {
    // Nhiệm vụ gần đây được quản lý tập trung tại Backend API (/api/v1/tasks).
    return [];
  }

  // ==========================================
  // AUDIT & SUPERADMIN SYNC DUMP
  // ==========================================

  public async recordSyncAudit(entry: {
    action: string;
    requestedBy: string;
    status: string;
    details?: string;
  }): Promise<void> {
    const db = await this.getDb();
    const id = `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();

    db.run(
      `INSERT INTO sync_audit (id, action, requested_by, status, details, timestamp)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, entry.action, entry.requestedBy, entry.status, entry.details || '', now]
    );

    await this.persist();
  }

  public async getSyncAudits(limit = 20): Promise<SqliteAuditEntry[]> {
    const db = await this.getDb();
    const res = db.exec(`SELECT id, action, requested_by, status, details, timestamp FROM sync_audit ORDER BY timestamp DESC LIMIT ${limit}`);
    if (!res || res.length === 0 || !res[0].values) return [];

    return res[0].values.map((row) => ({
      id: String(row[0]),
      action: String(row[1]),
      requestedBy: String(row[2]),
      status: String(row[3]),
      details: row[4] ? String(row[4]) : undefined,
      timestamp: String(row[5]),
    }));
  }

  public async dumpAllDataJson(): Promise<{
    robots: Robot[];
    slamMap: SlamMapResponse | null;
    waypoints: SlamMapWaypointDto[];
    tables: DiningTableDto[];
    transferLogs: LogTransfer[];
    exportedAt: string;
    stats: SqliteDbStats;
  }> {
    const stats = await this.getStats();
    return {
      robots: [],
      slamMap: null,
      waypoints: [],
      tables: [],
      transferLogs: [],
      exportedAt: new Date().toISOString(),
      stats,
    };
  }

  public async exportSqliteBinary(): Promise<Uint8Array> {
    const db = await this.getDb();
    return db.export();
  }

  public async requestPersistentStorage(): Promise<boolean> {
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
      try {
        const persisted = await navigator.storage.persist();
        return persisted;
      } catch (err) {
        console.warn('[Storage Security] Không thể yêu cầu Persistent Storage:', err);
        return false;
      }
    }
    return false;
  }

  public async enablePersistentStorage(): Promise<boolean> {
    return this.requestPersistentStorage();
  }

  public async getStoragePersistenceInfo(): Promise<StoragePersistenceInfo> {
    let isPersisted = false;
    let quotaBytes = 0;
    let usageBytes = 0;
    if (typeof navigator !== 'undefined' && navigator.storage) {
      if (navigator.storage.persisted) {
        try {
          isPersisted = await navigator.storage.persisted();
        } catch {}
      }
      if (navigator.storage.estimate) {
        try {
          const est = await navigator.storage.estimate();
          quotaBytes = est.quota || 0;
          usageBytes = est.usage || 0;
        } catch {}
      }
    }
    return {
      isPersisted,
      quotaBytes,
      usageBytes,
      isEncrypted: WebCryptoStorageSecurity.isCryptoSupported(),
    };
  }

  public async getStats(): Promise<SqliteDbStats> {
    const db = await this.getDb();

    let dbSizeBytes = 0;
    try {
      dbSizeBytes = db.export().byteLength;
    } catch {
      // ignore
    }

    const persistInfo = await this.getStoragePersistenceInfo();

    return {
      robotsCount: 0,
      hasMap: false,
      mapName: undefined,
      waypointsCount: 0,
      hasMqttWaypoints: false,
      tablesCount: 0,
      transferLogsCount: 0,
      dbSizeBytes,
      lastUpdated: new Date().toISOString(),
      isPersisted: persistInfo.isPersisted,
      isEncrypted: persistInfo.isEncrypted,
      storageQuotaBytes: persistInfo.quotaBytes,
      storageUsageBytes: persistInfo.usageBytes,
    };
  }
}

export const sqliteService = new SqliteService();
