const ioHook = require('iohook');
const WebSocket = require('ws');

const Servient = require("@node-wot/core").Servient;
const HttpServer = require("@node-wot/binding-http").HttpServer;
const Helpers = require("@node-wot/core").Helpers;

// create Servient add HTTP binding with port configuratiocn
let servient = new Servient();
servient.addServer(
    new HttpServer({
        port: 8081,
    })
);

var data;

servient.start().then((WoT) => {
    WoT.produce({
        "@context": "https://www.w3.org/2019/wot/td/v1",
        title: "pointer",
        properties: {
            lastCoordinates: {
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

            ioHook.start();
        
            ioHook.on('mousemove', (event) => {
                // log(event, "m");
                sendCoordinates(event, click=false);
            });

            ioHook.on('mouseclick', (event) => {
                // log(event, "m");
                sendCoordinates(event, click=true);
            });
        
            function sendCoordinates(event, click) {
                data = {
                    thing: "pointer",
                    x: event.x,
                    y: event.y,
                    click: click
                }
                thing.writeProperty("lastCoordinates", data);
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