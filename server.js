require("dotenv").config(); // 1.1 järgneb dotenv feature, mis enfoce'ib key'de olemasolu, kuigi ei tea,
// 1.1 kas see järgnev panna peale const server = require socket.io-d või jääb siia ette. Imo siia ette, sest see check vb vaja esimesena teha.

if (
  !process.env.RECEPTIONIST_KEY ||
  !process.env.SAFETY_KEY ||
  !process.env.OBSERVER_KEY
) {
  console.error("ERROR: Missing required access keys in .env");
  process.exit(1);
}

// 1.1 copy-paste mix&match expressi + socketi kodukatelt, ehk siis serveri skeleton
const express = require("express");
const { stat } = require("fs");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

app.get('/', (req, res) => {
  res.send('<h1>info-screens TBD</h1>'); // 1.2.1 kommentaariks juurde, et see on lihtsalt localhost 3000 testimiseks. Html lehed praegu tühjad, aga laevad ära.
});

server.listen(3000, () => {
  console.log("Server running on port 3000");
});


let sessionCounter = 1 //1.2 start session counting from 1 so we ensure every session has a unique ID
// 1.1 immutable shared server state // 1.2.1 kas (ja kus) on vaja broadcastState()-i?
const state = {
  sessions: [],
  currentSession: null,
  nextSession: null,
  raceMode: "DANGER",
  raceStarted: false,
  raceEnded: false,
  timer: 0,
  laps: {},
  lastFinishedSession: null
};
// 1.1 npm start ja npn run dev on package.jsonis olemas, aga need sõltuvad actual timer funktsioonist

// 1.1 socket.io ühendus
io.on("connection", (socket) => {
  console.log("Client connected");

  socket.emit("stateUpdated", state);

  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
  // 1.2.1 leidsin selle socket event template'i otsides & võiks vajalik olla imo:
  socket.on('error', (err) => {
    console.error(`Socket error from ${socket.id}:`, err);
  });


// 1.2.1 panen üleüldise eventide asetuse paika (
// kui tahate localhosti testida, siis muutke allolev kommentaarideks, sest evendid poolikud & muidu ei saa localhost asju testida ja viskab nodes errorisse)

//1.2.2 verifyKey (also kõik evendid incl verifyKey peavad jääma ülaloleva io.on(connection) alla)
socket.on("verifyKey", ({role, key}) => {
  
  const roleKeys = {
    receptionist: process.env.RECEPTIONIST_KEY,
    safety: process.env.SAFETY_KEY,
    observer: process.env.OBSERVER_KEY
  };

  setTimeout(() => {
        const success = key === roleKeys[role];
        socket.emit("authResult", {success});
  }, 500);

});

//1.2.3 all poolikud evendid. conditionale veel juurde vaja.
socket.on("createSession", () => {   //1.2 session ID creation (unique IDs)
console.log("createSession event received");
  const session = {
    id: "session-" + sessionCounter,
    drivers: []
  
  };

  sessionCounter++;

  state.sessions.push(session);

  io.emit("sessionsUpdated", state.sessions);

});

socket.on("deleteSession", (sessionId) => {   //1.2.3

  state.sessions = state.sessions.filter(s => s.id !== sessionId);
  
  io.emit("sessionsUpdated", state.sessions);

});


//1.2 addDriver (max 8 drivers per session)
socket.on("addDriver", ({sessionId, driverName}) => {

  driverName = driverName.trim();
  if (driverName.length > 20) { //!!!!! 1.2 Hardcoded a limit
  socket.emit("errorMessage", "Driver name must be 20 characters or less");
  return;
}

  const session = state.sessions.find(s => s.id === sessionId);

  if (!session) return;

  // max 8 drivers
  if (session.drivers.length >= 8) {
    socket.emit("errorMessage", "Maximum 8 drivers allowed in a session");
    return;
  }

  // prevent duplicate driver names
  const nameExists = session.drivers.some(d => d.name === driverName);

  if (nameExists) {
    socket.emit("errorMessage", "Driver name already exists in this session");
    return;
  }

  // find free car number
  const carNumber = getAvailableCarNumber(session.drivers);
  if (!carNumber) return;

  session.drivers.push({
    name: driverName,
    carNumber
  });

  io.emit("sessionsUpdated", state.sessions);
});


socket.on("removeDriver", ({sessionId, driverName}) => { //1.2.3
  
  const session = state.sessions.find(s => s.id === sessionId);
  if (!session) return; //prevents server crashes if a bad request comes in

  session.drivers = session.drivers.filter(d => d.name !== driverName);

  io.emit("sessionsUpdated", state.sessions);
});

socket.on("startRace", () => { //1.2.3

  state.currentSession = state.sessions.shift();
  state.nextSession = state.sessions[0] || null;
  state.raceStarted = true;
  state.raceEnded = false;
  state.raceMode = "SAFE";

  setupLapTracking();
  startTimer();

  io.emit("raceStarted", state);
});

socket.on("setFlag", (mode) => { //1.2.3

  state.raceMode = mode;

  io.emit("flagChanged", mode);
});


socket.on("recordLap", (carNumber) => {//1.2.3

  const now = Date.now();

  if (!state.laps[carNumber]) {
    state.laps[carNumber] = {
      lap: 0,
      fastest: null,
      lastLap: now
    };
    return;
  }

  const lapData = state.laps[carNumber];
  const lapTime = now - lapData.lastLap;
  lapData.lap++;

  if (!lapData.fastest || lapTime < lapData.fastest) {
    lapData.fastest = lapTime;
  }

  lapData.lastLap = now;
  io.emit("leaderboardUpdated", state.laps);

});

socket.on("finishRace", () => {finishRace()}); //1.2.3

socket.on("endSession", () => {  //1.2.3

  state.lastFinishedSession = state.currentSession;
  state.currentSession = null;
  state.raceStarted = false;
  state.raceEnded = false;
  state.raceMode = "DANGER";
  state.timer = 0;
  state.laps = {};

  io.emit("stateUpdated", state);
});

// 1.2.1 
}); //1.2.2 tõstsin kõik evendid io.on(connection) alla

// 1.2.3 functionid s.t. timer jne peavad olema io.on(connection)-st eraldi
// 1.2.3 veel pole jõudnud functione teha


// 1.2 check for car numbers (must be consecutive even when some drivers are deleted)
function getAvailableCarNumber(drivers) {

  for (let i = 1; i <= 8; i++) { //there can be 8 drivers
    const taken = drivers.some(d => d.carNumber === i);
    if (!taken) {
      return i;
    }
  }
  return null;
}


function startTimer() {
  const raceLength =      //7.1
    process.env.NODE_ENV === "dev"
      ? 60 : 600;

    state.timer = raceLength;

    timerInterval = setInterval(() => {
      state.timer--;

      io.emit("timerUpdated", state.timer);
      if (state.timer <= 0)
      {finishRace();}
    }, 1000);
}

function finishRace() {
  clearInterval(timerInterval); //8.1
  state.raceMode = "FINISH";
  state.raceEnded = true;

  io.emit("raceFinished", state);
}

function setupLapTracking() {
  state.laps = {};  //8.1
  state.currentSession.drivers.forEach(driver => {
    state.laps[driver.carNumber] = {
      driverName: driver.name,
      lap: 0,
      fastest: null,
      lastLap: null
    };
  });
}