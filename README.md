# Juggling Flashcards (Windows)

A lightweight React + Vite desktop-friendly web app to create and practice juggling moves in flashcard mode. Data is stored locally in your browser using IndexedDB (Dexie). Works offline.

Features:
- Add moves with name, description, number of balls (3/4/5), tags, related moves, tutorial link
- Search and edit moves
- Practice mode with per-card timer, selection by ball count, and subset selection

## Getting started

1. Install Node.js 18+.
2. Install dependencies:

```powershell
npm install
```

3. Start dev server:

```powershell
npm run dev
```

4. Open the printed localhost URL. Add some moves in Manage, then return to Practice.

## Packaging for Windows
This app is a web app. For a single-click Windows desktop app experience, you can wrap it with Electron or Tauri later. For now, use it in the browser or as a PWA.
