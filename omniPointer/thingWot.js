const Servient = require("@node-wot/core").Servient;
const HttpServer = require("@node-wot/binding-http").HttpServer;
const Helpers = require("@node-wot/core").Helpers;

const WebSocket = require('ws');



exports.ThingWot = class {
    constructor(port, td) {
        this.servient = new Servient();
        this.port = port;
        this.td = td;
        this.thing;
        this.ws;
    }
        
    async exposeThing() {
        this.servient.addServer(
            new HttpServer({
                port: this.port,
            })
        );
        const servientWoT = await this.servient.start();
        servientWoT.produce(this.td).then((thing) => {
            this.thing = thing;
            this.thing.setActionHandler("wsAddress", (address) => {
                this.log(address, "@")
                this.ws = new WebSocket(address);
            });
            this.thing.expose();
            this.log("Thing exposed", "#");
        });
    }

    eventTriggered(data) {
        if (this.ws) {
            // this.log(data, "e");
            this.ws.send(JSON.stringify(data));        
        }
        else {
            this.log("Not connected to manager", "^");
        }
    }

    log(value, separator) {
        console.log("\n" + separator.repeat(20))
        console.log(value)
        console.log(separator.repeat(20) + "\n")
    }
}