const video = document.getElementById('video');
const receiverQRcode = document.getElementById('receiverQRcode');

// own thng's API key
const deviceApiKey = "wxUwtxdpDxPXad08VSjej2evlwCfQ4Q4JpYCoZhzYXquuWnFmYnMb6q9Xnn7U7win1yyNvvHn2xxKwAv";
const thngId = "VTy6QSN4nVbRE2cg9HcFUdpp";

// WS used to received peer's API key from scanner
const peerPropertyWsUrl = `wss://ws.evrythng.com:443/thngs/${thngId}/properties/peer?access_token=${deviceApiKey}`;
let peerPropertyWs = new WebSocket(peerPropertyWsUrl);

const polite = true;
const streamer = false;

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
  
  receiverQRcode.hidden = true;
  openPeerConnection(thngId, deviceApiKey, polite, streamer, peerAPIkey, handleTrackEvent, connectionErrorHanlder);
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

function openFullscreen() {
  if (video.requestFullscreen) {
    video.requestFullscreen();
  } else if (video.webkitRequestFullscreen) { /* Safari */
    video.webkitRequestFullscreen();
  } else if (video.msRequestFullscreen) { /* IE11 */
    video.msRequestFullscreen();
  };
}

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