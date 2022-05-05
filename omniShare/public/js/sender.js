const scannerContainer = document.getElementById('scannerContainer');
const startScannerBtn = document.getElementById('startScannerBtn');
const stopSharingBtn = document.getElementById('stopSharingBtn');

evrythng.setup({
  apiVersion: 1
});

evrythng.use(ScanThng);

const trustedAppKey = "yourTrustedAppApiKey";
const polite = false;
const streamer = true;

let thngId;
let omniaApp = new evrythng.TrustedApplication(trustedAppKey);

omniaApp.init().then(async () => {
  await requestUID();
  startScannerBtn.hidden = false;
  startScannerBtn.addEventListener('click', startScanner);
  stopSharingBtn.addEventListener('click', stopSharing);
});

async function requestUID() {

  const data = await fetch(`https://us-central1-omnia-8a9aa.cloudfunctions.net/generateUID?name=temporarySender`, {
    method: 'GET',
  }).then(response => response.json());
  thngId = data.thngId;
  console.log("Generated thng id: " + thngId);

  // WS used to received peer's API key from scanner
  const peerPropertyWsUrl = `wss://ws.evrythng.com:443/thngs/${thngId}/properties/peer?access_token=${trustedAppKey}`;
  let peerPropertyWs = new WebSocket(peerPropertyWsUrl);

  peerPropertyWs.onopen = () => console.log("Peer property WS opened");

  peerPropertyWs.onmessage = handlePeerPropertyWsOnMessageEvent;

  peerPropertyWs.onclose = () => {
    console.log('Peer property WS closed');
    peerPropertyWs = new WebSocket(peerPropertyWsUrl);
    peerPropertyWs.onmessage = handlePeerPropertyWsOnMessageEvent;
    console.log('Reconnected to peer property WS');
  };
}

// peer's thng id received from scanner
function handlePeerPropertyWsOnMessageEvent(message) {
  const peerThngId = JSON.parse(message.data)[0].value;
  console.log(`Received peer thng id: ${peerThngId}`);

  openPeerConnection(thngId, polite, streamer, peerThngId, null, connectionErrorHanlder);
  stopSharingBtn.hidden = false;
};

function connectionErrorHanlder() {
  stopSharingBtn.hidden = true;
  startScannerBtn.hidden = false;
  console.log("Stopped sharing");
}

async function startScanner() {
  console.log("Starting scanner");
  startScannerBtn.hidden = true;
  scannerContainer.hidden = false;
  
  const scanReceiver = await omniaApp.scanStream({
      filter: { method: '2d', type: 'qr_code' },
      containerId: 'scannerContainer',
  });
  const receiverThngId = scanReceiver[0].meta.value;

  omniaApp.thng(thngId).property('peer').update(receiverThngId);
  omniaApp.thng(receiverThngId).property('peer').update(thngId);
  scannerContainer.hidden = true;
}


function stopSharing() {
  closePeerConnection();
}