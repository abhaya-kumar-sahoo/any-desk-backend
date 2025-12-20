const { Server } = require("socket.io");
const http = require("http");

const server = http.createServer();
const io = new Server(server, {
    cors: {
        origin: "*",
    },
});

const sessions = new Map(); // Store active host sessions: code -> socketId

io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    // Host registers a session
    socket.on("register-host", (code) => {
        if (sessions.has(code)) {
            socket.emit("error", "Access code already in use.");
            return;
        }
        sessions.set(code, socket.id);
        socket.join(code);
        console.log(`Host registered with code: ${code}`);
    });

    // Client joins a session
    socket.on("join-session", (code) => {
        if (!sessions.has(code)) {
            socket.emit("error", "Invalid access code.");
            return;
        }
        socket.join(code);
        socket.to(code).emit("client-connected");
        console.log(`Client joined session: ${code}`);
    });

    // Relay screen data
    socket.on("screen-data", (data) => {
        // data: { code, frame }
        socket.to(data.code).emit("screen-frame", data.frame);
    });

    // Relay input events
    socket.on("input-event", (data) => {
        // data: { code, type, x, y, key, etc }
        socket.to(data.code).emit("remote-input", data);
    });

    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
        // Cleanup sessions if host disconnects
        for (const [code, id] of sessions.entries()) {
            if (id === socket.id) {
                sessions.delete(code);
                io.to(code).emit("host-disconnected");
                console.log(`Session ${code} closed due to host disconnect.`);
            }
        }
    });
});

const PORT = 1000;
server.listen(PORT, () => {
    console.log(`Signaling server running on port ${PORT}`);
});
