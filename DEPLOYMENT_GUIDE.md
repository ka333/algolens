# AlgoLens - Comprehensive Deployment & Testing Guide 🚀

Welcome to the **AlgoLens** deployment guide! This document is designed to take you step-by-step through setting up, testing, and deploying the Chrome extension and the telemetry backend.

---

## 🛠️ Step 1: Prerequisites Installation (For Beginners)

Before we start, you need to install the core tools on your computer.

### 1. Install Node.js & npm (Required for the Extension)
Node.js is a runtime that lets us build the extension. **npm** (Node Package Manager) is installed automatically with it.
- **Windows / macOS**:
  1. Download the **LTS (Long Term Support)** installer from the official [Node.js Website](https://nodejs.org/).
  2. Run the installer and click through the default options.
  3. Verify the installation by opening your command prompt or terminal and running:
     ```bash
     node -v
     npm -v
     ```
     *(Both commands should output version numbers, e.g., `v20.x.x` and `10.x.x`)*

### 2. Install Git
Git allows you to track code changes and push them to GitHub.
- **Windows**: Download and install from [git-scm.com](https://git-scm.com/).
- **macOS**: Run `git --version` in terminal. If not installed, it will prompt you to install Xcode Command Line Tools.

---

## 📂 Monorepo Layout

This repository is split into three main directories:
- `/extension`: The Google Chrome Extension source code (Vite + React + TypeScript).
- `/backend`: The Telemetry API & SVG rendering server (Python + FastAPI + NeonDB).
- `/local`: Design parameters and developer references.

---

## 🛠️ Step 2: Build & Load the Chrome Extension Locally

To run the extension in your browser, you must compile it from source and load it into Google Chrome.

### 1. Open Your Terminal
Open command prompt (Windows) or Terminal (macOS) and navigate to your project directory.

### 2. Install Project Dependencies
Navigate to the `/extension` directory and download the packages:
```bash
cd extension
npm install
```
*(This creates an `extension/node_modules/` directory containing all building tools like React and TypeScript)*

### 3. Compile the Code
Run the compilation command to build the production bundle:
```bash
npm run build
```
*(This compiles your React and TypeScript code into plain HTML, CSS, and JS inside a new directory: `extension/dist/`)*

### 4. Load the Extension into Google Chrome
1. Open Google Chrome.
2. In the URL bar, type: **`chrome://extensions/`** and press Enter.
3. In the top-right corner, toggle the **Developer mode** switch to **ON**.
4. In the top-left corner, click the **Load unpacked** button.
5. In the file explorer popup, navigate to your cloned repository, enter the `/extension` folder, and **select the `dist` directory** (do not select the parent `extension` folder, select `dist` which contains `manifest.json`).
6. Click **Select Folder** (or Open).
7. **AlgoLens is now active!** Click the puzzle icon in your Chrome toolbar, pin AlgoLens, and open the popup interface.

---

## 🔒 Step 3: Persistent Extension ID (Keep Settings & Streaks across Reloads)

Normally, when you reload or update an unpacked extension, Chrome changes its **Extension ID**. 
- Because storage is sandboxed under the Extension ID, **any ID change instantly wipes your GitHub Personal Access Token (PAT) and solving streaks**.
- **The Solution**: We define a `"key"` in `manifest.json`. The ID is mathematically derived from this key. If the key is fixed, the ID never changes!

### Does sharing the Extension ID share Personal Access Tokens (PATs)?
> [!IMPORTANT]
> **No!**
> While everyone sharing your build will have the same Extension ID, Chrome's local storage (`chrome.storage.local`) is **entirely isolated on each individual computer**. 
> User A's browser cannot access User B's local storage. Sharing the Extension ID only ensures that when a user updates their extension, they do not lose *their own* locally stored PATs and streaks.

### How to Lock Your Extension ID
We have included a utility script that automatically generates a unique public/private key pair and outputs the code for you:

1. Navigate to the `/extension` folder in your terminal:
   ```bash
   cd extension
   ```
2. Run the key generator:
   ```bash
   node generate-key.js
   ```
   *This saves a `private_key.pem` file in your directory and prints a long string of letters.*
3. Open `extension/public/manifest.json` in a code editor.
4. Insert the generated `"key"` field near the top of the file:
   ```json
   {
     "manifest_version": 3,
     "name": "AlgoLens",
     "key": "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQ...",
     "version": "0.1.0",
     ...
   }
   ```
5. Run `npm run build` again and reload the extension in Chrome. Your Extension ID is now locked permanently!

---

## 🤗 Step 4: Deploying Backend to Hugging Face Spaces (Free 24/7 Hosting)

Hugging Face Spaces allows you to run Docker containers completely for free. We will use this to host your telemetry API.

### 1. Create a Space on Hugging Face
1. Sign up or log in at [huggingface.co](https://huggingface.co/).
2. Click your profile icon in the top-right and select **New Space**.
3. Fill out the creation form:
   - **Space Name**: `algolens-telemetry`
   - **License**: `mit`
   - **Space SDK**: Select **Docker**.
   - **Docker Template**: Select **Blank** (do not select templates like Gradio).
   - **Space Visibility**: Public (so the Chrome extension can reach it).
4. Click **Create Space**.

### 2. Link and Push the Code
Hugging Face Spaces are simply Git repositories.
1. On your newly created Space page, click the **Files and versions** tab, then click **Clone repository** (top-right) to copy the Git commands.
2. In your terminal, you can add your Space as a remote, or directly clone it elsewhere and copy the `backend/` files into it.
3. If you copy files to the Space repository, ensure the `Dockerfile` and `requirements.txt` are at the **root** of the Space repository (not inside a subfolder, as Hugging Face builds from the repository root).
4. Commit and push:
   ```bash
   git add .
   git commit -m "deploy: initial telemetry backend"
   git push origin main
   ```
5. Hugging Face will automatically detect the Dockerfile, build the image, and boot the server.

### 3. Add Environment Variables
1. On your Hugging Face Space page, navigate to the **Settings** tab.
2. Scroll down to the **Variables and secrets** section.
3. Click **New secret** and add your database link:
   - **Name**: `DATABASE_URL`
   - **Value**: Your NeonDB PostgreSQL connection string (prefixed with `postgresql+asyncpg://`).
4. Click **New variable** and add your CORS whitelist:
   - **Name**: `CORS_ORIGINS`
   - **Value**: `*` (or your Chrome Extension ID: `chrome-extension://<your-locked-id>`).

### 4. Keep the Space Awake 24/7 (Prevent Sleeping)
Free Hugging Face Spaces go to sleep after 48 hours of inactivity.
1. Create a free account on [cron-job.org](https://cron-job.org/) or [UptimeRobot](https://uptimerobot.com/).
2. Create a new cron job that pings your Space's public URL:
   `https://<your-username>-algolens-telemetry.hf.space/docs`
3. Set the schedule to run **every 30 minutes**. This regular traffic will keep the Space active indefinitely.

---

## 📦 Step 5: How to Distribute Your Extension on GitHub Releases

Since publishing to the official Chrome Web Store costs $5, you can distribute zip packages to your users via GitHub.

### 1. Configure the Production URL
1. Open the file `extension/.env` in your editor.
2. Set the `VITE_BACKEND_URL` to point to your live Hugging Face Space:
   ```env
   VITE_BACKEND_URL=https://<your-username>-algolens-telemetry.hf.space
   ```
3. Compile the production code:
   ```bash
   cd extension
   npm run build
   ```

### 2. Zip the Compiled Folder
1. Locate the `/extension/dist` folder.
2. Compress/Zip the `/dist` folder on your computer. Rename the zip file to `algolens-extension.zip`.

### 3. Publish the Release on GitHub
1. Go to your repository on [github.com](https://github.com/).
2. On the right side of the homepage, locate the **Releases** section and click **Draft a new release** (or click tags -> Releases).
3. Choose a version tag (e.g., `v1.0.0`).
4. Write a release title (e.g., `AlgoLens v1.0.0 - Stable Release`).
5. In the description, outline features and instructions.
6. Scroll down to the **Attach binaries** box (it says "Drag and drop binary files here").
7. Drag and drop your `algolens-extension.zip` file into this box.
8. Click **Publish release**.

### How Users Install and Update Your Extension
Provide these instructions to your users:
- **First Time Installation**:
  1. Download the `algolens-extension.zip` from the latest GitHub Release.
  2. Extract the zip file to a folder on your computer.
  3. Open Chrome, go to `chrome://extensions/`, enable Developer Mode, and click **Load unpacked**.
  4. Select the extracted folder.
- **Updating the Extension**:
  1. Download the new version zip from the latest release.
  2. Extract it and **overwrite** the files in your existing extension folder.
  3. Go to `chrome://extensions/` and click the **circular refresh arrow** on the AlgoLens card. Chrome will load the new code instantly without losing any logins, PATs, or streak history!

---

## 🌐 Local Development & SQLite Testing

If you want to run the backend on your own computer without connecting to a cloud database:

### 1. Start the API Server (SQLite Fallback)
1. Navigate to `/backend` in your terminal:
   ```bash
   cd backend
   ```
2. Activate the python virtual environment:
   - **Windows**: `.venv\Scripts\activate`
   - **macOS / Linux**: `source .venv/bin/activate`
3. Run the development server:
   ```bash
   uvicorn app.main:app --reload
   ```
4. The server will run at `http://127.0.0.1:8000` and automatically create a local `algolens.db` file.

### 2. Build the Extension for Local Testing
1. Navigate to `/extension` in your terminal.
2. Build in developer mode:
   ```bash
   npm run build:dev
   ```
   *(This builds Vite referencing your localhost backend database).*
3. Load the `/extension/dist` folder into Chrome.
