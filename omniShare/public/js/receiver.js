const video = document.getElementById('video');
const receiverQRcode = document.getElementById('receiverQRcode');

const trustedAppKey = "yourTrustedAppApiKey";
const polite = true;
const streamer = false;

let thngId;

async function setupThngIdExchange() {

  const data = await fetch(`https://us-central1-omnia-8a9aa.cloudfunctions.net/generateUID?name=temporaryReceiver`, {
    method: 'GET',
  }).then(response => response.json());
  thngId = data.thngId;
  console.log("Generated thng id: " + thngId);

  // WS used to received peer's API key from scanner
  const peerPropertyWsUrl = `wss://ws.evrythng.com:443/thngs/${thngId}/properties/peer?access_token=${trustedAppKey}`;
  let peerPropertyWs = new WebSocket(peerPropertyWsUrl);

  peerPropertyWs.onopen = () => {
    new QRCode(receiverQRcode, thngId);
    receiverQRcode.hidden = false;
    console.log("Peer property WS opened");
  }

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
  
  receiverQRcode.hidden = true;
  openPeerConnection(thngId, polite, streamer, peerThngId, handleTrackEvent, connectionErrorHanlder);
};

// called by the local WebRTC layer once a new track is added to the peer connection
function handleTrackEvent(event) {
  video.srcObject = new MediaStream();
  video.hidden = false;
  event.streams[0].getTracks().forEach((track) => {
    video.srcObject.addTrack(track);
  });
  console.log('Received remote stream');
};

let hasPlayed = false;
function handleFirstPlay() {
  if (!hasPlayed) {
    console.log("Video has started playing");
    hasPlayed = true;
  }
}

function connectionErrorHanlder() {
  if (video.srcObject) {
    video.srcObject.getTracks().forEach(track => track.stop());
  }
  
  video.removeAttribute("srcObject");
  video.hidden = true;
  hasPlayed = false;
  receiverQRcode.hidden = false;
  console.log("Stopped receiving shared screen");
}

function openFullscreen() {
  if (video.requestFullscreen) {
    video.requestFullscreen();
  } else if (video.webkitRequestFullscreen) { /* Safari */
    video.webkitRequestFullscreen();
  } else if (video.msRequestFullscreen) { /* IE11 */
    video.msRequestFullscreen();
  };
}

setupThngIdExchange();