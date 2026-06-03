# AlgoLens - Deployment & Testing Guide

This guide details how to configure, run, and deploy the **AlgoLens** FastAPI telemetry backend, set up a serverless PostgreSQL database using NeonDB, deploy the service on Render, and test the extension locally.

---

## 🌐 Local Development & Testing

We have built a zero-configuration local testing flow that uses **SQLite** natively so you do not need a running PostgreSQL server on your machine to iterate.

### Step 1: Run the Backend Locally (SQLite)
1. Navigate to the `/backend` folder:
   ```bash
   cd backend
   ```
2. Activate the python virtual environment:
   ```bash
   .venv\Scripts\activate
   ```
3. Run the uvicorn development server:
   ```bash
   uvicorn app.main:app --reload
   ```
4. Access the API documentation at `http://127.0.0.1:8000/docs`.
   > [!NOTE]
   > By default, the local server reads configuration from `backend/.env`. It will automatically spin up a local file database at `backend/algolens.db` and set `CORS_ORIGINS=*`.

### Step 2: Build the Extension for Local Testing
1. Open a new terminal and navigate to the `/extension` folder:
   ```bash
   cd extension
   ```
2. Build the extension bundle in development mode:
   ```bash
   npm run build:dev
   ```
   > [!TIP]
   > The `build:dev` command automatically compiles Vite referencing the backend local URL (`http://localhost:8000`) defined inside `extension/.env.development`.
3. In Chrome, load the compiled `/extension/dist` folder via `chrome://extensions/` using the **Load unpacked** button (make sure **Developer mode** is enabled).

> [!WARNING]
> **Camo Proxy Notice**: When testing locally, the dynamic SVG image links embedded in your repository's `README.md` will point to `http://localhost:8000`. Opening this link in a new browser tab will load the card perfectly, but it will show as a broken image on the GitHub repository page. This is normal because GitHub's camo proxy servers cannot reach your computer's `localhost` to fetch and render the image. Once deployed to production, it will display correctly on GitHub.

---

## 🐘 Database Setup (NeonDB)

Render services require a live PostgreSQL database to store global anonymous metrics. We recommend using **NeonDB** for a free, serverless PostgreSQL instance:

1. Create a free account at [neon.tech](https://neon.tech/).
2. Create a new project and select your database region.
3. In your Neon Dashboard, locate the **Connection Details** box.
4. Copy the connection string. Make sure to choose **`postgresql+asyncpg`** as the protocol (since our SQLAlchemy session uses async connections).
   Your connection URL should look like this:
   ```text
   postgresql+asyncpg://<username>:<password>@<neon-subdomain>.route.neon.tech/neondb?sslmode=require
   ```

---

## 🚀 Deploying Backend to Render

To host your Telemetry API and SVG Card Generator publicly:

1. Sign up/Log in to [Render](https://render.com/).
2. Click **New +** and select **Web Service**.
3. Connect your GitHub repository containing the **AlgoLens** code.
4. Configure the Web Service settings:
   - **Name**: `algolens-backend` (or a custom name)
   - **Language**: `Python`
   - **Build Command**: `pip install -r backend/requirements.txt`
   - **Start Command**: `python -m uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT`
5. Click **Advanced** to add **Environment Variables**:
   - `DATABASE_URL`: The NeonDB connection URI you copied (prefixed with `postgresql+asyncpg://`).
   - `CORS_ORIGINS`: Set to `*` to allow wildcard origins, or supply a comma-separated list of your whitelisted client origins (e.g. your chrome extension ID `chrome-extension://<your-id>`).
6. Click **Deploy Web Service**. Render will compile, run database migrations, and boot the API.

---

## 📦 Bundling the Extension for Production

Once your Render backend is live:

1. Open [extension/.env](file:///c:/Users/Karthikeya%20Akhandam/Codes/algolens/extension/.env).
2. Set `VITE_BACKEND_URL` to your newly deployed Render server URL:
   ```env
   VITE_BACKEND_URL=https://algolens-backend.onrender.com
   ```
3. In the `/extension` directory, compile the production bundle:
   ```bash
   npm run build
   ```
4. Load the compiled `/extension/dist` folder into Chrome. The extension is now ready to push solutions and fetch cards from your production cloud stack!
