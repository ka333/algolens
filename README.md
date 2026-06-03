# AlgoLens 🚀

AlgoLens is a privacy-first browser extension designed for LeetCode enthusiasts. It automatically tracks your solving metrics (time spent, attempts, difficulty levels), syncs your clean solution code to a dedicated GitHub repository, and generates beautiful, dynamic analytics cards to showcase on your GitHub profile.

---

## ✨ Key Features

- **🔄 Instant GitHub Sync**: Automatically pushes your accepted LeetCode solutions directly to your configured GitHub repository in real-time.
- **⏱️ Smart Focus Timer**: Tracks the active time you spend solving a problem. It automatically pauses if you switch tabs or leave your keyboard, ensuring precise telemetry.
- **📊 Dynamic Profile Cards**: Generates elegant, real-time SVG statistics cards and streak counters to display on your GitHub profile README.
- **🔒 Privacy-First Design**: Your GitHub Personal Access Token (PAT) is stored securely in your browser's local sandboxed storage. It never leaves your machine and is never sent to our telemetry backend.
- **📈 Global Benchmarks**: Anonymously aggregates solving speeds and attempt counts to compare your performance against global community benchmarks.

---

## 🔑 Setup & Usage Guide

### Step 1: Connect Your GitHub Account
To allow AlgoLens to sync solutions directly to your repository:
1. Go to **GitHub Settings -> Developer Settings -> Personal Access Tokens -> Tokens (classic)**.
2. Click **Generate new token (classic)**.
3. Provide a note (e.g., `AlgoLens Sync`) and select the **`repo`** scope checkbox. (This is required for the extension to push files to your repository).
4. Click **Generate token** and copy it securely.
5. Open the AlgoLens extension popup in your browser, navigate to the **GitHub Sync** tab, and paste your token.
6. Select your target repository and the subfolder name where you want solutions to be stored (e.g., `leetcode`).

### Step 2: Solve Problems
Once configured, simply solve LeetCode problems as you normally do. 
- The smart timer automatically begins tracking as soon as you open a problem.
- When you click **Submit** and get an `Accepted` status, AlgoLens captures your code, attempt count, and duration.
- Your code is instantly pushed to your GitHub repository, and anonymous statistics are updated.

### Step 3: Showcase Your Stats
You can embed your dynamic AlgoLens card on your GitHub profile README. In your solutions repository, AlgoLens automatically configures a README with the following structure:
```markdown
<!-- algolens:start -->
<!-- algolens:end -->
```
The metrics block and SVG benchmarking cards will automatically populate between these comments!

---

## 🛠️ Developer Setup & Deployment
If you want to run the telemetry backend locally, host it on your own server (e.g., Render, NeonDB), or compile the Chrome Extension from source, please refer to the [DEPLOYMENT_GUIDE.md](file:///c:/Users/Karthikeya%20Akhandam/Codes/algolens/DEPLOYMENT_GUIDE.md).
