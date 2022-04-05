evrythng.setup({
    apiVersion: 1
});

evrythng.use(ScanThng);

const APPLICATION_API_KEY = 'UpkN2ravWdkyDbfdhmWn6HV1bLxz0LddQlGsMKGaEMtMiMUi1GesiRiPjaQquLsgfyes1vd2mSiQkwtY';
const app = new evrythng.Application(APPLICATION_API_KEY);

async function scanner() {
    const scanSender = await app.scanStream({
        filter: { method: '2d', type: 'qr_code' },
        containerId: 'stream_container',
    });
    const SENDER_API_KEY = scanSender[0].meta.value;
    console.log(`Sender API key: ${SENDER_API_KEY}`);
    const sender = new evrythng.Device(SENDER_API_KEY)
    await sender.init();
    const thngIdSender = sender.id;
    console.log(`Sender ID: ${thngIdSender}`);

    const urlSender = `wss://ws.evrythng.com:443/thngs/${thngIdSender}/properties/answer?access_token=${SENDER_API_KEY}`;
    const socketSender = new WebSocket(urlSender);

    const scanReceiver = await app.scanStream({
        filter: { method: '2d', type: 'qr_code' },
        containerId: 'stream_container',
    });
    const RECEIVER_API_KEY = scanReceiver[0].meta.value;
    console.log(`Receiver API key: ${RECEIVER_API_KEY}`);
    const receiver = new evrythng.Device(RECEIVER_API_KEY)
    await receiver.init();
    const thngIdReceiver = receiver.id;
    console.log(`Receiver ID: ${thngIdReceiver}`);

    const urlReceiver = `wss://ws.evrythng.com:443/thngs/${thngIdReceiver}/properties/offer?access_token=${RECEIVER_API_KEY}`;
    const socketReceiver = new WebSocket(urlReceiver);

    socketReceiver.addEventListener('open', () => {
        sender.read().then((thng) => {
            const offer = thng.customFields.sdp;
            // console.log(offer);
            const update = [{ value: offer }];
            socketReceiver.send(JSON.stringify(update));
            setTimeout(() => {  // wait for the offer to be recived by the receiver web app to then set its SDP on the receiver thng
                receiver.read().then((thng) => {
                    const answer = thng.customFields.sdp;
                    // console.log(answer);
                    const update = [{ value: answer }];
                    socketSender.send(JSON.stringify(update));
                });
            }, 1000);
        });
    });
}

scanner();