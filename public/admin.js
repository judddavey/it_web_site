// The browser remembers the admin password from the login box and
// sends it automatically with these requests (same site).
const list = document.getElementById('booking-list');
const filters = document.getElementById('filters');

let bookings = [];
let currentFilter = 'All';

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text == null ? '' : String(text);
  return div.innerHTML;
}

function formatDate(isoDate) {
  // isoDate is "YYYY-MM-DD"; build it as a local date so it doesn't shift a day
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
  });
}

function render() {
  const shown = currentFilter === 'All' ? bookings : bookings.filter((b) => b.status === currentFilter);

  if (shown.length === 0) {
    list.innerHTML = `<p class="card empty">No ${currentFilter === 'All' ? '' : currentFilter.toLowerCase() + ' '}requests yet.</p>`;
    return;
  }

  list.innerHTML = shown
    .map(
      (b) => `
      <article class="card booking">
        <div>
          <h3>${escapeHtml(b.name)}: ${escapeHtml(b.tripName)}</h3>
          <p class="meta">
            ${formatDate(b.date)} · ${b.guests} guest${b.guests === 1 ? '' : 's'} ·
            received ${new Date(b.createdAt).toLocaleString()}
          </p>
          <div class="contact">
            <a href="tel:${escapeHtml(b.phone)}">${escapeHtml(b.phone)}</a>
            <a href="mailto:${escapeHtml(b.email)}">${escapeHtml(b.email)}</a>
          </div>
          ${b.notes ? `<p class="notes">${escapeHtml(b.notes)}</p>` : ''}
        </div>
        <div class="actions">
          <span class="badge badge-${b.status}">${b.status}</span>
          ${b.status !== 'Confirmed' ? `<button class="btn" data-id="${b.id}" data-status="Confirmed">Confirm</button>` : ''}
          ${b.status !== 'Declined' ? `<button class="btn btn-decline" data-id="${b.id}" data-status="Declined">Decline</button>` : ''}
        </div>
      </article>`
    )
    .join('');
}

async function loadBookings() {
  try {
    const res = await fetch('/api/bookings');
    if (!res.ok) throw new Error();
    bookings = await res.json();
    render();
  } catch {
    list.innerHTML = '<p class="card empty">Could not load requests. Try refreshing the page.</p>';
  }
}

list.addEventListener('click', async (e) => {
  const button = e.target.closest('button[data-id]');
  if (!button) return;
  button.disabled = true;
  try {
    const res = await fetch(`/api/bookings/${button.dataset.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: button.dataset.status })
    });
    if (!res.ok) throw new Error();
    const booking = bookings.find((b) => String(b.id) === button.dataset.id);
    booking.status = button.dataset.status;
    render();
  } catch {
    button.disabled = false;
    alert('Could not update this request. Please try again.');
  }
});

filters.addEventListener('click', (e) => {
  const button = e.target.closest('.filter');
  if (!button) return;
  currentFilter = button.dataset.status;
  filters.querySelectorAll('.filter').forEach((f) => f.classList.toggle('active', f === button));
  render();
});

document.getElementById('refresh').addEventListener('click', loadBookings);

loadBookings();
