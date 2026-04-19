////////////
// CONFIG //
////////////

require("dotenv").config(); // Dotenv feature follows (enfoces the existence of keys)

if (
  !process.env.RECEPTIONIST_KEY ||
  !process.env.SAFETY_KEY ||
  !process.env.OBSERVER_KEY
) {
  console.error("ERROR: Missing required access keys in .env");
  process.exit(1);
}

/////////////
// IMPORTS //
/////////////

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { MAX_DRIVERS, MAX_NAME_LENGTH, RACE_MODES, TIMER } = require("./constants");
const path = require("path");

//////////////////
// Server setup //
//////////////////

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;

///////////////////////////
// Middleware and routes //
///////////////////////////

app.use(express.static("public"));

app.get('/', (req, res) => {
  res.send('<h1>info-screens TBD</h1>'); // Unused landing page for Localhost 3000.
});

// Express routes below
app.get("/front-desk", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "front-desk.html"));
});

app.get("/lap-line-tracker", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "lap-line-tracker.html"));
});

app.get("/leaderboard", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "leaderboard.html"));
});

app.get("/next-race", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "next-race.html"));
});

app.get("/race-control", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "race-control.html"));
});

app.get("/race-countdown", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "race-countdown.html"));
});

app.get("/race-flags", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "race-flags.html"));
});

server.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});

////////////////////////////////
// Global state & global vars //
////////////////////////////////

const state = {
  sessions: [],
  currentSession: null,
  nextSession: null,
  raceMode: RACE_MODES.DANGER,
  raceStarted: false,
  raceEnded: false,
  timer: 0,
  laps: {},
  lastFinishedSession: null
};

function broadcastState() {
  io.emit("stateUpdated", state);
}


let sessionCounter = 1 // Start session counting from 1 so we ensure every session has a unique ID
let timerInterval = null; // Prevents non-stopping timer

//////////////////////////////////
// Socket connection and events //
//////////////////////////////////

