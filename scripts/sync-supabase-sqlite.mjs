#!/usr/bin/env node
/**
 * Incremental synchronization between Supabase (source of truth) and local SQLite.
 * Priority: Supabase -> SQLite. Local changes are pushed only when Supabase
 * doesn't have a newer version of the same record.
 */
import { createClient } from '@supabase/supabase-js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sqlite3 from 'sqlite3';
import { promisify } from 'node:util';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');
const sqliteFile = process.env.LOCAL_SQLITE_PATH ?? path.join(projectRoot, 'local.db');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error(
    'Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

const sqliteDb = new sqlite3.Database(sqliteFile);
const all = promisify(sqliteDb.all.bind(sqliteDb));
const run = promisify(sqliteDb.run.bind(sqliteDb));

const tableColumnsCache = new Map();

const PRIORITY_TABLES = new Set([
  'users',
  'orders',
  'order_items',
  'tickets',
  'reservations',
  'loyalty_points',
  'customer_consumption',
]);

const cronHeartbeatConfig = {
  table: process.env.SUPABASE_CRON_HEARTBEAT_TABLE ?? 'sync_jobs_status',
  jobColumn: process.env.SUPABASE_CRON_HEARTBEAT_NAME_COLUMN ?? 'job_name',
  timestampColumn: process.env.SUPABASE_CRON_HEARTBEAT_TS_COLUMN ?? 'last_completed_at',
  jobName: process.env.SUPABASE_CRON_HEARTBEAT_JOB ?? 'supabase-nightly-import',
  maxAgeMinutes: Number(process.env.SUPABASE_CRON_HEARTBEAT_MAX_MINUTES ?? '180'),
  required: process.env.SUPABASE_CRON_HEARTBEAT_REQUIRED !== 'false',
};

const SYNC_TABLES = [
  { name: 'users', pk: 'id', updatedColumn: 'updatedAt' },
  { name: 'addresses', pk: 'id', updatedColumn: 'updatedAt' },
  { name: 'orders', pk: 'id', updatedColumn: 'updatedAt' },
  { name: 'order_items', pk: 'id', updatedColumn: 'createdAt' },
  { name: 'tickets', pk: 'id', updatedColumn: 'updatedAt' },
  { name: 'payments', pk: 'id', updatedColumn: 'updatedAt' },
  { name: 'reservations', pk: 'id', updatedColumn: 'updatedAt' },
  { name: 'loyalty_points', pk: 'id', updatedColumn: 'createdAt' },
  { name: 'customer_consumption', pk: 'id', updatedColumn: 'createdAt' },
  { name: 'products', pk: 'id', updatedColumn: 'updatedAt' },
  { name: 'branches', pk: 'id', updatedColumn: 'updatedAt', pushChanges: false },
  { name: 'order_codes', pk: 'id', updatedColumn: 'createdAt', pushChanges: false },
  { name: 'staff_users', pk: 'id', updatedColumn: 'updatedAt' },
  { name: 'staff_sessions', pk: 'id', updatedColumn: 'updatedAt', pushChanges: false },
  { name: 'prep_queue', pk: 'id', updatedColumn: 'updatedAt' },
  { name: 'inventory_categories', pk: 'id', fullRefresh: true, pushChanges: false },
  { name: 'inventory_items', pk: 'id', updatedColumn: 'updatedAt' },
  { name: 'inventory_stock', pk: 'id', updatedColumn: 'lastUpdatedAt' },
  { name: 'inventory_movements', pk: 'id', updatedColumn: 'createdAt' },
  { name: 'pos_action_logs', pk: 'id', updatedColumn: 'createdAt', pushChanges: false },
  { name: 'report_requests', pk: 'id', updatedColumn: 'updatedAt', pushChanges: false },
  { name: 'reservation_failures', pk: 'id', updatedColumn: 'cleanupAt', pushChanges: false },
  { name: 'pos_queue_entries', pk: 'id', updatedColumn: 'updatedAt' },
  { name: 'inventory_stock_ledger', pk: 'id', updatedColumn: 'createdAt', pushChanges: false },
  { name: 'inventory_stock_entries', pk: 'id', updatedColumn: 'createdAt' },
  { name: 'inventory_stock_entry_items', pk: 'id', fullRefresh: true, pushChanges: false },
];

async function ensureSyncStateTable() {
  await run(`
    CREATE TABLE IF NOT EXISTS sync_state (
      tableName TEXT PRIMARY KEY,
      lastSupabasePull TEXT,
      lastSqlitePush TEXT
    )
  `);
}

async function getSyncState(tableName) {
  const row = await all(`SELECT * FROM sync_state WHERE tableName = ?`, [tableName]);
  return row[0] ?? { tableName, lastSupabasePull: null, lastSqlitePush: null };
}

async function updateSyncState(tableName, updates) {
  await run(
    `
    INSERT INTO sync_state (tableName, lastSupabasePull, lastSqlitePush)
    VALUES ($tableName, $lastSupabasePull, $lastSqlitePush)
    ON CONFLICT(tableName) DO UPDATE SET
      lastSupabasePull = COALESCE(EXCLUDED.lastSupabasePull, sync_state.lastSupabasePull),
      lastSqlitePush = COALESCE(EXCLUDED.lastSqlitePush, sync_state.lastSqlitePush)
  `,
    {
      $tableName: tableName,
      $lastSupabasePull: updates.lastSupabasePull ?? null,
      $lastSqlitePush: updates.lastSqlitePush ?? null,
    }
  );
}

async function getColumnSet(tableName) {
  if (tableColumnsCache.has(tableName)) {
    return tableColumnsCache.get(tableName);
  }
  const rows = await all(`PRAGMA table_info(${tableName})`);
  const columnSet = new Set(rows.map((row) => row.name));
  tableColumnsCache.set(tableName, columnSet);
  return columnSet;
}

function filterRowForTable(row, columnSet) {
  if (!columnSet) return row;
  const filtered = {};
  for (const [key, value] of Object.entries(row)) {
    if (columnSet.has(key)) {
      filtered[key] = value;
    }
  }
  return filtered;
}

function buildUpsertStatement(table, row) {
  const columns = Object.keys(row);
  if (!columns.length) return null;
  const placeholders = columns.map((c) => `:${c}`).join(',');
  const updateAssignments = columns
    .filter((col) => col !== table.pk)
    .map((col) => `${col}=excluded.${col}`)
    .join(',');

  return {
    sql: `INSERT INTO ${table.name} (${columns.join(',')})
          VALUES (${placeholders})
          ON CONFLICT(${table.pk}) DO UPDATE SET ${updateAssignments}`,
    params: columns.reduce((acc, col) => ({ ...acc, [`:${col}`]: row[col] ?? null }), {}),
  };
}

async function pullFromSupabase(table, since) {
  const orderColumn = table.updatedColumn ?? table.pk;
  let query = supabase.from(table.name).select('*').order(orderColumn, { ascending: true });
  if (!table.fullRefresh && table.updatedColumn && since) {
    query = query.gt(table.updatedColumn, since);
  }
  const { data, error } = await query;
  if (error) {
    throw new Error(`Supabase pull (${table.name}) failed: ${error.message}`);
  }
  return data ?? [];
}

async function upsertRows(rows, table) {
  for (const row of rows) {
    const filteredRow = filterRowForTable(row, table.columnSet);
    const statement = buildUpsertStatement(table, filteredRow);
    if (!statement) continue;
    await run(statement.sql, statement.params);
  }
}

async function pushSqliteChanges(table, since) {
  if (table.pushChanges === false || !table.updatedColumn) {
    return since;
  }
  const updatedColumn = table.updatedColumn;
  const rows = await all(
    `SELECT * FROM ${table.name} WHERE ${updatedColumn} IS NOT NULL AND ${updatedColumn} > ? ORDER BY ${updatedColumn} ASC`,
    [since ?? '1970-01-01']
  );

  let lastCursor = since ?? '1970-01-01';

  for (const row of rows) {
    const { data: remoteRow, error: fetchError } = await supabase
      .from(table.name)
      .select(`${updatedColumn}`)
      .eq(table.pk, row[table.pk])
      .maybeSingle();

    if (fetchError) {
      throw new Error(
        `Supabase lookup (${table.name}) failed for ${row[table.pk]}: ${fetchError.message}`
      );
    }

    if (remoteRow && remoteRow[updatedColumn] && remoteRow[updatedColumn] >= row[updatedColumn]) {
      lastCursor = row[updatedColumn];
      continue; // Supabase has newer data; skip.
    }

    const { error } = await supabase.from(table.name).upsert(row, { onConflict: table.pk });
    if (error) {
      throw new Error(
        `Supabase push (${table.name}) failed for ${row[table.pk]}: ${error.message}`
      );
    }
    lastCursor = row[updatedColumn];
  }
  return rows.length ? lastCursor : since;
}

async function ensureSupabaseCronHeartbeat() {
  if (!cronHeartbeatConfig.required) {
    return;
  }

  if (
    !cronHeartbeatConfig.table ||
    !cronHeartbeatConfig.jobColumn ||
    !cronHeartbeatConfig.timestampColumn
  ) {
    console.warn('⚠️  Cron heartbeat config incomplete; skipping heartbeat validation.');
    return;
  }

  const { data, error } = await supabase
    .from(cronHeartbeatConfig.table)
    .select(`${cronHeartbeatConfig.jobColumn},${cronHeartbeatConfig.timestampColumn}`)
    .eq(cronHeartbeatConfig.jobColumn, cronHeartbeatConfig.jobName)
    .maybeSingle();

  if (error) {
    const isMissingTable =
      error.code === '42P01' ||
      (error.message && /relation .* does not exist/i.test(error.message));
    if (isMissingTable) {
      console.warn(
        `⚠️  Supabase cron heartbeat table "${cronHeartbeatConfig.table}" not found. ` +
        'Set SUPABASE_CRON_HEARTBEAT_REQUIRED=false to bypass this check.'
      );
      if (cronHeartbeatConfig.required) {
        throw new Error('Supabase cron heartbeat table is required but missing.');
      }
      return;
    }
    throw new Error(`Failed to read Supabase cron heartbeat: ${error.message}`);
  }

  if (!data || !data[cronHeartbeatConfig.timestampColumn]) {
    throw new Error(
      `Supabase cron heartbeat "${cronHeartbeatConfig.jobName}" missing timestamp ` +
      `(${cronHeartbeatConfig.timestampColumn}).`
    );
  }

  const lastRun = new Date(data[cronHeartbeatConfig.timestampColumn]);
  if (Number.isNaN(lastRun.getTime())) {
    throw new Error(
      `Supabase cron heartbeat timestamp is invalid: ${data[cronHeartbeatConfig.timestampColumn]}`
    );
  }

  const ageMinutes = (Date.now() - lastRun.getTime()) / 60000;
  if (ageMinutes > cronHeartbeatConfig.maxAgeMinutes) {
    throw new Error(
      `Supabase cron heartbeat is too old (${ageMinutes.toFixed(1)} min). ` +
      'Wait for the nightly import before pulling data into SQLite.'
    );
  }
  console.log(
    `✅ Supabase cron heartbeat "${cronHeartbeatConfig.jobName}" seen ${ageMinutes.toFixed(
      1
    )} min ago.`
  );
}

async function main() {
  await ensureSupabaseCronHeartbeat();
  await ensureSyncStateTable();
  for (const table of SYNC_TABLES) {
    table.columnSet = await getColumnSet(table.name);
    const state = await getSyncState(table.name);
    console.log(`\n⏳ Syncing ${table.name}...`);

    let pulledRows = [];
    let pullSucceeded = false;
    try {
      pulledRows = await pullFromSupabase(table, state.lastSupabasePull);
      if (pulledRows.length) {
        await upsertRows(pulledRows, table);
      }
      pullSucceeded = true;
    } catch (error) {
      console.warn(`⚠️  Supabase pull skipped for ${table.name}: ${error.message}`);
    }

    let lastSupabasePull = state.lastSupabasePull;
    if (pullSucceeded && table.updatedColumn && !table.fullRefresh && pulledRows.length > 0) {
      lastSupabasePull = pulledRows[pulledRows.length - 1][table.updatedColumn];
    }

    let lastSqlitePush = state.lastSqlitePush;
    let pushSucceeded = false;
    const shouldPush =
      pullSucceeded || !PRIORITY_TABLES.has(table.name) || table.fullRefresh === true;

    if (shouldPush) {
      try {
        lastSqlitePush = await pushSqliteChanges(table, state.lastSqlitePush);
        pushSucceeded = true;
      } catch (error) {
        console.warn(`⚠️  Supabase push skipped for ${table.name}: ${error.message}`);
      }
    } else {
      console.log(
        `⏸️  Skipping SQLite -> Supabase push for ${table.name} because Supabase ` +
        'pull did not succeed in this run.'
      );
    }

    await updateSyncState(table.name, {
      lastSupabasePull: pullSucceeded ? lastSupabasePull : undefined,
      lastSqlitePush: pushSucceeded ? lastSqlitePush : undefined,
    });

    console.log(
      `✅ ${table.name} - pulled ${pullSucceeded ? pulledRows.length : 'skipped'}, pushed ${pushSucceeded && lastSqlitePush !== state.lastSqlitePush ? 'changes' : '0'
      }`
    );
  }
  sqliteDb.close();
}

main().catch((err) => {
  console.error(err);
  sqliteDb.close();
  process.exit(1);
});
