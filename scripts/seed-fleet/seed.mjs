/**
 * Заполняет таблицу vehicles в PostgreSQL из fleet.json (UPSERT по Id).
 *
 * Подключение (как у docker-compose):
 *   set DATABASE_URL=postgres://ecoride:ecoride_dev@localhost:5432/ecoride
 *   node seed.mjs
 *
 * Или отдельные переменные: PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const __dirname = dirname(fileURLToPath(import.meta.url))

function getClient() {
  if (process.env.DATABASE_URL) {
    return new pg.Client({ connectionString: process.env.DATABASE_URL })
  }
  return new pg.Client({
    host: process.env.PGHOST ?? 'localhost',
    port: Number(process.env.PGPORT ?? 5432),
    user: process.env.PGUSER ?? 'ecoride',
    password: process.env.PGPASSWORD ?? 'ecoride_dev',
    database: process.env.PGDATABASE ?? 'ecoride',
  })
}

const insertSql = `
INSERT INTO vehicles (
  "Id", "Type", "Name", "Lat", "Lng", "BatteryPercent", "PriceStart", "PricePerMinute",
  "Status", "Seats", "RangeKm", "LowBatteryFlag", "PhotoUrl", "Description", "VehicleClass"
) VALUES (
  $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
)
ON CONFLICT ("Id") DO UPDATE SET
  "Type" = EXCLUDED."Type",
  "Name" = EXCLUDED."Name",
  "Lat" = EXCLUDED."Lat",
  "Lng" = EXCLUDED."Lng",
  "BatteryPercent" = EXCLUDED."BatteryPercent",
  "PriceStart" = EXCLUDED."PriceStart",
  "PricePerMinute" = EXCLUDED."PricePerMinute",
  "Status" = EXCLUDED."Status",
  "Seats" = EXCLUDED."Seats",
  "RangeKm" = EXCLUDED."RangeKm",
  "LowBatteryFlag" = EXCLUDED."LowBatteryFlag",
  "PhotoUrl" = EXCLUDED."PhotoUrl",
  "Description" = EXCLUDED."Description",
  "VehicleClass" = EXCLUDED."VehicleClass"
`

const fleetPath = join(__dirname, 'fleet.json')
const rows = JSON.parse(readFileSync(fleetPath, 'utf8'))

const client = getClient()
await client.connect()
try {
  for (const r of rows) {
    await client.query(insertSql, [
      r.id,
      r.type,
      r.name,
      r.lat,
      r.lng,
      r.batteryPercent,
      r.priceStart,
      r.pricePerMinute,
      r.status,
      r.seats,
      r.rangeKm,
      r.lowBatteryFlag,
      r.photoUrl ?? null,
      r.description ?? null,
      r.vehicleClass ?? null,
    ])
  }
  console.log(`OK: upserted ${rows.length} vehicles (fleet + charging).`)
} finally {
  await client.end()
}
