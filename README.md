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

## 🚀 Deployment & Local Testing

To configure and deploy the FastAPI backend (using NeonDB and Render), or to run local testing setups, please follow the dedicated instructions in [DEPLOYMENT_GUIDE.md](file:///c:/Users/Karthikeya%20Akhandam/Codes/algolens/DEPLOYMENT_GUIDE.md).
