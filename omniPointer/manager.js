const Servient = require("@node-wot/core").Servient;
const HttpClientFactory = require("@node-wot/binding-http").HttpClientFactory;
const Helpers = require("@node-wot/core").Helpers;
const WebSocket = require('ws');

// create Servient and add HTTP binding
let servient = new Servient();
servient.addClientFactory(new HttpClientFactory(null));
let wotHelper = new Helpers(servient);

// list of local urls received from router
var localURLs = ["http://localhost:8080/display", "http://localhost:8081/pointer", "http://localhost:8082/keyboard"];

var thingDescriptors = {};
var servients = {};
var things = {};
var appIsAvailable = false;
var availableApps = [];
var cpws;   // control panel web socket
var appStarted = false;

// list of available apps (localhost:2000)
const controlPanelWSS = new WebSocket.Server({ port: 2000 });

controlPanelWSS.on('connection', (ws, req) => {
    cpws = ws;
    cpws.send(JSON.stringify(availableApps));

    cpws.on('message', (message) => {
        if (!appStarted) {
            log(message.toString(), "$");
            appStarted = true;
            // devices used by the current app
            var display = things["http://localhost:8080/display"];
            var pointer = things["http://localhost:8081/pointer"];
            var keyboard = things["http://localhost:8082/keyboard"];
            startApp(display, pointer, keyboard);
        }
        else {
            log(message.toString(), ".");
            appStarted = false;
            // devices used by the current app
            var display = things["http://localhost:8080/display"];
            var pointer = things["http://localhost:8081/pointer"];
            var keyboard = things["http://localhost:8082/keyboard"];
            // tell all devices involved in the app to disconnect
            stopApp(display, pointer, keyboard);
            localURLs = ["http://localhost:8080/display", "http://localhost:8081/pointer", "http://localhost:8082/keyboard"];
        }
    });
});

const discoverDevicesInterval = setInterval(async () => {
    for (const index in localURLs) {
        const url = localURLs[index];
        try {
            thingDescriptors[url] = await wotHelper.fetch(url);
            servients[url] = await servient.start();
            things[url] = await servients[url].consume(thingDescriptors[url]);
            log("Connected to: " + url, "#");
            localURLs.splice(index, 1);

            [appIsAvailable, availableApps] = checkAppsAvailable();
            if (appIsAvailable) {
                localURLs = ["http://localhost:8083/stereo"];   // keep discovering for other devices, ex. stereo
                log(availableApps, "&");
                cpws.send(JSON.stringify(availableApps));
            };
        }
        catch {
            // log(url + ": not available.", "!");
        }
    }
    log(localURLs, "?");
}, 10000);

function checkAppsAvailable() {
    if (! localURLs.length) {   // check the requirements needed to start the app
        return [true, ["web computer", "get coordinates"]];
    }
    return [false, []];
}

async function startApp(display, pointer, keyboard) {

    log("Starting app!", "!");
    // once the manager knows which device is which (thanks to the TDs), set up the connections between the devices           
    const inputThings = {
        "http://localhost:8081/pointer": {
            ipAddress: "http://localhost:8081/pointer",
            thing: "pointer",
        },
        "http://localhost:8082/keyboard": {
            ipAddress: "http://localhost:8082/keyboard",
            thing: "keyboard",
        }
    }

    // get the WS where the output device listens for connectons and set the devices it will receive from
    const outWsAddress = await display.readProperty("wsAddress");
    display.invokeAction("inputThings", inputThings);

    // set WS that input devices use to communicate their data
    pointer.invokeAction("wsAddress", outWsAddress);
    keyboard.invokeAction("wsAddress", outWsAddress);
}

function stopApp(display, pointer, keyboard) {

    log("Stopping app", ".");

    display.invokeAction("closeWsServer");
    pointer.invokeAction("closeWs");
    keyboard.invokeAction("closeWs");
}

function log(value, separator) {
    console.log("\n" + separator.repeat(20));
    console.log(value);
    console.log(separator.repeat(20) + "\n");
}