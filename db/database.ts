import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

let db: ReturnType<typeof Database> | null = null;

function getDb() {
  if (db) return db;

  const isProduction = process.env.NODE_ENV === 'production';
  const dbDir = isProduction ? '/app/data' : process.cwd();
  const dbPath = path.join(dbDir, 'local.db');

  if (isProduction && !fs.existsSync('/app/data')) {
    fs.mkdirSync('/app/data', { recursive: true });
  }

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS clients (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      token            TEXT    NOT NULL UNIQUE,
      username         TEXT    NOT NULL UNIQUE,
      password         TEXT    NOT NULL,
      created_at       TEXT    NOT NULL DEFAULT (datetime('now')),

      -- Información personal
      nombre_apellido  TEXT,
      cumpleanos       TEXT,
      edad             INTEGER,
      telefono         TEXT,
      direccion        TEXT,

      -- Salud
      tipo_sangre      TEXT,
      medicacion       TEXT,
      comentarios      TEXT,

      -- Archivos
      cud_path         TEXT,
      foto_dni_path    TEXT,
      carnet_path      TEXT,

      status           TEXT NOT NULL DEFAULT 'pendiente'
    );
  `);

  // Migrations: add columns if they don't exist (for existing databases)
  const migrations = [
    "ALTER TABLE clients ADD COLUMN cumpleanos TEXT",
    "ALTER TABLE clients ADD COLUMN telefono TEXT",
    "ALTER TABLE clients ADD COLUMN direccion TEXT",
    "ALTER TABLE clients ADD COLUMN tipo_sangre TEXT",
    "ALTER TABLE clients ADD COLUMN medicacion TEXT",
    "ALTER TABLE clients ADD COLUMN comentarios TEXT",
    "ALTER TABLE clients ADD COLUMN foto_dni_path TEXT",
  ];

  for (const sql of migrations) {
    try {
      db.exec(sql);
    } catch {
      // Column already exists — safe to ignore
    }
  }

  return db;
}

export default new Proxy({} as ReturnType<typeof Database>, {
  get(_target, prop) {
    const database = getDb();
    const value = (database as unknown as Record<string | symbol, unknown>)[prop];
    if (typeof value === 'function') {
      return value.bind(database);
    }
    return value;
  },
});
