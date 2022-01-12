const keypress = require('keypress');

const ThingWot = require("./thingWot").ThingWot;



const td = {
    "@context": "https://www.w3.org/2019/wot/td/v1",
    title: "keyboard",
    actions: {
        wsAddress: {
            type: "string",
        }
    }
};

const keyboard = new ThingWot(8082, td);


keyboard.exposeThing();

// make `process.stdin` begin emitting "keypress" events
keypress(process.stdin);

// listen for the "keypress" event
process.stdin.on('keypress', function (ch, data) {
    keyboard.eventTriggered(data);
    if (data && data.ctrl && data.name == 'c') {
        process.stdin.pause();
    }
});

process.stdin.setRawMode(true);
process.stdin.resume();