io.on("connection", (socket) => {
  console.log("Client connected");

  socket.isAuthorized = false; //Authentication
  socket.role = null; //will be receptionist, safety or observer (separation of responsibilites so any role could not do anything on other pages)

  socket.emit("stateUpdated", state);

  socket.on("requestState", () => { //Make sure server doesn't send stateUpdated too early
    socket.emit("stateUpdated", state);
  });

  socket.on("requestSessions", () => {
    socket.emit("sessionsUpdated", state.sessions);
  });

  socket.on("requestLeaderboard", () => {
    socket.emit("leaderboardUpdated", state.laps);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });

  socket.on('error', (err) => {
    console.error(`Socket error from ${socket.id}:`, err);
  });


  socket.on("verifyKey", ({ role, key }) => {

    const roleKeys = {
      receptionist: process.env.RECEPTIONIST_KEY,
      safety: process.env.SAFETY_KEY,
      observer: process.env.OBSERVER_KEY
    };

    setTimeout(() => {
      const success = key === roleKeys[role];

      if (success) { //Successful login stores auth on that socket
        socket.isAuthorized = true;
        socket.role = role;

        socket.emit("authResult", { success: true });

        socket.emit("initConstants", {
          MAX_DRIVERS,
          MAX_NAME_LENGTH,
          RACE_MODES,
          TIMER
        });

        socket.emit("sessionsUpdated", state.sessions);
        socket.emit("stateUpdated", state);

      } else {
        socket.isAuthorized = false;
        socket.role = null;
        socket.emit("authResult", { success: false });
      }
    }, 500);

  });

  socket.on("createSession", () => {   //1.2 session ID creation (unique IDs)
    if (!socket.isAuthorized || socket.role !== "receptionist") return; //Authentication

    console.log("createSession event received");
    const session = {
      id: "session-" + sessionCounter,
      drivers: []

    };

    sessionCounter++;

    state.sessions.push(session);
    state.nextSession = state.sessions[0] || null;

    io.emit("sessionsUpdated", state.sessions);
    io.emit("stateUpdated", state); // Lisatud, et sessioni loomisel saaks kohe race controlis näidata, et session on loodud, mitte alles siis, kui sessioni valitakse current sessioniks.

  });

  socket.on("deleteSession", (sessionId) => {
    if (!socket.isAuthorized || socket.role !== "receptionist") return; //auth
    
    state.sessions = state.sessions.filter(s => s.id !== sessionId);
    state.nextSession = state.sessions[0] || null;

    io.emit("sessionsUpdated", state.sessions);
    io.emit("stateUpdated", state); // Lisatud, et sessioni kustutamisel saaks kohe race controlis näidata, et session on kustutatud, mitte alles siis, kui sessioni valitakse current sessioniks.

  });

  socket.on("addDriver", ({ sessionId, driverName }) => {
    if (!socket.isAuthorized || socket.role !== "receptionist") return;

    const session = state.sessions.find(s => s.id === sessionId);
    if (!session) {
      if (state.currentSession && state.currentSession.id === sessionId) {
        socket.emit("errorMessage", {
          sessionId,
          message: "Cannot add drivers to the active session during a race"
        });
      }
      return;
    }

    driverName = driverName.trim();

    if (!driverName) {
      socket.emit("errorMessage", {
        sessionId,
        message: "Driver name cannot be empty"
      });
      return;
    }

    if (driverName.length > MAX_NAME_LENGTH) {
      socket.emit("errorMessage", {
        sessionId,
        message: `Driver name must be ${MAX_NAME_LENGTH} characters or less`
      });
      return;
    }

    // Max 8 drivers
    if (session.drivers.length >= MAX_DRIVERS) {
      socket.emit("errorMessage", {
        sessionId,
        message: `Session is full - max ${MAX_DRIVERS} drivers`
      });
      return;
    }

    // Prevent duplicate driver names
    const normalizedName = driverName.toLowerCase();

    const nameExists = session.drivers.some(d => d.name.trim().toLowerCase() === normalizedName);

    if (nameExists) {
      socket.emit("errorMessage", {
        sessionId,
        message: "Driver name already exists in this session"
      });
      return;
    }

    // Find free car number
    const carNumber = getAvailableCarNumber(session.drivers);
    if (!carNumber) return;

    session.drivers.push({
      name: driverName,
      carNumber
    });

    io.emit("sessionsUpdated", state.sessions);
    io.emit("stateUpdated", state);
  });


  socket.on("removeDriver", ({ sessionId, driverName }) => {
    if (!socket.isAuthorized || socket.role !== "receptionist") return;

    const session = state.sessions.find(s => s.id === sessionId);
    if (!session) {
      if (state.currentSession && state.currentSession.id === sessionId) {
        socket.emit("errorMessage", {
          sessionId,
          message: "Cannot remove drivers from the active session during a race"
        });
      }
      return;
    }

    session.drivers = session.drivers.filter(d => d.name !== driverName);
    io.emit("sessionsUpdated", state.sessions);
    io.emit("stateUpdated", state);
  });

  socket.on("startRace", () => {
    if (!socket.isAuthorized || socket.role !== "safety") return;
    if (state.raceStarted) return; // Disallows starting multiple races at the same time.
    if (!state.sessions.length) {
      socket.emit("errorMessage", {
        message: "Cannot start race: no queued session available"
      });
      return;
    }

    const nextSession = state.sessions[0];             //Disallows starting races w/o drivers
    if (!nextSession || nextSession.drivers.length === 0) {
      socket.emit("errorMessage", {
        message: "Cannot start race without drivers in the next session"
      });
      return;
    }

    state.currentSession = state.sessions.shift();
    state.nextSession = state.sessions[0] || null;
    state.raceStarted = true;
    state.raceEnded = false;
    state.raceMode = RACE_MODES.SAFE;

    setupLapTracking();
    io.emit("leaderboardUpdated", state.laps);
    startTimer();

    io.emit("raceStarted", state);
    io.emit("flagChanged", state.raceMode);
    io.emit("sessionsUpdated", state.sessions);
    io.emit("stateUpdated", state);
  });


  socket.on("editDriver", ({ sessionId, oldName, newName }) => {
    if (!socket.isAuthorized || socket.role !== "receptionist") return;

    const session = state.sessions.find(s => s.id === sessionId);
    if (!session) {
      if (state.currentSession && state.currentSession.id === sessionId) {
        socket.emit("errorMessage", {
          sessionId,
          message: "Cannot edit drivers in the active session during a race"
        });
      }
      return;
    }

    const driver = session.drivers.find(d => d.name === oldName);
    if (!driver) {
      socket.emit("errorMessage", {
        sessionId,
        message: "Driver not found"
      });
      return;
    }

    const trimmedName = newName.trim();

    if (!trimmedName) {
      socket.emit("errorMessage", {
        sessionId,
        message: "Driver name cannot be empty"
      });
      return;
    }

    if (trimmedName.length > MAX_NAME_LENGTH) {
      socket.emit("errorMessage", {
        sessionId,
        message: `Driver name must be ${MAX_NAME_LENGTH} characters or less`
      });
      return;
    }

    const normalizedName = trimmedName.toLowerCase();

    const nameExists = session.drivers.some(
      d => d.name.trim().toLowerCase() === normalizedName && d.name !== oldName
    );

    if (nameExists) {
      socket.emit("errorMessage", {
        sessionId,
        message: "Driver name already exists in this session"
      });
      return;
    }

    driver.name = trimmedName;

    io.emit("sessionsUpdated", state.sessions);
    io.emit("stateUpdated", state);
  });


  socket.on("setFlag", (mode) => {

    if (!socket.isAuthorized || socket.role !== "safety") return;

    if (!state.raceStarted) return; // No switching flags when no ongoing race.
    if (state.raceEnded) return; // Kui race on lõpetatud (finishRace() käivitatud), siis lukustame race mode'i täielikult

    if (!mode || typeof mode !== "string") return;
    const newMode = mode.toUpperCase();                          //Allows use of valid modes.
    if (!Object.values(RACE_MODES).includes(newMode)) return;
    state.raceMode = newMode;

    io.emit("flagChanged", state.raceMode); // Update all screens
    io.emit("stateUpdated", state);
  });


  socket.on("recordLap", (carNumber) => {
    if (!socket.isAuthorized || socket.role !== "observer") return;
    if (!state.raceStarted) return;

    const lapData = state.laps[carNumber];
    if (!lapData) return;

    const now = Date.now();

    if (lapData.lastLap === null) {
      lapData.lastLap = now;
      return;
    }

    const lapTime = now - lapData.lastLap;
    lapData.lap++;

    if (!lapData.fastest || lapTime < lapData.fastest) {
      lapData.fastest = lapTime;
    }

    lapData.lastLap = now;
    io.emit("leaderboardUpdated", state.laps);

  });

  socket.on("finishRace", () => {
    if (!socket.isAuthorized || socket.role !== "safety") return;
    finishRace()
  });

  socket.on("endSession", () => {
    if (!socket.isAuthorized || socket.role !== "safety") return;

    // End Session on lubatud ainult pärast FINISH'i
    if (!state.currentSession && !state.sessions.length) return; //Lubab sessionit lõpetada ilma race'ita ning erakorraliselt enne race'i lõppu.

    if (state.currentSession) {
      state.lastFinishedSession = {
        id: state.currentSession.id, // Salvestab session ID
        drivers: state.currentSession.drivers.map(driver => ({ // Kopeerib sõitjate info
          name: driver.name,
          carNumber: driver.carNumber
        })),
        laps: {} // Tühi objekt, kuhu eelmise sõidu info panna
      };

      // Copy lap data
      for (const carNumber in state.laps) {
        state.lastFinishedSession.laps[carNumber] = {
          driverName: state.laps[carNumber].driverName,
          lap: state.laps[carNumber].lap,
          fastest: state.laps[carNumber].fastest,
          lastLap: state.laps[carNumber].lastLap
        };
      }

      state.currentSession = null;
    }
    else if (state.sessions.length) { // Kui session algas, aga race'i ei alustatud ja tahetakse session lõpetada. Tehniline error vms.
      state.lastFinishedSession = state.sessions.shift();
    }

    state.nextSession = state.sessions[0] || null;
    state.raceStarted = false;
    state.raceEnded = false;
    state.raceMode = RACE_MODES.DANGER;
    state.timer = 0;
    state.laps = {};

    io.emit("sessionEnded", state);
    io.emit("flagChanged", state.raceMode);
    io.emit("sessionsUpdated", state.sessions);
    io.emit("stateUpdated", state);
  });

});


