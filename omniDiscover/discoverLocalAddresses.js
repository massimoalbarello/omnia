const find = require('local-devices');

Servient = require("@node-wot/core").Servient;
HttpClientFactory = require("@node-wot/binding-http").HttpClientFactory;
Helpers = require("@node-wot/core").Helpers;

// create Servient and add HTTP binding
let servient = new Servient();
servient.addClientFactory(new HttpClientFactory(null));

let wotHelper = new Helpers(servient);

// Find all local network devices.
find().then(devices => {
    console.log(devices);
    devices.forEach(async (device) => {
        const baseAddr = "http://" + device.ip + ":8081";
        try {
            const thingsAddresses = await wotHelper.fetch(baseAddr);
            thingsAddresses.forEach((thingAddr) => {
                wotHelper
                .fetch(thingAddr)
                .then(async (td) => {
                    // using await for serial execution (note 'async' in then() of fetch())
                    try {
                        servient.start().then((WoT) => {
                            WoT.consume(td).then((thing) => {
                                Object.keys(td.properties).forEach((key) => {
                                    thing.readProperty(key).then((value) => {
                                        console.log(thingAddr + "/properties/" + key + ": " + value);
                                    });
                                });
                            });
                        });
                    } catch (err) {
                        console.error(thingAddr + ": cannot consume Thing");
                    }
                })
                .catch((err) => {
                    console.error(thingAddr + ": cannot fetch Thing address");
                });
            });
        } catch (err) {
            console.log(baseAddr + ": no Things found");
        }
    });
});