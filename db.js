// Booking storage.
// - If DATABASE_URL is set (e.g. on Render with Neon), bookings are stored in Postgres.
// - Otherwise they go in data/bookings.json, so you can try the site locally with no setup.
//   (Don't rely on the file on Render's free plan: it is wiped on every redeploy.)

const fs = require('fs');
const path = require('path');

const useDatabase = Boolean(process.env.DATABASE_URL);

let pool;
if (useDatabase) {
  const { Pool } = require('pg');
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } // Neon requires SSL
  });
}

const DATA_FILE = path.join(__dirname, 'data', 'bookings.json');

function readFile() {
  if (!fs.existsSync(DATA_FILE)) return [];
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function writeFile(bookings) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(bookings, null, 2));
}

// Creates the bookings table the first time the app runs.
async function init() {
  if (!useDatabase) {
    console.log('No DATABASE_URL set: saving bookings to data/bookings.json');
    return;
  }
  await pool.query(`
    CREATE TABLE IF NOT EXISTS bookings (
      id         SERIAL PRIMARY KEY,
      trip_id    TEXT NOT NULL,
      trip_date  DATE NOT NULL,
      guests     INTEGER NOT NULL,
      name       TEXT NOT NULL,
      email      TEXT NOT NULL,
      phone      TEXT NOT NULL,
      notes      TEXT NOT NULL DEFAULT '',
      status     TEXT NOT NULL DEFAULT 'New',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  console.log('Connected to database');
}

async function addBooking(b) {
  if (useDatabase) {
    const result = await pool.query(
      `INSERT INTO bookings (trip_id, trip_date, guests, name, email, phone, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [b.tripId, b.date, b.guests, b.name, b.email, b.phone, b.notes]
    );
    return result.rows[0].id;
  }
  const bookings = readFile();
  const id = bookings.reduce((max, x) => Math.max(max, x.id), 0) + 1;
  bookings.push({ id, ...b, status: 'New', createdAt: new Date().toISOString() });
  writeFile(bookings);
  return id;
}

// Returns all bookings, newest first, in the same shape for both storage types.
async function listBookings() {
  if (useDatabase) {
    const result = await pool.query(
      `SELECT id, trip_id AS "tripId", to_char(trip_date, 'YYYY-MM-DD') AS date, guests,
              name, email, phone, notes, status, created_at AS "createdAt"
       FROM bookings ORDER BY created_at DESC`
    );
    return result.rows;
  }
  return readFile().reverse();
}

// Returns true if a booking with that id existed and was updated.
async function setStatus(id, status) {
  if (useDatabase) {
    const result = await pool.query('UPDATE bookings SET status = $1 WHERE id = $2', [status, id]);
    return result.rowCount > 0;
  }
  const bookings = readFile();
  const booking = bookings.find((x) => x.id === id);
  if (!booking) return false;
  booking.status = status;
  writeFile(bookings);
  return true;
}

module.exports = { init, addBooking, listBookings, setStatus };
