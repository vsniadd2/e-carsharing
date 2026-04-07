/**
 * Расставляет релевантные photoUrl по типу ТС (циклически), без «левых» картинок.
 * Запуск: node patch-photo-urls.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const POOLS = {
  scooter: [
    'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Electric_kick_scooter_in_Paris_2018.jpg/1280px-Electric_kick_scooter_in_Paris_2018.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/E_-_scooter_01.jpg/1280px-E_-_scooter_01.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/Shared_electric_kick_scooters_in_Blacksburg%2C_Virginia.jpg/1280px-Shared_electric_kick_scooters_in_Blacksburg%2C_Virginia.jpg',
  ],
  bike: [
    'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/Electric_bicycle_at_station_%282%29.jpg/1280px-Electric_bicycle_at_station_%282%29.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/Electric_bicycle_modern.jpg/1280px-Electric_bicycle_modern.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/2/26/E-bike_IMG_0874.JPG/1280px-E-bike_IMG_0874.JPG',
  ],
  car: [
    'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d6/Tesla_Model_3_parked%2C_front_left_corner.jpg/1280px-Tesla_Model_3_parked%2C_front_left_corner.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bc/2023_BMW_iX1_xDrive30_M_Sport_1.jpg/1280px-2023_BMW_iX1_xDrive30_M_Sport_1.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/2022_Volkswagen_ID.3_Prototype_Sport_by_Mansory_front_View_clean_%28cropped%29.jpg/1280px-2022_Volkswagen_ID.3_Prototype_Sport_by_Mansory_front_View_clean_%28cropped%29.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/1/19/Nissan_Leaf_2018_%2844636852614%29.jpg/1280px-Nissan_Leaf_2018_%2844636852614%29.jpg',
  ],
  charging: [
    'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Charging_station_of_Tesla_in_Shanghai.jpg/1280px-Charging_station_of_Tesla_in_Shanghai.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7d/EV_charging_station_sign.jpg/1280px-EV_charging_station_sign.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Charging_station_European_outdoors.jpg/1280px-Charging_station_European_outdoors.jpg',
  ],
}

const fleetPath = join(__dirname, 'fleet.json')
const rows = JSON.parse(readFileSync(fleetPath, 'utf8'))
const idx = { scooter: 0, bike: 0, car: 0, charging: 0 }

for (const r of rows) {
  const type = r.type
  const pool = POOLS[type] ?? POOLS.car
  const i = idx[type] ?? 0
  r.photoUrl = pool[i % pool.length]
  idx[type] = i + 1
}

writeFileSync(fleetPath, JSON.stringify(rows, null, 2) + '\n', 'utf8')
console.log(`OK: updated photoUrl for ${rows.length} rows.`)
