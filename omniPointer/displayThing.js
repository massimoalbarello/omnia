const ThingWot = require("./thingWot").ThingWot;



const td = {
    "@context": "https://www.w3.org/2019/wot/td/v1",
    title: "display",
    properties: {
        wsAddress: {
            type: "string",
        }
    },
    actions: {
        inputThings: {
            type: "object",
        }
    }
}

const display = new ThingWot(8080, td);

display.exposeThing("output").then(() => {
    display.getInputThings().then(() => {
        display.createWsServer(6969);
    });
});

