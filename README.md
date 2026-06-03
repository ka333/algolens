# AlgoLens

AlgoLens is a privacy-first browser extension that tracks LeetCode solving activity, pushes clean solution code to a user's GitHub repository, compiles statistics, and generates dynamic metrics/streak cards for GitHub profile READMEs. It includes a Python FastAPI telemetry backend that anonymizes event logs to generate global analytics.

## Monorepo Layout

- `/extension`: The Google Chrome Extension built using Vite, React, and TypeScript.
- `/backend`: The Telemetry API & SVG rendering server built using Python, FastAPI, and NeonDB.
- `/local`: Local specifications and references (PRD, design notes).

## Features

1. **Auto GitHub Sync**: Commit and push accepted LeetCode solutions directly to your repository.
2. **Onboarding Setup**: User-friendly installation screen guiding you to configure your Personal Access Token (PAT) and custom commit message formats.
3. **Timer & Attempts Tracker**: Tracks focus time and wrong/TLE attempts per session (pauses on inactive tabs).
4. **Benchmarking & Telemetry**: Privacy-preserving submission logs that compare personal performance against global averages.
5. **Dynamic SVG Cards**: Embed live statistic cards, topic masteries, and streak trackers in your GitHub profile.
