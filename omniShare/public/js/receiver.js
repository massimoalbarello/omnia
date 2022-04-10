const video = document.getElementById('video');
const receiverQRcode = document.getElementById('receiverQRcode');

evrythng.setup({
  apiVersion: 1
});

const DEVICE_API_KEY = "wxUwtxdpDxPXad08VSjej2evlwCfQ4Q4JpYCoZhzYXquuWnFmYnMb6q9Xnn7U7win1yyNvvHn2xxKwAv";
const thng = new evrythng.Device(DEVICE_API_KEY);
const thngId = "VTy6QSN4nVbRE2cg9HcFUdpp";

const peerPropertyWsUrl = `wss://ws.evrythng.com:443/thngs/${thngId}/properties/peer?access_token=${DEVICE_API_KEY}`;
const peerPropertyWs = new WebSocket(peerPropertyWsUrl);

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

const peerConnection = new RTCPeerConnection(servers);

peerPropertyWs.onmessage = async (message) => {
  const peerAPIkey = JSON.parse(message.data)[0].value;
  console.log(`Received peer API key: ${peerAPIkey}`);
  const peer = new evrythng.Device(peerAPIkey);

  let answerSet = false;
  offerPropertyWs.onmessage = async (message) => {
    if (!answerSet) {
      answerSet = true;
      const offer = JSON.parse(JSON.parse(message.data)[0].value);
      console.log("Received peer's session description");
      await peerConnection.setRemoteDescription(offer);
      console.log("Set remote session description to peer's offer");
      const answer = await peerConnection.createAnswer();
      peerConnection.setLocalDescription(answer);
      console.log("Set answer as local session description");
      await peer.init();
      peer.property('answer').update(JSON.stringify(answer))
    }
  };

  peerConnection.ontrack = (event) => {
    receiverQRcode.hidden = true;
    video.hidden = false;
    video.srcObject = event.streams[0];
    console.log('Received remote stream set as video source');
    console.log(event.streams[0]);
  };
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

setInterval(() => {
  console.log(`Connection state: ${peerConnection.connectionState}`);
}, 5000);