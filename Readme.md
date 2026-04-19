# Info Screens

The authors of this project are:
1. Anna Silvia Seemel
2. Kenneth Ottas
3. Kristel Kalda
4. Laura Teemägi

## Overview

Info Screens is a real-time race management system built with Node.js, Express, and Socket.IO, providing multiple synchronized interfaces for managing and displaying race sessions, including:

- Front Desk (session setup)
- Race Control (race operations)
- Lap Line Tracker (lap recording)
- Public display screens (leaderboard, next race, flags, countdown)

All screens stay in sync in real time via WebSockets.

---

## Features

* Real-time updates across all screens (Socket.IO)
* Role-based authentication system
* Session and driver management
* Live leaderboard with fastest lap tracking
* Dynamic race flag system
* Multi-screen synchronization

---

## Tech Stack

- Node.js
- Express
- Socket.IO
- HTML / CSS / JavaScript
- dotenv (environment variables)
- Windows users must use `cross-env` for development mode

---

## Core state and events

### The shared server state all clients sync from:
`state = {`
  `sessions: [],`
  `currentSession,`
  `nextSession,`
  `raceMode,`
  `raceStarted,`
  `raceEnded,`
  `timer,`
  `lastFinishedSession`
`}`

### And the Socket events that form the backbone of the program:

* Client → Server
`createSession`
`deleteSession`
`addDriver`
`removeDriver`
`startRace`
`recordLap`
`setFlag`
`finishRace`
`endSession`

* Server → Client
`sessionsUpdated`
`stateUpdated`
`raceStarted`
`leaderboardUpdated`
`flagChanged`
`timerUpdated`
`raceFinished`
`authResult`

---

## Authentication

The app uses simple role-based access keys to protect each interface.

### Roles

- Front Desk → `RECEPTIONIST_KEY`
- Race Control → `SAFETY_KEY`
- Lap Line Tracker → `OBSERVER_KEY`

The keys are defined in a `.env` file (not committed to the repository).

---

### How Authentication Works

1. User sees an authentication screen  
2. Enters access key  
3. Frontend sends key to server: `socket.emit("verifyKey", { role, key })`
4. Server validates and responds: (≈500ms delay): `socket.emit("authResult", { success })`
5. If valid → access granted  
   If invalid → error shown  

---

## Behavior

- Server will not start if keys are missing in `.env`
- Each page only accepts its own role key
- Socket event listeners are enabled only after successful authentication
- UI remains locked until login is successful

---

## Interfaces & Responsibilities

### Front Desk
Create and manage race sessions
Add / remove drivers
Automatic car number assignment

### Race Control
Start race
Control race modes (Safe, Hazard, Danger, Finish)
End session

### Lap Line Tracker
Record laps per driver
Updates leaderboard in real time
Public Displays

### These screens do not require authentication and show live race data:

* Leaderboard – live standings, lap count, fastest lap
* Next Race – upcoming session and drivers
* Race Countdown – remaining race time
* Race Flags – current race flag (visual display)

---

## Race Flow

* Front Desk creates sessions and adds drivers
* Race Control starts the race
* Timer starts and race enters SAFE mode
* Lap Line Tracker records laps
* Leaderboard updates in real time
* Race Control changes flags (Safe / Hazard / Danger / Finish)
* Race ends (Finish)
* Session is ended → next session becomes active

---

## QUICK START - Local Setup 

### 1. Install dependencies
```
npm install
```

### 2. Create `.env` file

In the project root (`info-screens`), create a `.env` file:
```
RECEPTIONIST_KEY=yourkey
SAFETY_KEY=yourkey
OBSERVER_KEY=yourkey
```

### 3. Running the Server (A development vs B production)

#### A Development mode (short timer - 60 seconds)
Run:
```
npm run dev
```
Open http://localhost:3000/front-desk


**NB! Windows users (dev mode)**
1. Install:
```
npm install cross-env --save --dev
```
2. Update `package.json` and replace `"dev": "NODE_ENV=dev node server.js"` with `"dev": "cross-env NODE_ENV=dev node server.js"`
3. Run:
```
npm run dev

```

#### B Production mode (full timer - 600 seconds)
```
npm start
```
or
```
node server.js
```
Open http://localhost:3000/front-desk

---

## Server Access

The server uses dynamic port configuration:
`const PORT = process.env.PORT || 3000;`

- Local: `http://localhost:3000`
- Production: Uses platform-assigned port

---

## Deployment
The app is deployed on Railway. All clients connect to the same server instance → shared real-time state

**Live app:** https://info-screens-production.up.railway.app/front-desk

## Live app key issue:

As you can not access the deployed version's employee screens w/o correct keys, these will be shared with you below. 
Disclaimer: We are aware that it is not standard practice to provide active security keys via a readme file, but since this is a school project and to save you, the reviewer, and us from extra friction, the very secure security keys are here:
```
RECEPTIONIST_KEY=autod
SAFETY_KEY=start
OBSERVER_KEY=ringid
```

---

## Application Routes

### Protected Interfaces

- Front Desk → `/front-desk`
- Race Control → `/race-control`
- Lap Line Tracker → `/lap-line-tracker`

### Public Displays

- Leaderboard → `/leaderboard`
- Next Race → `/next-race`
- Countdown → `/race-countdown`
- Flags Display → `/race-flags`

---

## Constants

Defined in `constants.js` and shared with clients:

- `MAX_DRIVERS`
- `MAX_NAME_LENGTH`
- `RACE_MODES` (SAFE, HAZARD, DANGER, FINISH)
- `TIMER` (DEV / PROD)

Sent to clients via: `socket.emit("initConstants", {...})`

---

## Limits

- Maximum 8 drivers per session
- Driver names limited to 20 characters

---

## Timer

- Development: 60 seconds  
- Production: 600 seconds  

---