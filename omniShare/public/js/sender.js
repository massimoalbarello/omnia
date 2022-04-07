const senderQRcode = document.getElementById('senderQRcode');

evrythng.setup({
  apiVersion: 1
});

const DEVICE_API_KEY = "8R7Xng8aY5Sjip4VmLxYNe85gFpimyE1P1maHrP78aOeysSL8y5e4pivblc8NgWIUJOUdVJyO3SEdMyv";
const thng = new evrythng.Device(DEVICE_API_KEY);
const thngId = "VTyqPXxTCd3P3hddsKFfQhch";

const peerPropertyWsUrl = `wss://ws.evrythng.com:443/thngs/${thngId}/properties/peer?access_token=${DEVICE_API_KEY}`;
const peerPropertyWs = new WebSocket(peerPropertyWsUrl);

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

peerPropertyWs.onmessage = (message) => {
    
  console.log('Requesting local stream');
  const options = {audio: true, video: true};
  navigator.mediaDevices
    .getDisplayMedia(options)
    .then((stream) => {
      screenShare(stream, message)
    })
    .catch(function(e) {
      alert('getUserMedia() failed');
      console.log('getUserMedia() error: ', e);
    });
};

function screenShare(stream, message) {
  peerConnection.addStream(stream);

  const peerAPIkey = JSON.parse(message.data)[0].value;
  console.log(`Received peer API key: ${peerAPIkey}`);

  peerConnection.createOffer().then((offer) => peerConnection.setLocalDescription(offer)).then(console.log("Set local session description as offer"));

  const peer = new evrythng.Device(peerAPIkey);
  let offerSet = false;
  peerConnection.onicecandidate = async () => {
    if (!offerSet) {
      offerSet = true;
      console.log("New ICE candidate");
      await peer.init();
      peer.property('offer').update(JSON.stringify(peerConnection.localDescription));
        
      answerPropertyWs.addEventListener('message', (message) => {
        const answer = JSON.parse(JSON.parse(message.data)[0].value);
        console.log("Received peer's session description");
        peerConnection.setRemoteDescription(answer);
        console.log("Set remote session description as peer's answer");
      });
    };
  };
};

