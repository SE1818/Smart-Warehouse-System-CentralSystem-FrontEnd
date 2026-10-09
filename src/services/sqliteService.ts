import initSqlJs, { type Database } from 'sql.js';
import type { Robot } from '@/types/robot';
import type { SlamMapResponse, SlamMapWaypointDto } from './robot';
import type { DiningTableDto } from './portalApi';
import type { LogTransfer } from './transferService';

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

class SqliteService {
  private db: Database | null = null;
  private initPromise: Promise<Database> | null = null;
  private isPersisting = false;

  public async getDb(): Promise<Database> {
    if (this.db) return this.db;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        // Automatically request persistent storage from browser to prevent eviction
        void this.requestPersistentStorage();

        const SQL = await initSqlJs({
          locateFile: (file: string) => `/${file}`,
        });

        const savedBinary = await IndexedDbStorage.loadBinary();
        if (savedBinary && savedBinary.length > 0) {
          try {
            this.db = new SQL.Database(savedBinary);
            console.log('[SQLite Engine] Đã nạp cơ sở dữ liệu SQLite thành công từ IndexedDB (' + savedBinary.byteLength + ' bytes).');
          } catch (loadErr) {
            console.warn('[SQLite Engine] File binary cũ bị lỗi, khởi tạo DB mới:', loadErr);
            this.db = new SQL.Database();
          }
        } else {
          this.db = new SQL.Database();
          console.log('[SQLite Engine] Đã khởi tạo cơ sở dữ liệu SQLite mới trong bộ nhớ WebAssembly.');
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
    db.run(`
      CREATE TABLE IF NOT EXISTS robots (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        current_x REAL DEFAULT 0,
        current_y REAL DEFAULT 0,
        battery_level REAL DEFAULT 100,
        status TEXT DEFAULT 'Idle',
        current_area_id TEXT,
        destination TEXT,
        ip_address TEXT,
        raw_json TEXT,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS slam_maps (
        map_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        resolution REAL NOT NULL,
        origin_x REAL NOT NULL,
        origin_y REAL NOT NULL,
        origin_z REAL DEFAULT 0,
        width INTEGER NOT NULL,
        height INTEGER NOT NULL,
        map_url TEXT,
        format TEXT DEFAULT 'png',
        tables_json TEXT,
        stations_json TEXT,
        waypoints_json TEXT,
        last_updated TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS waypoints (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        world_x REAL NOT NULL,
        world_y REAL NOT NULL,
        theta REAL DEFAULT 0,
        type TEXT DEFAULT 'waypoint',
        received_from_mqtt INTEGER DEFAULT 1,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS dining_tables (
        id TEXT PRIMARY KEY,
        table_no TEXT NOT NULL,
        name TEXT NOT NULL,
        world_x REAL NOT NULL,
        world_y REAL NOT NULL,
        zone TEXT DEFAULT 'Khu Trong Nhà',
        capacity INTEGER DEFAULT 4,
        status TEXT DEFAULT 'empty',
        assigned_robot_code TEXT,
        waypoint_id TEXT,
        source TEXT DEFAULT 'mqtt_waypoint',
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS transfer_logs (
        id TEXT PRIMARY KEY,
        transfer_request_id TEXT,
        robot_id TEXT,
        status_result TEXT,
        distance_travelled REAL,
        error_notes TEXT,
        started_at TEXT,
        finished_at TEXT,
        created_at TEXT NOT NULL
      );

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
  // ROBOT OPERATIONS (From BE / Supabase -> SQLite)
  // ==========================================

  public async saveRobots(robots: Robot[]): Promise<void> {
    const db = await this.getDb();
    const now = new Date().toISOString();

    for (const r of robots) {
      db.run(
        `INSERT INTO robots (id, name, current_x, current_y, battery_level, status, current_area_id, raw_json, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           name = excluded.name,
           current_x = excluded.current_x,
           current_y = excluded.current_y,
           battery_level = excluded.battery_level,
           status = excluded.status,
           current_area_id = excluded.current_area_id,
           raw_json = excluded.raw_json,
           updated_at = excluded.updated_at`,
        [
          r.id,
          r.name,
          r.x ?? 0,
          r.y ?? 0,
          r.battery ?? 100,
          r.status ?? 'Idle',
          r.currentAreaId || null,
          JSON.stringify(r),
          now,
        ]
      );
    }

    await this.persist();
  }

  public async updateRobotTelemetry(robot: {
    id: string;
    name?: string;
    x: number;
    y: number;
    battery?: number;
    status?: string;
    destination?: string;
  }): Promise<void> {
    const db = await this.getDb();
    const now = new Date().toISOString();

    db.run(
      `INSERT INTO robots (id, name, current_x, current_y, battery_level, status, destination, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name = COALESCE(excluded.name, robots.name),
         current_x = excluded.current_x,
         current_y = excluded.current_y,
         battery_level = COALESCE(excluded.battery_level, robots.battery_level),
         status = COALESCE(excluded.status, robots.status),
         destination = COALESCE(excluded.destination, robots.destination),
         updated_at = excluded.updated_at`,
      [
        robot.id,
        robot.name || 'AMR',
        robot.x,
        robot.y,
        robot.battery ?? null,
        robot.status ?? null,
        robot.destination || null,
        now,
      ]
    );

    await this.persist();
  }

  public async getRobots(): Promise<Robot[]> {
    const db = await this.getDb();
    const res = db.exec(`SELECT id, name, current_x, current_y, battery_level, status, current_area_id, raw_json FROM robots ORDER BY name ASC`);
    if (!res || res.length === 0 || !res[0].values) return [];

    const rows = res[0].values;
    return rows.map((row: any[]) => {
      const [id, name, current_x, current_y, battery_level, status, current_area_id, raw_json] = row;
      let rawObj: any = {};
      try {
        if (raw_json) rawObj = JSON.parse(raw_json);
      } catch {
        // ignore
      }

      return {
        id: String(id),
        name: String(name),
        x: Number(current_x),
        y: Number(current_y),
        battery: Number(battery_level),
        status: (String(status).charAt(0).toUpperCase() + String(status).slice(1).toLowerCase()) as any,
        currentAreaId: current_area_id ? String(current_area_id) : undefined,
        createdAt: rawObj.createdAt,
        updatedAt: rawObj.updatedAt,
      };
    });
  }

  // ==========================================
  // SLAM MAP OPERATIONS (From MQTT -> SQLite)
  // ==========================================

  public async saveSlamMap(map: SlamMapResponse): Promise<void> {
    const db = await this.getDb();
    const now = new Date().toISOString();

    db.run(
      `INSERT INTO slam_maps (map_id, name, resolution, origin_x, origin_y, origin_z, width, height, map_url, format, tables_json, stations_json, waypoints_json, last_updated)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(map_id) DO UPDATE SET
         name = excluded.name,
         resolution = excluded.resolution,
         origin_x = excluded.origin_x,
         origin_y = excluded.origin_y,
         origin_z = excluded.origin_z,
         width = excluded.width,
         height = excluded.height,
         map_url = excluded.map_url,
         format = excluded.format,
         tables_json = excluded.tables_json,
         stations_json = excluded.stations_json,
         waypoints_json = excluded.waypoints_json,
         last_updated = excluded.last_updated`,
      [
        map.mapId || 'default-map',
        map.name || 'Bản Đồ SLAM Thực Địa',
        map.resolution || 0.05,
        map.originX ?? 0,
        map.originY ?? 0,
        map.originZ ?? 0,
        map.width || 800,
        map.height || 600,
        map.mapUrl || '',
        map.format || 'png',
        JSON.stringify(map.tables || []),
        JSON.stringify(map.stations || []),
        JSON.stringify(map.waypoints || []),
        map.lastUpdated || now,
      ]
    );

    // Save waypoints received from MQTT
    if (map.waypoints && Array.isArray(map.waypoints) && map.waypoints.length > 0) {
      await this.saveWaypointsFromMqtt(map.waypoints);
    }

    await this.persist();
  }

  public async getSlamMap(): Promise<SlamMapResponse | null> {
    const db = await this.getDb();
    const res = db.exec(`SELECT map_id, name, resolution, origin_x, origin_y, origin_z, width, height, map_url, format, tables_json, stations_json, waypoints_json, last_updated FROM slam_maps ORDER BY last_updated DESC LIMIT 1`);
    if (!res || res.length === 0 || !res[0].values || res[0].values.length === 0) return null;

    const row = res[0].values[0];
    const [map_id, name, resolution, origin_x, origin_y, origin_z, width, height, map_url, format, tables_json, stations_json, _waypoints_json, last_updated] = row;

    // Load REAL waypoints from waypoints table (strictly received from MQTT)
    const waypoints = await this.getWaypoints();
    const tables = await this.getDiningTables();

    return {
      mapId: String(map_id),
      name: String(name),
      resolution: Number(resolution),
      originX: Number(origin_x),
      originY: Number(origin_y),
      originZ: Number(origin_z),
      width: Number(width),
      height: Number(height),
      mapUrl: String(map_url),
      format: String(format),
      tables: tables.length > 0 ? tables.map((t) => ({
        id: t.id,
        tableNo: t.tableNo,
        name: `Bàn ${t.tableNo}`,
        worldX: t.worldX || 0,
        worldY: t.worldY || 0,
        zone: t.zone,
      })) : (tables_json ? JSON.parse(String(tables_json)) : []),
      stations: stations_json ? JSON.parse(String(stations_json)) : [],
      waypoints,
      lastUpdated: String(last_updated),
    };
  }

  // ==========================================
  // WAYPOINTS & TABLES FROM MQTT (Strict No-Fake-Waypoint Policy)
  // ==========================================

  public async hasMqttWaypoints(): Promise<boolean> {
    const db = await this.getDb();
    const res = db.exec(`SELECT COUNT(*) FROM waypoints WHERE received_from_mqtt = 1`);
    if (!res || res.length === 0 || !res[0].values) return false;
    const count = Number(res[0].values[0][0]);
    return count > 0;
  }

  public async getWaypoints(): Promise<SlamMapWaypointDto[]> {
    const db = await this.getDb();
    const res = db.exec(`SELECT id, name, world_x, world_y, theta, type FROM waypoints WHERE received_from_mqtt = 1 ORDER BY name ASC`);
    if (!res || res.length === 0 || !res[0].values) return [];

    return res[0].values.map((row) => ({
      id: String(row[0]),
      name: String(row[1]),
      worldX: Number(row[2]),
      worldY: Number(row[3]),
      theta: Number(row[4] || 0),
      type: String(row[5] || 'waypoint'),
    }));
  }

  /**
   * Save waypoints received from MQTT.
   * Also derives dining tables from waypoints of type 'table' or dining stations.
   * If no MQTT waypoints are received, no waypoints are saved and tables is not populated!
   */
  public async saveWaypointsFromMqtt(waypoints: SlamMapWaypointDto[]): Promise<void> {
    const db = await this.getDb();
    const now = new Date().toISOString();

    // Clear old waypoints and tables to ensure strictly fresh MQTT sync
    db.run(`DELETE FROM waypoints`);
    db.run(`DELETE FROM dining_tables`);

    if (!waypoints || waypoints.length === 0) {
      await this.persist();
      return;
    }

    for (const wp of waypoints) {
      db.run(
        `INSERT INTO waypoints (id, name, world_x, world_y, theta, type, received_from_mqtt, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
        [wp.id, wp.name, wp.worldX, wp.worldY, wp.theta ?? 0, wp.type || 'waypoint', now]
      );

      // If waypoint represents a dining table, store into dining_tables
      const isTable =
        (wp.type && (wp.type.toLowerCase() === 'table' || wp.type.toLowerCase() === 'dining')) ||
        wp.name.toLowerCase().startsWith('bàn') ||
        wp.name.toLowerCase().startsWith('table') ||
        wp.id.toLowerCase().startsWith('wp-table');

      if (isTable) {
        const tableNo = wp.name.replace(/^Bàn\s*/i, '').replace(/^Table\s*/i, '').trim() || wp.id;
        db.run(
          `INSERT INTO dining_tables (id, table_no, name, world_x, world_y, zone, capacity, status, waypoint_id, source, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'mqtt_waypoint', ?)`,
          [
            wp.id,
            tableNo,
            wp.name,
            wp.worldX,
            wp.worldY,
            'Khu Trong Nhà',
            4,
            'empty',
            wp.id,
            now,
          ]
        );
      }
    }

    await this.persist();
    console.log(`[SQLite Engine] Đã lưu ${waypoints.length} waypoint nhận từ MQTT vào SQLite và đồng bộ danh sách bàn.`);
  }

  public async getDiningTables(): Promise<DiningTableDto[]> {
    const db = await this.getDb();
    const res = db.exec(`SELECT id, table_no, name, world_x, world_y, zone, capacity, status, assigned_robot_code, waypoint_id FROM dining_tables ORDER BY table_no ASC`);
    if (!res || res.length === 0 || !res[0].values) return [];

    return res[0].values.map((row) => ({
      id: String(row[0]),
      tableNo: String(row[1]),
      worldX: Number(row[3]),
      worldY: Number(row[4]),
      zone: String(row[5] || 'Khu Trong Nhà'),
      capacity: Number(row[6] || 4),
      status: (row[7] || 'empty') as any,
      assignedRobotCode: row[8] ? String(row[8]) : null,
      currentOrders: [],
      orderTime: null,
    }));
  }

  // ==========================================
  // TRANSFER LOGS & ACTIVITY LOGS (SQLite)
  // ==========================================

  public async saveTransferLog(log: Partial<LogTransfer>): Promise<void> {
    const db = await this.getDb();
    const id = log.id || `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const now = new Date().toISOString();

    db.run(
      `INSERT INTO transfer_logs (id, transfer_request_id, robot_id, status_result, distance_travelled, error_notes, started_at, finished_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         status_result = excluded.status_result,
         distance_travelled = excluded.distance_travelled,
         error_notes = excluded.error_notes,
         finished_at = excluded.finished_at`,
      [
        id,
        log.transferRequestId || 'REQ-UNKNOWN',
        log.robotId || 'AMR',
        log.statusResult || 'completed',
        log.distanceTravelled ?? 0,
        log.errorNotes || null,
        log.startedAt || now,
        log.finishedAt || now,
        log.createdAt || now,
      ]
    );

    await this.persist();
  }

  public async getTransferLogs(limit = 100): Promise<LogTransfer[]> {
    const db = await this.getDb();
    const res = db.exec(`SELECT id, transfer_request_id, robot_id, status_result, distance_travelled, error_notes, started_at, finished_at, created_at FROM transfer_logs ORDER BY created_at DESC LIMIT ${limit}`);
    if (!res || res.length === 0 || !res[0].values) return [];

    return res[0].values.map((row) => ({
      id: String(row[0]),
      transferRequestId: String(row[1]),
      robotId: String(row[2]),
      statusResult: String(row[3]),
      distanceTravelled: row[4] !== null ? Number(row[4]) : null,
      errorNotes: row[5] ? String(row[5]) : null,
      startedAt: String(row[6]),
      finishedAt: row[7] ? String(row[7]) : null,
      createdAt: String(row[8]),
    }));
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
    const [robots, slamMap, waypoints, tables, transferLogs, stats] = await Promise.all([
      this.getRobots(),
      this.getSlamMap(),
      this.getWaypoints(),
      this.getDiningTables(),
      this.getTransferLogs(200),
      this.getStats(),
    ]);

    return {
      robots,
      slamMap,
      waypoints,
      tables,
      transferLogs,
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
        console.log(`[Storage Security] Trạng thái Persistent Storage: ${persisted ? 'ĐÃ ĐƯỢC BẢO VỆ VĨNH VIỄN (Chống tự dọn cache)' : 'Mặc định (Best-effort)'}`);
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
    const countQuery = (table: string): number => {
      try {
        const res = db.exec(`SELECT COUNT(*) FROM ${table}`);
        return res && res[0] && res[0].values ? Number(res[0].values[0][0]) : 0;
      } catch {
        return 0;
      }
    };

    const robotsCount = countQuery('robots');
    const waypointsCount = countQuery('waypoints');
    const tablesCount = countQuery('dining_tables');
    const transferLogsCount = countQuery('transfer_logs');

    let hasMap = false;
    let mapName: string | undefined;
    try {
      const mapRes = db.exec(`SELECT name FROM slam_maps LIMIT 1`);
      if (mapRes && mapRes[0] && mapRes[0].values && mapRes[0].values.length > 0) {
        hasMap = true;
        mapName = String(mapRes[0].values[0][0]);
      }
    } catch {
      // ignore
    }

    let dbSizeBytes = 0;
    try {
      dbSizeBytes = db.export().byteLength;
    } catch {
      // ignore
    }

    const persistInfo = await this.getStoragePersistenceInfo();

    return {
      robotsCount,
      hasMap,
      mapName,
      waypointsCount,
      hasMqttWaypoints: waypointsCount > 0,
      tablesCount,
      transferLogsCount,
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
