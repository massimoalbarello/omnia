const WebSocket = require('ws');

Servient = require("@node-wot/core").Servient;
HttpClientFactory = require("@node-wot/binding-http").HttpClientFactory;
Helpers = require("@node-wot/core").Helpers;

// create Servient and add HTTP binding
let servient = new Servient();
servient.addClientFactory(new HttpClientFactory(null));
let wotHelper = new Helpers(servient);

const wss = new WebSocket.Server({ port: 6969 });

// things that advertised their presence with BLE
const nearbyThings = {
    "10.4.23.47": {
        ipAddress: "10.4.23.47",
        port: 8081,
        thing: "pointer",
    },
    "10.4.23.65": {
        ipAddress: "10.4.23.65",
        port: 8082,
        thing: "keyboard",
    },
    "10.4.23.83": {
        ipAddress: "10.4.23.83",
        port: 8083,
        thing: "display",
    }
}

// map to store a client's metadata
const clients = new Map();

var currentOutputThing;


// after having chosen which things to connect to
setTimeout(async () => {
    const pointerTD = await wotHelper.fetch("http://localhost:8081/pointer/")
    const pointerWoT = await servient.start();
    const pointer = await pointerWoT.consume(pointerTD);
    // tell thing the web socket it has to use to communicate its data
    pointer.invokeAction("wsAddress", "ws://localhost:6969");
}, 10000);

setTimeout(async () => {
    const keyboardTD = await wotHelper.fetch("http://localhost:8082/keyboard/")
    const keyboardWoT = await servient.start();
    const keyboard = await keyboardWoT.consume(keyboardTD);
    // tell thing the web socket it has to use to communicate its data
    keyboard.invokeAction("wsAddress", "ws://localhost:6969");
}, 20000);

// to be removed once things have their own ip
var tmp = ["10.4.23.47"];
var keyboardConnected = false;
///////////////////////////////////////////////

// !!!!!!!!!!!!!!!! start "getMouseCoordinate" first and then "moveMouseExtension" on browser !!!!!!!!!!!!!!!!
wss.on('connection', (ws, req) => {

    // to be added once things have their own ip
    // const clientIp = req.socket.remoteAddress;
    /////////////////////////////////////////////

    // to be removed once things have their own ip
    const clientIp = tmp[tmp.length - 1];
    tmp.pop();
    if (keyboardConnected) {
        tmp.push("10.4.23.83");
    }
    else {
        tmp.push("10.4.23.65");
        keyboardConnected = true;
    }
    ///////////////////////////////////////////////

    if (nearbyThings[clientIp].thing === "display") {
        clients.set(ws, nearbyThings[clientIp]);
        currentOutputThing = {
            ws: ws,
        }
    }
    clients.set(ws, nearbyThings[clientIp]);
    log("Connected to: " + nearbyThings[clientIp].thing, "@");

    ws.on('message', (messageAsString) => {
        const message = JSON.parse(messageAsString);
        // log(message, "m");
        if (currentOutputThing) {
            const event = {
                data: message,
                metadata: clients.get(ws)
            }
            currentOutputThing.ws.send(JSON.stringify(event));
        }
        else {
            // log("No output thing found.", "!")
        }
    });

    ws.on("close", () => {
        const metadata = clients.get(ws);
        log("Closed connection with: " + metadata.thing, "!");
        clients.delete(ws);
    });
});

function log(value, separator) {
    console.log("\n" + separator.repeat(20))
    console.log(value)
    console.log(separator.repeat(20) + "\n")
}
