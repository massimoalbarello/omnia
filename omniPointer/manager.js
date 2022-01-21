Servient = require("@node-wot/core").Servient;
HttpClientFactory = require("@node-wot/binding-http").HttpClientFactory;
Helpers = require("@node-wot/core").Helpers;

// create Servient and add HTTP binding
let servient = new Servient();
servient.addClientFactory(new HttpClientFactory(null));
let wotHelper = new Helpers(servient);

// list of local urls received from router
const localURLs = ["http://localhost:8080/display", "http://localhost:8081/pointer", "http://localhost:8082/keyboard"];

var thingDescriptors = {};
var servients = {};
var things = {};

const discoverDevicesInterval = setInterval(async () => {
    for (const index in localURLs) {
        const url = localURLs[index];
        try {
            thingDescriptors[url] = await wotHelper.fetch(url);
            servients[url] = await servient.start();
            things[url] = await servients[url].consume(thingDescriptors[url]);
            log("Connected to: " + url, "#");
            localURLs.splice(index, 1);

            if (! localURLs.length) {   // check the requirements needed to start the app
                clearInterval(discoverDevicesInterval);

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
                const outWsAddress = await things["http://localhost:8080/display"].readProperty("wsAddress");
                things["http://localhost:8080/display"].invokeAction("inputThings", inputThings);

                // set WS that input devices use to communicate their data
                things["http://localhost:8081/pointer"].invokeAction("wsAddress", outWsAddress);
                things["http://localhost:8082/keyboard"].invokeAction("wsAddress", outWsAddress);
            }
        }
        catch {
            // log(url + ": not available.", "!");
        }
    }
    log(localURLs, "?");
}, 10000);



function log(value, separator) {
    console.log("\n" + separator.repeat(20));
    console.log(value);
    console.log(separator.repeat(20) + "\n");
}