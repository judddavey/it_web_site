# Bluewater Bay Charters

A fishing charter website. Visitors browse trips and send a booking request; the owner reviews requests on a password-protected admin page.

- Public site: `/`
- Admin page: `/admin` (any username, password = `ADMIN_PASSWORD`)

## Run it on your computer

1. Install [Node.js](https://nodejs.org) (version 18 or newer).
2. Open a terminal in this folder and run:
   ```
   npm install
   npm start
   ```
3. Open http://localhost:3000. The admin page is http://localhost:3000/admin with password `changeme`.

Without a database set, requests are saved to `data/bookings.json`, which is fine for trying it out.

## Change the content

- **Trips, prices, group sizes:** the `TRIPS` list at the top of `server.js`.
- **Business name, captain, boat, FAQ, phone, email, address:** `public/index.html`.
- **Colours:** the variables at the top of `public/style.css`.

## Put it online (GitHub + Render + Neon, all free)

1. **GitHub:** create a new repository and upload this folder (`node_modules` and `data` are ignored automatically).
2. **Neon database:** sign up at https://neon.tech, create a project, and copy the connection string (it starts with `postgresql://`). The app creates its table on first start.
3. **Render:** sign up at https://render.com, choose **New → Web Service**, and connect your GitHub repository.
   - Build command: `npm install`
   - Start command: `npm start`
   - Instance type: Free
   - Environment variables:
     - `DATABASE_URL` = your Neon connection string
     - `ADMIN_PASSWORD` = a strong password of your choice
4. Click **Deploy**. Your site will be at `https://<your-service>.onrender.com`. Every push to GitHub redeploys it.

Note: on the free plan the site sleeps after about 15 minutes without visitors, so the first visit after that takes around 30 seconds to load.
