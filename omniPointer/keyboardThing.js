const keypress = require('keypress');
const WebSocket = require('ws');

const Servient = require("@node-wot/core").Servient;
const HttpServer = require("@node-wot/binding-http").HttpServer;
const Helpers = require("@node-wot/core").Helpers;

// create Servient add HTTP binding with port configuratiocn
let servient = new Servient();
servient.addServer(
    new HttpServer({
        port: 8082,
    })
);
 
// make `process.stdin` begin emitting "keypress" events
keypress(process.stdin);

servient.start().then((WoT) => {
    WoT.produce({
        "@context": "https://www.w3.org/2019/wot/td/v1",
        title: "keyboard",
        properties: {
            lastKeyPressed: {
                type: "object",
            },
        },
        actions: {
            wsAddress: {
                type: "string",
            }
        }
    }).then((thing) => {
        log(thing.getThingDescription().title, "TD");
        thing.setActionHandler("wsAddress", receivedWsAddress);
        thing.expose();

        function receivedWsAddress(address) {
            log(address, "@");
        
            const ws = new WebSocket(address);
        
            // listen for the "keypress" event
            process.stdin.on('keypress', function (ch, key) {
                // log(key, "c");
                thing.writeProperty("lastKeyPressed", key);
                sendKeyPressed(key);
                if (key && key.ctrl && key.name == 'c') {
                    process.stdin.pause();
                }
            });
        
            process.stdin.setRawMode(true);
            process.stdin.resume();

            function sendKeyPressed(key) {
                data = {
                    thing: "keyboard",
                    key: key
                }
                ws.send(JSON.stringify(data));
            }
        }
    });
});

function log(value, separator) {
    console.log("\n" + separator.repeat(20))
    console.log(value)
    console.log(separator.repeat(20) + "\n")
}