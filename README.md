# Aktyn Drone
Raspberry Pi to flight controller interface with p2p-based connectivity, web controls, and real-time camera stream preview

### Install dependencies
```
sudo apt install chromium-browser chromium-codecs-ffmpeg
npm install
```

### Run on Raspberry Pi
```
npm run start
```

### Open controller
- Copy `receiver.html`, `receiver.js`, `peerjs.min.js` and `jsmpeg.min.js` to a web server directory or to your computer's local filesystem
- Open `receiver.html` in a web browser
