import path from 'node:path';
import sqlite3 from 'sqlite3';

/**
 * SQLite connection used across API routes and scripts.
 * We keep a single shared instance and expose promise-based helpers.
 */
const sqliteFile = process.env.LOCAL_SQLITE_PATH ?? path.join(process.cwd(), 'local.db');

const sqliteInstance = new sqlite3.Database(
  sqliteFile,
  sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
  (err) => {
    if (err) {
      console.error(`[sqlite] Failed to open database at ${sqliteFile}`, err);
    }
  }
);

function runAsync(sql: string, params?: unknown): Promise<sqlite3.RunResult> {
  return new Promise((resolve, reject) => {
    const callback = function (this: sqlite3.RunResult, err: Error | null) {
      if (err) {
        reject(err);
        return;
      }
      resolve(this);
    };

    if (typeof params === 'undefined') {
      sqliteInstance.run(sql, callback);
    } else {
      sqliteInstance.run(sql, params, callback);
    }
  });
}

function getAsync<T = SQLiteRow>(sql: string, params?: unknown): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const handler = (err: Error | null, row?: T) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(row);
    };

    if (typeof params === 'undefined') {
      sqliteInstance.get(sql, handler);
    } else {
      sqliteInstance.get(sql, params, handler);
    }
  });
}

function allAsync<T = SQLiteRow>(sql: string, params?: unknown): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const handler = (err: Error | null, rows: T[]) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows);
    };

    if (typeof params === 'undefined') {
      sqliteInstance.all(sql, handler);
    } else {
      sqliteInstance.all(sql, params, handler);
    }
  });
}

const run = runAsync;
const get = getAsync;
const all = allAsync;

export const sqlite = {
  file: sqliteFile,
  raw: sqliteInstance,
  run,
  get,
  all,
};

export type SQLiteRow = Record<string, unknown>;

export async function ensureTable(sql: string) {
  await run(sql);
}
