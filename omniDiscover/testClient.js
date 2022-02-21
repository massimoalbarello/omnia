Servient = require("@node-wot/core").Servient;
HttpClientFactory = require("@node-wot/binding-http").HttpClientFactory;

Helpers = require("@node-wot/core").Helpers;

// create Servient and add HTTP binding
let servient = new Servient();
servient.addClientFactory(new HttpClientFactory(null));

let wotHelper = new Helpers(servient);
wotHelper
    .fetch("http://192.168.109.12:8081/")
    .then(async (td) => {
        // using await for serial execution (note 'async' in then() of fetch())
        try {
            servient.start().then((WoT) => {
                WoT.consume(td).then((thing) => {
                    // read a property "string" and print the value
                    thing.readProperty("string").then((s) => {
                        console.log(s);
                    });
                });
            });
        } catch (err) {
            console.error("Script error:", err);
        }
    })
    .catch((err) => {
        console.error("Fetch error:", err);
    });