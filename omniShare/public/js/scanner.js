evrythng.setup({
    apiVersion: 1
});

evrythng.use(ScanThng);

const TRUSTED_APPLICATION_API_KEY = 'your_trusted_api_key';
const omniaApp = new evrythng.TrustedApplication(TRUSTED_APPLICATION_API_KEY);

omniaApp.init().then(async () => {
    const scanSender = await omniaApp.scanStream({
        filter: { method: '2d', type: 'qr_code' },
        containerId: 'stream_container',
    });
    const SENDER_THNG_ID = scanSender[0].meta.value;
    console.log(`Sender thng ID: ${SENDER_THNG_ID}`);
    
    const scanReceiver = await omniaApp.scanStream({
        filter: { method: '2d', type: 'qr_code' },
        containerId: 'stream_container',
    });
    const RECEIVER_THNG_ID = scanReceiver[0].meta.value;
    console.log(`Receiver thng ID: ${RECEIVER_THNG_ID}`);

    omniaApp.thng(SENDER_THNG_ID).property('peer').update(RECEIVER_THNG_ID);

    omniaApp.thng(RECEIVER_THNG_ID).property('peer').update(SENDER_THNG_ID);
});

