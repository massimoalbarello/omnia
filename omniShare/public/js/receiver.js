const video = document.getElementById('video');
const receiverQRcode = document.getElementById('receiverQRcode');

evrythng.setup({
  apiVersion: 1
});

const DEVICE_API_KEY = "wxUwtxdpDxPXad08VSjej2evlwCfQ4Q4JpYCoZhzYXquuWnFmYnMb6q9Xnn7U7win1yyNvvHn2xxKwAv";
const thng = new evrythng.Device(DEVICE_API_KEY);
const thngId = "VTy6QSN4nVbRE2cg9HcFUdpp";

const offerPropertyWsUrl = `wss://ws.evrythng.com:443/thngs/${thngId}/properties/offer?access_token=${DEVICE_API_KEY}`;
const offerPropertyWs = new WebSocket(offerPropertyWsUrl);

const servers = {
  iceServers: [
    {
      urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
    },
  ],
  iceCandidatePoolSize: 10,
};

let peerConnection = new RTCPeerConnection(servers);

offerPropertyWs.onmessage = async (message) => {
  const offer = JSON.parse(JSON.parse(message.data.slice(1, -1)).value);
  console.log("Received peer's session description");
  await peerConnection.setRemoteDescription(offer);
  console.log("Set remote session description as peer's offer");
  const answer = await peerConnection.createAnswer();
  peerConnection.setLocalDescription(answer);
  console.log("Set local session description as answer");
};

peerConnection.onicecandidate = () => {
  console.log("New ICE candidate");
  const payload = { customFields: { sdp: JSON.stringify(peerConnection.localDescription) } };
  thng.update(payload).then(() => {
    console.log("Local session description updated on EVRYTHNG thng");
  });
  receiverQRcode.hidden = true;
  video.hidden = false;
}

peerConnection.onaddstream = (event) => {
  video.srcObject = event.stream;
  console.log('Received remote stream set as video source');
};



function openFullscreen() {
  if (video.requestFullscreen) {
    video.requestFullscreen();
  } else if (video.webkitRequestFullscreen) { /* Safari */
    video.webkitRequestFullscreen();
  } else if (video.msRequestFullscreen) { /* IE11 */
    video.msRequestFullscreen();
  }
}