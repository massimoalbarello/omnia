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

const iceCandidatePropertyWsUrl = `wss://ws.evrythng.com:443/thngs/${thngId}/properties/icecandidate?access_token=${DEVICE_API_KEY}`;
const iceCandidatePropertyWs = new WebSocket(iceCandidatePropertyWsUrl);

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

  const peerAPIkey = JSON.parse(message.data)[0].value;
  console.log(`Received peer API key: ${peerAPIkey}`);

  console.log('Requesting local stream');
  const options = {audio: true, video: true};
  navigator.mediaDevices
    .getDisplayMedia(options)
    .then((stream) => {
      screenShare(stream, peerAPIkey)
    })
    .catch(function(e) {
      alert('getUserMedia() failed');
      console.log('getUserMedia() error: ', e);
    });
};

function screenShare(stream, peerAPIkey) {
  stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));
  const peer = new evrythng.Device(peerAPIkey);

  peerConnection.onnegotiationneeded = async () => {
    peerConnection.createOffer()
      .then((offer) => peerConnection.setLocalDescription(offer))
      .then(console.log("Set offer as local session description"))
      .catch(console.log("Invalid local session description"));
    
    await peer.init();

    // icecandidate events are fired as soon as the local description is set
    peerConnection.onicecandidate = (event) => {
      console.log("New local ICE candidate");
      peer.property('icecandidate').update(JSON.stringify(event.candidate));
      console.log("Local ICE candidate sent to peer");
    };

    peer.property('offer').update(JSON.stringify(peerConnection.localDescription));
    console.log("Offer sent to peer");
  };

  answerPropertyWs.onmessage = (message) => {
    const answer = new RTCSessionDescription(JSON.parse(JSON.parse(message.data)[0].value));
    console.log("Received answer from peer");
    peerConnection.setRemoteDescription(answer);
    console.log("Set peer's answer as remote session description");

    // todo: start listening for remote candidates immediately, store them until remote description is set
    iceCandidatePropertyWs.onmessage = (message) => {
      const iceCandidate = new RTCIceCandidate(JSON.parse(JSON.parse(message.data)[0].value));
      console.log("Received peer's ICE candidate");
      // addIceCandidate must be called after setRemoteDescription
      peerConnection.addIceCandidate(iceCandidate)
        .then(() => console.log("Added peer's ICE candidate"))
        .catch((e) => {
          console.log("Failure during addIceCandidate(): " + e.name);
        });
    };
  };
};

setInterval(() => {
  console.log(`Connection state: ${peerConnection.connectionState}`);
}, 5000);
