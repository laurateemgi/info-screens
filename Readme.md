# Kuna ma ei pushinud node_modules folderit, siis peale pullimist: 
npm install
Dependencyd on kirjas ja automaatselt installib(peaks) vajaliku.

# Kui for whatever reason tahate ise nullist buildida ja dependence’id vaja on installida, siis

sudo apt install npm

npm install express socket.io dotenv


# Start cmd (hetkel ainus testimisviis) ((Node'is või alternatiivselt powershellis)): 

node server.js 

(kui sul pole Node projekti kaustas või ei saa pathi normilt kätte, sest wsl remote on retarded pathiga, siis võib ka info-screens folderis shift+paremklikk & open powershell window here ning command sinna).

# Seejärel browseris http://localhost:3000 või http://localhost:3000/front-desk.html etc etc.

# .env -s on key'd, mida pole hea tava git-i pushida.

#package-lock.json on autogen fail, mille kohta ma ei oska midagi öelda


# REAL README

## Authentication

The app uses simple role-based access keys to protect each interface.

### Roles
* Front Desk → RECEPTIONIST_KEY
* Race Control → SAFETY_KEY
* Lap Line Tracker → OBSERVER_KEY

Keys are defined in `.env`:

```
RECEPTIONIST_KEY=autod
SAFETY_KEY=start
OBSERVER_KEY=ringid
```

### How it works
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
