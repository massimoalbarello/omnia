const scannerContainer = document.getElementById('scannerContainer');
const startScannerBtn = document.getElementById('startScannerBtn');
const stopSharingBtn = document.getElementById('stopSharingBtn');
const messageBox = document.getElementById('messageBox');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');

evrythng.setup({
  apiVersion: 1
});

evrythng.use(ScanThng);

const trustedAppKey = "yourTrustedAppApiKey";
const polite = false;
const streamer = true;

let thngId;
let omniaApp = new evrythng.TrustedApplication(trustedAppKey);

omniaApp.init().then(() => {
  setupThngIdExchange();
});

async function setupThngIdExchange() {

  const data = await fetch(`https://us-central1-omnia-8a9aa.cloudfunctions.net/generateUID?name=temporarySender`, {
    method: 'GET',
  }).then(response => response.json());
  thngId = data.thngId;
  console.log("Generated thng id: " + thngId);

  startScannerBtn.hidden = false;
  startScannerBtn.addEventListener('click', async () => {
    const peerThngId = await startScanner();
    console.log(`Received peer thng id: ${peerThngId}`);
    omniaApp.thng(peerThngId).property('peer').update(thngId);
    
    openPeerConnection(thngId, polite, streamer, peerThngId, null, connectionErrorHanlder, senderChannelOpenedEventHandler);
    stopSharingBtn.hidden = false;
    stopSharingBtn.addEventListener('click', stopSharing);
    sendButton.addEventListener('click', sendMessage, false);
  });
}

async function startScanner() {
  console.log("Starting scanner");
  startScannerBtn.hidden = true;
  scannerContainer.hidden = false;
  
  const scanReceiver = await omniaApp.scanStream({
      filter: { method: '2d', type: 'qr_code' },
      containerId: 'scannerContainer',
  });
  scannerContainer.hidden = true;
  return scanReceiver[0].meta.value;
}

function connectionErrorHanlder() {
  stopSharingBtn.hidden = true;
  startScannerBtn.hidden = false;
  messageInput.value = "";
  messageBox.hidden = true;
  sendButton.hidden = true;
  console.log("Stopped sharing");
}

function senderChannelOpenedEventHandler() {
  messageBox.hidden = false;
  sendButton.hidden = false;
  messageInput.focus();
}

function sendMessage() {
  let message = messageInput.value;
  sendChannel.send(message);  
  messageInput.value = "";
  messageInput.focus();
}

function stopSharing() {
  closePeerConnection();
}