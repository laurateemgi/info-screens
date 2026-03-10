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
  res.send('<h1>info-screens TBD</h1>');
});

server.listen(3000, () => {
  console.log("Server running on port 3000");
});


// 1.1 immutable shared server state
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
// 1.1 ja selleni peaks graafiku kohaselt jõudma ülehomme (vb homme, sest homme tundub lihtsam ja te muidu ei saa töötada)


// 1.1 socket.io ühendus
io.on("connection", (socket) => {
  console.log("Client connected");

  socket.emit("stateUpdated", state);

  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});

// 1.1 all-in-all, teha on ülipalju, aga thank god, et tööjaotused on bite-sized
