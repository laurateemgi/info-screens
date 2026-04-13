# Info Screens README

## Authentication

The app uses simple role-based access keys to protect each interface.

### Roles
* Front Desk → RECEPTIONIST_KEY
* Race Control → SAFETY_KEY
* Lap Line Tracker → OBSERVER_KEY

The keys are defined in an .env file, but as the .env file is not uploaded to the repository due to it not being best practice, the instructions for creating the file can be found under #LOCAL Setup below.

### How authentication works
1. User sees an auth screen
2. Enters access key
3. Frontend sends the key to server:
``` 
socket.emit("verifyKey", { role, key })
``` 
Server checks key and responds (with ~500ms delay):
``` 
socket.emit("authResult", { success }) 
```
4. If valid → app unlocks, if invalid → error shown, user retries

## Behavior
* Server **won’t start** if keys are missing in `.env`
* Each page only accepts its **own role key**
* Socket **connection** starts **after authentication**
* UI is **blocked** until **login is successful**

## LOCAL Setup

# Install dependencies:

Enter in console: npm install

Then, create an empty .env file in the project root (info-screens), add the below three lines and add keys of your preference to corresponding lines replacing "yourkey":

RECEPTIONIST_KEY=yourkey
SAFETY_KEY=yourkey
OBSERVER_KEY=yourkey


## Running the server
Development mode (short 1:00 timer):
npm run dev

Production mode (full 10:00 timer):
npm start
or
node server.js

# Server runs on:

http://localhost:3000
OR
When deployed, it runs on the port specified by the platform.


## Roles

# Receptionist (front-desk)     http://localhost:3000/front-desk
Create/delete sessions
Add/remove drivers

# Safety (race-control)         http://localhost:3000/race-control
Start race
Change flags and race modes
End session


# Observer (lap-line-tracker):  http://localhost:3000/lap-line-tracker
Record laps

# Guest pages
## leaderboard                     http://localhost:3000/leaderboard
displays the leaderboard based on the fastest laps while also displaying the active flag
## next-race                       http://localhost:3000/next-race
displays the lineup of an upcoming race
## race-countdown                  http://localhost:3000/race-countdown
timer showcasing countdown until the race's end
## race-flags                      http://localhost:3000/race-flags
a full-screen display of the currently active flag

# Max 8 drivers per session
# Driver names max 20 characters

## Timer:

Dev: 60 seconds
Prod: 600 seconds