const { io } = require('socket.io-client');
const { ipcRenderer } = require('electron');

const homeView = document.getElementById('home-view');
const hostView = document.getElementById('host-view');
const connectView = document.getElementById('connect-view');
const remoteView = document.getElementById('remote-view');

const hostBtn = document.getElementById('host-btn');
const connectBtn = document.getElementById('connect-btn');
const stopHostBtn = document.getElementById('stop-host-btn');
const backHomeBtn = document.getElementById('back-home-btn');
const startSessionBtn = document.getElementById('start-session-btn');
const disconnectBtn = document.getElementById('disconnect-btn');

const accessCodeDisplay = document.getElementById('access-code');
const remoteCodeInput = document.getElementById('remote-code');
const remoteCanvas = document.getElementById('remote-canvas');
const ctx = remoteCanvas.getContext('2d');

let socket;
let currentSessionCode;
let isHosting = false;
let captureInterval;
let screenStream;

function showView(view) {
    [homeView, hostView, connectView, remoteView].forEach(v => v.classList.add('hidden'));
    view.classList.remove('hidden');
}

function generateCode() {
    return Math.floor(100000 + Math.random() * 900000).toString().replace(/(\d{3})(\d{3})/, '$1 $2');
}

function initSocket() {
    if (socket) return socket;
    socket = io('https://any-desk-backend.onrender.com');

    socket.on('connect', () => console.log('Connected to signaling server'));

    socket.on('screen-frame', (frame) => {
        const img = new Image();
        img.onload = () => {
            remoteCanvas.width = img.width;
            remoteCanvas.height = img.height;
            ctx.drawImage(img, 0, 0);
        };
        img.src = frame;
    });

    socket.on('remote-input', (event) => {
        if (isHosting) {
            ipcRenderer.send('simulate-input', event);
        }
    });

    socket.on('error', (msg) => alert(msg));

    return socket;
}

// Host Screen Capture Implementation (Simplified in Renderer for ease of access to DOM/navigator)
async function startCapture(sourceId) {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
                mandatory: {
                    chromeMediaSource: 'desktop',
                    chromeMediaSourceId: sourceId,
                    minWidth: 1280,
                    maxWidth: 1920,
                    minHeight: 720,
                    maxHeight: 1080
                }
            }
        });

        screenStream = stream;
        const video = document.createElement('video');
        video.srcObject = stream;
        video.play();

        const canvas = document.createElement('canvas');
        const vCtx = canvas.getContext('2d');

        captureInterval = setInterval(() => {
            if (video.readyState === video.HAVE_ENOUGH_DATA) {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                vCtx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const frame = canvas.toDataURL('image/jpeg', 0.5);
                socket.emit('screen-data', { code: currentSessionCode, frame });
            }
        }, 66); // ~15 FPS
    } catch (e) {
        console.error(e);
    }
}

// HOST LOGIC
hostBtn.addEventListener('click', async () => {
    isHosting = true;
    const code = generateCode();
    currentSessionCode = code;
    accessCodeDisplay.innerText = code;
    showView(hostView);

    initSocket().emit('register-host', code);
    ipcRenderer.send('start-hosting', code);
});

ipcRenderer.on('host-started', (event, data) => {
    if (data.sources && data.sources.length > 0) {
        // Just take the first screen for now
        startCapture(data.sources[0].id);
    }
});

// CLIENT LOGIC
connectBtn.addEventListener('click', () => {
    showView(connectView);
});

startSessionBtn.addEventListener('click', () => {
    const code = remoteCodeInput.value.trim();
    if (!code) return;

    currentSessionCode = code;
    showView(remoteView);
    initSocket().emit('join-session', code);
});

// Event Listeners for UI
stopHostBtn.addEventListener('click', () => {
    isHosting = false;
    clearInterval(captureInterval);
    if (screenStream) screenStream.getTracks().forEach(t => t.stop());
    showView(homeView);
});

backHomeBtn.addEventListener('click', () => showView(homeView));

disconnectBtn.addEventListener('click', () => {
    if (socket) socket.disconnect();
    socket = null;
    showView(homeView);
});

// Capture Canvas Inputs for Remote Control
remoteCanvas.addEventListener('mousemove', (e) => {
    if (!currentSessionCode || isHosting || remoteView.classList.contains('hidden')) return;
    const rect = remoteCanvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (remoteCanvas.width / rect.width);
    const y = (e.clientY - rect.top) * (remoteCanvas.height / rect.height);

    socket.emit('input-event', {
        code: currentSessionCode,
        type: 'mousemove',
        x, y
    });
});

remoteCanvas.addEventListener('mousedown', (e) => {
    if (!currentSessionCode || isHosting || remoteView.classList.contains('hidden')) return;
    socket.emit('input-event', {
        code: currentSessionCode,
        type: 'mousedown',
        button: e.button === 0 ? 'left' : (e.button === 2 ? 'right' : 'middle')
    });
});

remoteCanvas.addEventListener('mouseup', (e) => {
    if (!currentSessionCode || isHosting || remoteView.classList.contains('hidden')) return;
    socket.emit('input-event', {
        code: currentSessionCode,
        type: 'mouseup',
        button: e.button === 0 ? 'left' : (e.button === 2 ? 'right' : 'middle')
    });
});

window.addEventListener('keydown', (e) => {
    if (!currentSessionCode || isHosting || remoteView.classList.contains('hidden')) return;
    socket.emit('input-event', {
        code: currentSessionCode,
        type: 'keydown',
        key: e.key.toLowerCase(),
        modifiers: [
            e.ctrlKey && 'control',
            e.shiftKey && 'shift',
            e.altKey && 'alt',
            e.metaKey && 'command'
        ].filter(Boolean)
    });
});
