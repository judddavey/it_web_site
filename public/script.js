const tripList = document.getElementById('trip-list');
const form = document.getElementById('booking-form');
const tripSelect = document.getElementById('tripId');
const dateInput = document.getElementById('date');
const guestsInput = document.getElementById('guests');
const guestsHint = document.getElementById('guests-hint');
const formError = document.getElementById('form-error');
const formSuccess = document.getElementById('form-success');

let trips = [];

document.getElementById('year').textContent = new Date().getFullYear();

// Earliest date allowed is tomorrow (in the visitor's local time)
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
const toDateValue = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
dateInput.min = toDateValue(tomorrow);

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function renderTrips() {
  tripList.innerHTML = trips
    .map(
      (t) => `
      <article class="card trip">
        <h3>${escapeHtml(t.name)}</h3>
        <p class="price">$${t.price}<span> per trip</span></p>
        <ul class="trip-facts">
          <li>${escapeHtml(t.length)}</li>
          <li>Departs ${escapeHtml(t.departs)}</li>
          <li>Up to ${t.maxGuests} guests</li>
        </ul>
        <p>${escapeHtml(t.description)}</p>
        <button type="button" class="btn btn-full" data-trip="${t.id}">Request this trip</button>
      </article>`
    )
    .join('');

  tripSelect.innerHTML =
    '<option value="">Choose a trip</option>' +
    trips.map((t) => `<option value="${t.id}">${escapeHtml(t.name)} ($${t.price})</option>`).join('');
}

// Keep the guest limit in step with the chosen trip
function updateGuestLimit() {
  const trip = trips.find((t) => t.id === tripSelect.value);
  const max = trip ? trip.maxGuests : 6;
  guestsInput.max = max;
  guestsHint.textContent = trip ? `Up to ${max} guests on this trip` : '';
  if (Number(guestsInput.value) > max) guestsInput.value = max;
}

async function loadTrips() {
  try {
    const res = await fetch('/api/trips');
    trips = await res.json();
    renderTrips();
  } catch {
    tripList.innerHTML = '<p class="muted">Trips could not be loaded. Please refresh the page.</p>';
  }
}

// "Request this trip" buttons pick the trip and jump to the form
tripList.addEventListener('click', (e) => {
  const button = e.target.closest('[data-trip]');
  if (!button) return;
  tripSelect.value = button.dataset.trip;
  updateGuestLimit();
  document.getElementById('book').scrollIntoView({ behavior: 'smooth' });
  dateInput.focus({ preventScroll: true });
});

tripSelect.addEventListener('change', updateGuestLimit);

function showError(message) {
  formError.textContent = message;
  formError.hidden = false;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  formError.hidden = true;

  // Use the browser's built-in checks first (required fields, email format, etc.)
  if (!form.checkValidity()) {
    const firstInvalid = form.querySelector(':invalid');
    const label = form.querySelector(`label[for="${firstInvalid.id}"]`);
    showError(`Please check: ${label.childNodes[0].textContent.trim()}.`);
    firstInvalid.focus();
    return;
  }

  const data = Object.fromEntries(new FormData(form));
  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  button.textContent = 'Sending…';

  try {
    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (!res.ok) {
      showError(result.error || 'Something went wrong. Please try again.');
      return;
    }
    form.reset();
    form.hidden = true;
    formSuccess.hidden = false;
    formSuccess.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } catch {
    showError('Could not send your request. Check your connection and try again.');
  } finally {
    button.disabled = false;
    button.textContent = 'Send booking request';
  }
});

document.getElementById('another').addEventListener('click', () => {
  formSuccess.hidden = true;
  form.hidden = false;
  updateGuestLimit();
});

loadTrips();
