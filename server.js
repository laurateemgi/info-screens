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
});

// 1.2.1 panen üleüldise eventide asetuse paika (hetkel kommentaaridena, sest evendid poolikud & muidu ei saa localhost asju testida ja viskab nodes errorisse)

//socket.on("verifyKey", () => {});

//socket.on("createSession", () => {});

//socket.on("deleteSession", () => {});

//socket.on("addDriver", () => {});

//socket.on("removeDriver", () => {});

//1.2.1 hiljemalt siia peaks timeri tegema, sest race'il seda ju vaja

//socket.on("startRace", () => {});

//socket.on("setFlag", () => {});

//socket.on("recordLap", () => {});

//socket.on("finishRace", () => {});

//socket.on("endSession", () => {});
// 1.2.1 
