const scannerContainer = document.getElementById('scannerContainer');

evrythng.setup({
    apiVersion: 1
});

evrythng.use(ScanThng);

const APPLICATION_API_KEY = 'UpkN2ravWdkyDbfdhmWn6HV1bLxz0LddQlGsMKGaEMtMiMUi1GesiRiPjaQquLsgfyes1vd2mSiQkwtY';
const app = new evrythng.Application(APPLICATION_API_KEY);

function startScanner() {
    app.init().then(async () => {
        startScannerBtn.hidden = true;
        scannerContainer.hidden = false;
        const SENDER_API_KEY = "8R7Xng8aY5Sjip4VmLxYNe85gFpimyE1P1maHrP78aOeysSL8y5e4pivblc8NgWIUJOUdVJyO3SEdMyv";
        
        const scanReceiver = await app.scanStream({
            filter: { method: '2d', type: 'qr_code' },
            containerId: 'scannerContainer',
        });
        const RECEIVER_API_KEY = scanReceiver[0].meta.value;

        const sender = new evrythng.Device(SENDER_API_KEY);
        sender.init().then(() => sender.property('peer').update(RECEIVER_API_KEY));

        const receiver = new evrythng.Device(RECEIVER_API_KEY);
        receiver.init().then(() => receiver.property('peer').update(SENDER_API_KEY));
        scannerContainer.hidden = true;
    });
}

