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