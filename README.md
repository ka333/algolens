# AlgoLens

AlgoLens is a privacy-first browser extension that tracks LeetCode solving activity, pushes clean solution code to a user's GitHub repository, compiles statistics, and generates dynamic metrics/streak cards for GitHub profile READMEs. It includes a Python FastAPI telemetry backend that anonymizes event logs to generate global analytics.

## Monorepo Layout

- `/extension`: The Google Chrome Extension built using Vite, React, and TypeScript.
- `/backend`: The Telemetry API & SVG rendering server built using Python, FastAPI, and NeonDB.
- `/local`: Local specifications and references (PRD, details).

---

## 🛠️ Chrome Extension Installation Guide

1. Clone this repository to your local machine.
2. Navigate to `/extension` and install dependencies:
   ```bash
   npm install
   ```
3. Compile the production extension build bundle:
   ```bash
   npm run build
   ```
4. Open Google Chrome and navigate to `chrome://extensions/`.
5. Enable **Developer mode** (top-right toggle).
6. Click **Load unpacked** (top-left button) and select the `/extension/dist` folder.
7. AlgoLens is now active! Click the extension icon in your toolbar to configure.

---

## 🔑 GitHub Personal Access Token (PAT) Setup

To allow AlgoLens to sync solutions directly to your repository:
1. Go to **GitHub Settings -> Developer Settings -> Personal Access Tokens (Tokens classic)**.
2. Click **Generate new token (classic)**.
3. Name it (e.g. `AlgoLens Sync`) and select the **`repo`** scope checkbox (Required to commit files).
4. Click **Generate token** and copy it.
5. Paste the token into the AlgoLens popup GitHub authorization tab.
6. Select your target repository and subfolder (e.g. `leetcode`).

---

## 🚀 Telemetry Backend Deployment Guide (FastAPI + NeonDB)

### Local Development
1. Navigate to `/backend` and create a virtual environment:
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   ```
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Create a `.env` file containing your database connection string:
   ```env
   DATABASE_URL=postgresql+asyncpg://<username>:<password>@<neon-host>/algolens?ssl=require
   ```
4. Run the development server:
   ```bash
   uvicorn app.main:app --reload
   ```
5. The API documentation will be available at `http://localhost:8000/docs`.

### Deploying to Render
1. Create a new **Web Service** on Render and connect this repository.
2. Set the Environment to **Python**.
3. Configure build command:
   ```bash
   pip install -r backend/requirements.txt
   ```
4. Configure start command:
   ```bash
   python -m uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT
   ```
5. In **Environment Variables**, add:
   - `DATABASE_URL`: Your connection string from NeonDB (using the `postgresql+asyncpg://` schema).
   - `CORS_ORIGINS`: A comma-separated list of allowed origins (use `*` for testing, or set specific domains/extension origins for production).

---

## 🌐 Testing Local Development vs. Production

- **Local Development / Testing**:
  - Run `npm run build:dev` inside `/extension` to compile the extension targeting your local server (`http://localhost:8000`).
  - Run `uvicorn app.main:app --reload` inside `/backend` (which automatically uses the `.env` settings targeting local SQLite and `CORS_ORIGINS=*`).
  - **Important**: When you sync solutions, the README image URL will point to your local machine (`http://localhost:8000/api/svg/stats?...`). When you open that link in a new browser tab, **it will load the SVG card perfectly**. However, on the GitHub website page itself, the image will appear broken because GitHub's servers cannot reach your computer's `localhost` to proxy the image.
- **Production / Live Deployment**:
  - Deploy your backend to Render and set the environment variables.
  - Update `VITE_BACKEND_URL` in `/extension/.env` to point to your live Render server address (e.g. `https://my-backend.onrender.com`).
  - Run `npm run build` in `/extension` to compile the production bundle.
  - Solutions synced after this will have cards pointing to Render, allowing GitHub to fetch and render the cards on your profile page.
