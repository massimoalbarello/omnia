const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 6969 });

const nearbyThings = {
    "10.4.23.47": {
        device: "pointer",
    },
    "10.4.23.83": {
        device: "display",
    }
}

// map to store a client's metadata
const clients = new Map();

var currentOutputDevice;

// to be removed once devices have their own ip
var tmp = ["10.4.23.83", "10.4.23.83", "10.4.23.47"];
///////////////////////////////////////////////

wss.on('connection', (ws, req) => {
    // const clientIp = req.socket.remoteAddress;
    // to be removed once devices have their own ip
    const clientIp = tmp[tmp.length - 1];
    tmp.pop();
    ///////////////////////////////////////////////
    if (nearbyThings[clientIp].device === "pointer") {
        console.log("Connected to pointer");
        clients.set(ws, nearbyThings[clientIp]);
    }
    else if (nearbyThings[clientIp].device === "display") {
        console.log("Connected to display");
        clients.set(ws, nearbyThings[clientIp]);
        currentOutputDevice = {
            ws: ws,
        }
    }
    ws.on('message', (messageAsString) => {
        const message = JSON.parse(messageAsString);
        console.log("Received message: ", message);
        if (message.device === "pointer") {
            if (currentOutputDevice) {
                const metadata = clients.get(ws);
                const data = {
                    message: message,
                    inputFrom: metadata.device, 
                }
                currentOutputDevice.ws.send(JSON.stringify(data));
            }
            else {
                console.log("No output device found.")
            }
        }
    });
    ws.on("close", () => {
        const metadata = clients.get(ws);
        console.log("Closed connection with:", metadata.device);
        clients.delete(ws);
    });
});