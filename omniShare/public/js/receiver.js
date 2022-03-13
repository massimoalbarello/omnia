const video2 = document.querySelector('video#video2');

const OPERATOR_API_KEY = "your_operator_api_key";
const operator = new evrythng.Operator(OPERATOR_API_KEY);
const thngId = "VTy6QSN4nVbRE2cg9HcFUdpp";

const url = `wss://ws.evrythng.com:443/thngs/${thngId}/properties/offer?access_token=${OPERATOR_API_KEY}`;
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
  operator.thng(thngId).update(payload).then((thng) => {
    console.log(thng);
  });
}

pc2.onaddstream = function(e) {
  remoteStream = e.stream;
  video2.srcObject = remoteStream;
  console.log(remoteStream)
  console.log('Received remote stream');
};