//////////////////////
// Helper functions //
//////////////////////


function getAvailableCarNumber(drivers) { // Check for car numbers (must be consecutive even when some drivers are deleted)

  for (let i = 1; i <= MAX_DRIVERS; i++) { // There can be 8 drivers max
    const taken = drivers.some(d => d.carNumber === i);
    if (!taken) {
      return i;
    }
  }
  return null;
}

function startTimer() {
  const raceLength =
    process.env.NODE_ENV === "dev"
      ? TIMER.DEV
      : TIMER.PROD;

  state.timer = raceLength;

  timerInterval = setInterval(() => {
    state.timer--;

    io.emit("timerUpdated", state.timer);
    if (state.timer <= 0) { finishRace(); }
  }, 1000);
}

function finishRace() {
  if (state.raceEnded) return;

  clearInterval(timerInterval);
  timerInterval = null; // Resets timer interval

  state.raceMode = RACE_MODES.FINISH;
  state.raceEnded = true;

  io.emit("raceFinished", state);
  io.emit("flagChanged", state.raceMode);
  io.emit("stateUpdated", state);
}

function setupLapTracking() {
  state.laps = {};
  state.currentSession.drivers.forEach(driver => {
    state.laps[driver.carNumber] = {
      driverName: driver.name,
      lap: 0,
      fastest: null,
      lastLap: null
    };
  });
}