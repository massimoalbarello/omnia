const startScannerBtn = document.getElementById('startScannerBtn');
const stopSharingBtn = document.getElementById('stopSharingBtn');

// own thng's API key
const deviceApiKey = "8R7Xng8aY5Sjip4VmLxYNe85gFpimyE1P1maHrP78aOeysSL8y5e4pivblc8NgWIUJOUdVJyO3SEdMyv";
const thngId = "VTyqPXxTCd3P3hddsKFfQhch";

// WS used to received peer's API key from scanner
const peerPropertyWsUrl = `wss://ws.evrythng.com:443/thngs/${thngId}/properties/peer?access_token=${deviceApiKey}`;
let peerPropertyWs = new WebSocket(peerPropertyWsUrl);

const polite = false;
const streamer = true;

peerPropertyWs.onopen = () => console.log("Peer property WS opened");

peerPropertyWs.onmessage = handlePeerPropertyWsOnMessageEvent;

peerPropertyWs.onclose = () => {
  console.log('Peer property WS closed');
  peerPropertyWs = new WebSocket(peerPropertyWsUrl);
  peerPropertyWs.onmessage = handlePeerPropertyWsOnMessageEvent;
  console.log('Reconnected to peer property WS');
};

// peer's API key received from scanner
function handlePeerPropertyWsOnMessageEvent(message) {
  const peerAPIkey = JSON.parse(message.data)[0].value;
  console.log(`Received peer API key: ${peerAPIkey}`);

  openPeerConnection(thngId, deviceApiKey, polite, streamer, peerAPIkey, null, connectionErrorHanlder);
  stopSharingBtn.hidden = false;
};

function connectionErrorHanlder() {
  stopSharingBtn.hidden = true;
  startScannerBtn.hidden = false;
  console.log("Stopped sharing");
}

function stopSharing() {
  closePeerConnection();
}