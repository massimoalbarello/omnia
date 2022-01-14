const ioHook = require('iohook');

const ThingWot = require("./thingWot").ThingWot;



const td = {
    "@context": "https://www.w3.org/2019/wot/td/v1",
    title: "pointer",
    actions: {
        wsAddress: {
            type: "string",
        }
    }
};

const pointer = new ThingWot(8081, td);

pointer.exposeThing("input");

ioHook.start();
        
ioHook.on('mousemove', (data) => {
    pointer.eventTriggered(data);
});

ioHook.on('mouseclick', (data) => {
    pointer.eventTriggered(data);
});