# AlgoLens - Deployment & Testing Guide

This guide details how to configure, run, and deploy the **AlgoLens** FastAPI telemetry backend, set up a serverless PostgreSQL database using NeonDB, deploy the service on Render, and test the extension locally.

---

## 📂 Monorepo Layout

- `/extension`: The Google Chrome Extension built using Vite, React, and TypeScript.
- `/backend`: The Telemetry API & SVG rendering server built using Python, FastAPI, and NeonDB.
- `/local`: Local specifications and references.

---

## 🛠️ Chrome Extension Installation (From Source)

To build and load the Chrome Extension locally in developer mode:

1. Clone this repository to your local machine.
2. Navigate to the `/extension` directory and install the dependencies:
   ```bash
   npm install
   ```
3. Compile the extension build bundle:
   ```bash
   npm run build
   ```
4. Open Google Chrome and navigate to `chrome://extensions/`.
5. Enable **Developer mode** using the toggle in the top-right corner.
6. Click **Load unpacked** in the top-left corner.
7. Select the `extension/dist` folder inside this repository.
8. AlgoLens is now active! Click the extension icon in your toolbar to configure.

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

Once your backend is live (either on Render or Hugging Face):

1. Open [extension/.env](file:///c:/Users/Karthikeya%20Akhandam/Codes/algolens/extension/.env).
2. Set `VITE_BACKEND_URL` to your newly deployed server URL:
   ```env
   VITE_BACKEND_URL=https://algolens-backend.onrender.com
   ```
3. In the `/extension` directory, compile the production bundle:
   ```bash
   npm run build
   ```
4. Load the compiled `/extension/dist` folder into Chrome. The extension is now ready to push solutions and fetch cards from your production cloud stack!

---

## 🤗 Deploying Backend to Hugging Face Spaces (Free 24/7 Hosting)

Hugging Face (HF) Spaces provides free container hosting which is a great, cost-free alternative for deploying the telemetry API.

### Step 1: Create a Hugging Face Space
1. Sign up or log in at [huggingface.co](https://huggingface.co/).
2. Click on **Spaces** and choose **Create new Space**.
3. Configure the Space settings:
   - **Space Name**: `algolens-backend`
   - **License**: Choose your preferred license (e.g. `mit`).
   - **Select the Space SDK**: Click **Docker**.
   - **Docker template**: Choose **Blank**.
   - **Space Visibility**: Public.
4. Click **Create Space**.

### Step 2: Push the Code
1. Clone the Hugging Face Space repository locally, or link it as a git remote.
2. Push all the monorepo files (or just the contents of `/backend` to the root of the Space repo).
   > [!NOTE]
   > Our `/backend` directory contains a dedicated `Dockerfile` that exposes port `7860` (which Hugging Face Space expects by default) and runs as the non-root user `1000` to satisfy HF permission checks.

### Step 3: Add Environment Variables
1. Go to your Space **Settings** tab.
2. Scroll to the **Variables and secrets** section.
3. Add your environment variables:
   - **Secret**: `DATABASE_URL` -> Your NeonDB connection string (prefixed with `postgresql+asyncpg://`).
   - **Variable**: `CORS_ORIGINS` -> Set to `*` or your whitelisted Chrome extension ID.

### Step 4: Keep the Space Awake for Free
Hugging Face's free tier automatically sleeps after 48 hours of inactivity. To keep your backend active 24/7:
1. Create a free account on a pinging service like [cron-job.org](https://cron-job.org) or [UptimeRobot](https://uptimerobot.com).
2. Set up a job to ping your Hugging Face Space's public HTTP endpoint (e.g., `https://<your-username>-algolens-backend.hf.space/docs`) every 30 minutes.
3. This counts as activity and keeps your server running indefinitely for free.

---

## 🔒 Persistent Extension ID & Free Distribution

Normally, loading an unpacked extension or updating files causes Chrome to change the **Extension ID**. When the ID changes, Chrome isolates the data, causing you to **lose your GitHub Personal Access Token, configured folder, and local streak statistics**.

To prevent this and distribute your extension for free without paying the Chrome Web Store $5 fee:

### Step 1: Lock Your Extension ID
We can lock the Extension ID by defining a `"key"` field in the `manifest.json`. The ID is mathematically tied to this key, meaning it will never change.

1. Navigate to the `/extension` folder:
   ```bash
   cd extension
   ```
2. Run our key generation utility script:
   ```bash
   node generate-key.js
   ```
   *This generates a `private_key.pem` and prints a base64 key block.*
3. Open `extension/public/manifest.json` and insert the generated `"key"` field at the root level:
   ```json
   {
     "manifest_version": 3,
     "name": "AlgoLens",
     "key": "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQ...",
     "version": "0.1.0"
     ...
   }
   ```
4. Rebuild the extension and load the `/extension/dist` folder into Chrome.
5. Your Extension ID is now locked! You can reload it, rename the folder, move it to another computer, or share it with friends—**the login token, preferences, and streaks will never be lost during updates**.

### Step 2: Free Distribution via GitHub Releases
Since you are not deploying to the Web Store, you can distribute updates to users using GitHub Releases:
1. Set the `"key"` in the manifest so all your users share the exact same Extension ID.
2. Compile the extension: `npm run build`.
3. Zip the `/extension/dist` folder (e.g. `algolens-extension.zip`).
4. Create a new release in your GitHub repository and attach the zip.
5. Instruct your users to download the zip, extract it, and simply overwrite their previous installation folder. Chrome will recognize the update, keep the extension ID, and preserve their authentication session seamlessly!
