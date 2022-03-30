const video2 = document.querySelector('video#video2');

evrythng.setup({
  apiVersion: 1
});

const DEVICE_API_KEY = "wxUwtxdpDxPXad08VSjej2evlwCfQ4Q4JpYCoZhzYXquuWnFmYnMb6q9Xnn7U7win1yyNvvHn2xxKwAv";
const device = new evrythng.Device(DEVICE_API_KEY);
const thngId = "VTy6QSN4nVbRE2cg9HcFUdpp";

const url = `wss://ws.evrythng.com:443/thngs/${thngId}/properties/offer?access_token=${DEVICE_API_KEY}`;
const socket = new WebSocket(url);

const servers = {
  iceServers: [
    {
      urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
    },
  ],
  iceCandidatePoolSize: 10,
};

let pc2 = new RTCPeerConnection(servers);

let remoteStream;

socket.addEventListener('message', async (message) => {
  const offer = JSON.parse(JSON.parse(message.data.slice(1, -1)).value);
  console.log(offer);
  await pc2.setRemoteDescription(offer);
  console.log("Offer set!");
  const answer = await pc2.createAnswer();
  pc2.setLocalDescription(answer);
});

pc2.onicecandidate = e => {
  console.log("New ICE candidate, reprinting SDP: " + JSON.stringify(pc2.localDescription));
  const payload = { customFields: { sdp: JSON.stringify(pc2.localDescription) } };
  device.update(payload).then((thng) => {
    console.log(thng);
  });
}

pc2.onaddstream = function(e) {
  remoteStream = e.stream;
  video2.srcObject = remoteStream;
  console.log(remoteStream)
  console.log('Received remote stream');
};