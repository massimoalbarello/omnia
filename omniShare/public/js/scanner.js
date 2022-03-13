
const OPERATOR_API_KEY = "your_operator_api_key";
const operator = new evrythng.Operator(OPERATOR_API_KEY);
const thngIdSender = "VTyqPXxTCd3P3hddsKFfQhch";    // scan the QR to learn this ID
const thngIdReceiver = "VTy6QSN4nVbRE2cg9HcFUdpp";  // scan the QR to learn this ID

const urlSender = `wss://ws.evrythng.com:443/thngs/${thngIdSender}/properties/answer?access_token=${OPERATOR_API_KEY}`;
const socketSender = new WebSocket(urlSender);

const urlReceiver = `wss://ws.evrythng.com:443/thngs/${thngIdReceiver}/properties/offer?access_token=${OPERATOR_API_KEY}`;
const socketReceiver = new WebSocket(urlReceiver);

socketReceiver.addEventListener('open', () => {
    operator.thng(thngIdSender).read().then((thng) => {
        const offer = thng.customFields.sdp;
        console.log(offer);
        const update = [{ value: offer }];
        socketReceiver.send(JSON.stringify(update));
        setTimeout(() => {  // wait for the offer to be recived by the receiver web app to then set its SDP on the receiver thng
            operator.thng(thngIdReceiver).read().then((thng) => {
                const answer = thng.customFields.sdp;
                console.log(answer);
                const update = [{ value: answer }];
                socketSender.send(JSON.stringify(update));
            });
        }, 5000);
    });
});
