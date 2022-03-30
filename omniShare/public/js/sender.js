const video1 = document.getElementById("video1");

evrythng.setup({
  apiVersion: 1
});

const DEVICE_API_KEY = "8R7Xng8aY5Sjip4VmLxYNe85gFpimyE1P1maHrP78aOeysSL8y5e4pivblc8NgWIUJOUdVJyO3SEdMyv";
const device = new evrythng.Device(DEVICE_API_KEY);
const thngId = "VTyqPXxTCd3P3hddsKFfQhch";

const url = `wss://ws.evrythng.com:443/thngs/${thngId}/properties/answer?access_token=${DEVICE_API_KEY}`;
const socket = new WebSocket(url);

const servers = {
  iceServers: [
    {
      urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
    },
  ],
  iceCandidatePoolSize: 10,
};

const pc1 = new RTCPeerConnection(servers); 

let localStream;

socket.addEventListener('message', (message) => {
  const answer = JSON.parse(JSON.parse(message.data.slice(1, -1)).value);
  console.log(answer);
  pc1.setRemoteDescription(answer);
});

function gotStream(stream) {
  console.log('Received local stream');
  video1.srcObject = stream;
  localStream = stream;
  console.log('Start capturing');
  screenShare(localStream);
}

function screenShare(stream) {
  pc1.addStream(stream);

  pc1.onicecandidate = e => {
    console.log("New ICE candidate, reprinting SDP: " + JSON.stringify(pc1.localDescription));
    const payload = { customFields: { sdp: JSON.stringify(pc1.localDescription) } };
    device.update(payload).then((thng) => {
      console.log(thng);
    });
  }
  pc1.createOffer().then(o => pc1.setLocalDescription(o)).then(a => {
    console.log("Set successfully!");
  });
}

console.log('Requesting local stream');
const options = {audio: true, video: true};
navigator.mediaDevices
    .getDisplayMedia(options)
    .then(gotStream)
    .catch(function(e) {
      alert('getUserMedia() failed');
      console.log('getUserMedia() error: ', e);
    });

