const express = require('express');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'changeme';

// ---------------------------------------------------------------
// Trips offered. Edit these to change what appears on the site
// and in the booking form. Prices are per trip, not per person.
// ---------------------------------------------------------------
const TRIPS = [
  {
    id: 'half-day',
    name: 'Half-Day Inshore',
    length: '4 hours',
    departs: '7:00 AM or 12:30 PM',
    price: 450,
    maxGuests: 4,
    description: 'Calm bay waters, great for families and first-timers. Snapper, whiting and flathead.'
  },
  {
    id: 'full-day',
    name: 'Full-Day Offshore',
    length: '8 hours',
    departs: '6:00 AM',
    price: 850,
    maxGuests: 6,
    description: 'Head out past the reef for bigger fish: kingfish, tuna and mahi-mahi in season.'
  },
  {
    id: 'sunset',
    name: 'Sunset Bottom Fishing',
    length: '3 hours',
    departs: '4:30 PM',
    price: 380,
    maxGuests: 4,
    description: 'A relaxed evening session as the sun goes down. Light refreshments included.'
  }
];

const STATUSES = ['New', 'Confirmed', 'Declined'];

app.use(express.json());

// Asks for the admin password using the browser's built-in login box.
// Any username works; only the password is checked.
function requireAdmin(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, encoded] = header.split(' ');
  if (scheme === 'Basic' && encoded) {
    const decoded = Buffer.from(encoded, 'base64').toString();
    const password = decoded.slice(decoded.indexOf(':') + 1);
    if (password === ADMIN_PASSWORD) return next();
  }
  res.set('WWW-Authenticate', 'Basic realm="Admin"');
  res.status(401).send('Password required');
}

// Admin page is protected; it must be registered before the public folder.
app.get(['/admin', '/admin.html'], requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/trips', (req, res) => {
  res.json(TRIPS);
});

// Checks a booking request and returns an error message, or null if it's fine.
function validateBooking(b) {
  const trip = TRIPS.find((t) => t.id === b.tripId);
  if (!trip) return 'Please choose a trip.';

  if (!/^\d{4}-\d{2}-\d{2}$/.test(b.date || '')) return 'Please choose a date.';
  const today = new Date().toISOString().slice(0, 10);
  if (b.date < today) return 'Please choose a date in the future.';

  const guests = Number(b.guests);
  if (!Number.isInteger(guests) || guests < 1 || guests > trip.maxGuests) {
    return `This trip takes 1 to ${trip.maxGuests} guests.`;
  }

  if (!b.name || b.name.trim().length < 2) return 'Please enter your name.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email || '')) return 'Please enter a valid email address.';
  if (!b.phone || b.phone.replace(/\D/g, '').length < 6) return 'Please enter a phone number.';
  if ((b.notes || '').length > 1000) return 'Notes must be under 1000 characters.';
  return null;
}

app.post('/api/bookings', async (req, res) => {
  const body = req.body || {};
  const error = validateBooking(body);
  if (error) return res.status(400).json({ error });

  try {
    const id = await db.addBooking({
      tripId: body.tripId,
      date: body.date,
      guests: Number(body.guests),
      name: body.name.trim(),
      email: body.email.trim(),
      phone: body.phone.trim(),
      notes: (body.notes || '').trim()
    });
    res.status(201).json({ id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sorry, something went wrong. Please call us instead.' });
  }
});

app.get('/api/bookings', requireAdmin, async (req, res) => {
  try {
    const bookings = await db.listBookings();
    // Add the trip name so the admin page can show it
    const withTrip = bookings.map((b) => ({
      ...b,
      tripName: (TRIPS.find((t) => t.id === b.tripId) || {}).name || b.tripId
    }));
    res.json(withTrip);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load bookings.' });
  }
});

app.patch('/api/bookings/:id', requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body || {};
  if (!STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status.' });

  try {
    const found = await db.setStatus(id, status);
    if (!found) return res.status(404).json({ error: 'Booking not found.' });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not update booking.' });
  }
});

db.init()
  .then(() => {
    if (!process.env.ADMIN_PASSWORD) {
      console.warn('ADMIN_PASSWORD not set: the admin password is "changeme". Set it before going live.');
    }
    app.listen(PORT, () => console.log(`Site running at http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('Could not start:', err.message);
    process.exit(1);
  });
