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
        this.wss;
    }
        
    exposeThing(peripheral) {
        return new Promise(async (resolve) => {
            this.servient.addServer(
                new HttpServer({
                    port: this.port,
                })
            );
            const servientWoT = await this.servient.start();
            servientWoT.produce(this.td).then((thing) => {
                this.thing = thing;
                if (peripheral === "input") {
                    this.thing.setActionHandler("wsAddress", (address) => {
                        this.log(address, "@")
                        this.ws = new WebSocket(address);
                    });
                    this.thing.setActionHandler("closeWs", () => {
                        this.log("Thing disconnected", ".")
                        this.ws = "";
                    });
                }
                else {
                    this.thing.writeProperty("wsAddress", "ws://localhost:" + 6969);
                    this.thing.setActionHandler("closeWsServer", () => {
                        this.log("Thing disconnected", ".")
                        this.wss = "";
                        this.tmp = ["http://localhost:8081/pointer"];
                        this.keyboardConnected = false;
                    });
                }
                this.thing.expose();
                this.log("Thing exposed", "#");
                resolve();
            });
        });
    }

    getInputThings() {
        return new Promise((resolve) => {
            this.thing.setActionHandler("inputThings", (inputThings) => {
                this.inputThings = inputThings;
                this.log(this.inputThings, "t");
                resolve()
            });
        });
    }

    createWsServer(port) {
        
        // map to store a client's metadata
        const clients = new Map();

        this.browserExtension = "";
        const browserExtensionIp = "10.4.23.83"; 
   
        // to be removed once things have their own ip
        this.tmp = ["http://localhost:8081/pointer"];
        this.keyboardConnected = false;
        ///////////////////////////////////////////////

        this.wss = new WebSocket.Server({ port: port });
        this.wss.on('connection', (ws, req) => {

            // const clientIp = req.socket.remoteAddress;
                    
            // to be removed once things have their own ip
            const clientIp = this.tmp[this.tmp.length - 1];
            this.tmp.pop();
            if (this.keyboardConnected) {
                this.tmp.push("10.4.23.83");
            }
            else {
                this.tmp.push("http://localhost:8082/keyboard");
                this.keyboardConnected = true;
            }
            ///////////////////////////////////////////////

            if (Object.keys(this.inputThings).includes(clientIp) || clientIp == browserExtensionIp) {
                    
                if (clientIp == browserExtensionIp) {
                    this.browserExtension = {
                        ws: ws,
                    }
                    this.log("Browser page opened.", "-")
                }
                else {
                    clients.set(ws, this.inputThings[clientIp]);
                    this.log("Connected to: " + this.inputThings[clientIp].thing, "@");
                }

                ws.on('message', (messageAsString) => {
                    const message = JSON.parse(messageAsString);
                    // this.log(message, "m");
                    if (this.browserExtension !== "") {
                        const event = {
                            data: message,
                            metadata: clients.get(ws)
                        }
                        this.browserExtension.ws.send(JSON.stringify(event));
                    }
                    else {
                        // this.log("No output thing found.", "!")
                    }
                });

                ws.on("close", () => {
                    if (ws != this.browserExtension.ws) {
                        const metadata = clients.get(ws);
                        this.log("Closed connection with: " + metadata.thing, "!");
                        clients.delete(ws);
                    }
                });
            }
        });
    }

    eventTriggered(data) {
        if (this.ws) {
            // this.log(data, "e");
            this.ws.send(JSON.stringify(data));        
        }
        else {
            this.log("Not connected to output Thing", "^");
        }
    }

    log(value, separator) {
        console.log("\n" + separator.repeat(20))
        console.log(value)
        console.log(separator.repeat(20) + "\n")
    }
}