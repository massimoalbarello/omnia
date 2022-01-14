Servient = require("@node-wot/core").Servient;
HttpClientFactory = require("@node-wot/binding-http").HttpClientFactory;
Helpers = require("@node-wot/core").Helpers;

// create Servient and add HTTP binding
let servient = new Servient();
servient.addClientFactory(new HttpClientFactory(null));
let wotHelper = new Helpers(servient);

const inputThings = {
    "10.4.23.47": {
        ipAddress: "10.4.23.47",
        port: 8081,
        thing: "pointer",
    },
    "10.4.23.65": {
        ipAddress: "10.4.23.65",
        port: 8082,
        thing: "keyboard",
    }
}

// after having chosen which things to connect to
setTimeout(async () => {
    const displayTD = await wotHelper.fetch("http://localhost:8080/display/")
    const displayWoT = await servient.start();
    const display = await displayWoT.consume(displayTD);
    const outWsAddress = await display.readProperty("wsAddress");
    display.invokeAction("inputThings", inputThings);

    setTimeout(async () => {
        const pointerTD = await wotHelper.fetch("http://localhost:8081/pointer/")
        const pointerWoT = await servient.start();
        const pointer = await pointerWoT.consume(pointerTD);
        // tell thing the web socket it has to use to communicate its data
        pointer.invokeAction("wsAddress", outWsAddress);
                
        setTimeout(async () => {
            const keyboardTD = await wotHelper.fetch("http://localhost:8082/keyboard/")
            const keyboardWoT = await servient.start();
            const keyboard = await keyboardWoT.consume(keyboardTD);
            // tell thing the web socket it has to use to communicate its data
            keyboard.invokeAction("wsAddress", outWsAddress);
        }, 10000);

    }, 10000);

}, 10000);