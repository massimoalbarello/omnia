evrythng.setup({
    apiVersion: 1
});

evrythng.use(ScanThng);

const APPLICATION_API_KEY = 'UpkN2ravWdkyDbfdhmWn6HV1bLxz0LddQlGsMKGaEMtMiMUi1GesiRiPjaQquLsgfyes1vd2mSiQkwtY';
const app = new evrythng.Application(APPLICATION_API_KEY);

async function keyExchange() {
    const scanSender = await app.scanStream({
        filter: { method: '2d', type: 'qr_code' },
        containerId: 'stream_container',
    });
    const SENDER_API_KEY = scanSender[0].meta.value;
    console.log(`Sender API key: ${SENDER_API_KEY}`);
    
    const scanReceiver = await app.scanStream({
        filter: { method: '2d', type: 'qr_code' },
        containerId: 'stream_container',
    });
    const RECEIVER_API_KEY = scanReceiver[0].meta.value;
    console.log(`Receiver API key: ${RECEIVER_API_KEY}`);

    const sender = new evrythng.Device(SENDER_API_KEY);
    sender.init().then(() => sender.property('peer').update(RECEIVER_API_KEY));

    const receiver = new evrythng.Device(RECEIVER_API_KEY);
    receiver.init().then(() => receiver.property('peer').update(SENDER_API_KEY));
}

keyExchange();