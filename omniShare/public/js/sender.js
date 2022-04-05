const senderQRcode = document.getElementById('senderQRcode');

evrythng.setup({
  apiVersion: 1
});

const DEVICE_API_KEY = "8R7Xng8aY5Sjip4VmLxYNe85gFpimyE1P1maHrP78aOeysSL8y5e4pivblc8NgWIUJOUdVJyO3SEdMyv";
const thng = new evrythng.Device(DEVICE_API_KEY);
const thngId = "VTyqPXxTCd3P3hddsKFfQhch";

const answerPropertyWsUrl = `wss://ws.evrythng.com:443/thngs/${thngId}/properties/answer?access_token=${DEVICE_API_KEY}`;
const answerPropertyWs = new WebSocket(answerPropertyWsUrl);

const servers = {
  iceServers: [
    {
      urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
    },
  ],
  iceCandidatePoolSize: 10,
};

const peerConnection = new RTCPeerConnection(servers); 

answerPropertyWs.addEventListener('message', (message) => {
  const answer = JSON.parse(JSON.parse(message.data.slice(1, -1)).value);
  console.log("Received peer's session description");
  peerConnection.setRemoteDescription(answer);
  console.log("Set remote session description as peer's answer");

});

function screenShare(stream) {
  peerConnection.addStream(stream);

  peerConnection.onicecandidate = () => {
    console.log("New ICE candidate");
    const payload = { customFields: { sdp: JSON.stringify(peerConnection.localDescription) } };
    thng.update(payload).then(() => {
      console.log("Local session description updated on EVRYTHNG thng");
    });
  }
  peerConnection.createOffer().then((offer) => peerConnection.setLocalDescription(offer)).then(() => {
    console.log("Set local session description as offer");
  });
}

console.log('Requesting local stream');
const options = {audio: true, video: true};
navigator.mediaDevices
    .getDisplayMedia(options)
    .then(screenShare)
    .catch(function(e) {
      alert('getUserMedia() failed');
      console.log('getUserMedia() error: ', e);
    });

