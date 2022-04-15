const video = document.getElementById('video');
const receiverQRcode = document.getElementById('receiverQRcode');

evrythng.setup({
  apiVersion: 1
});

// own thng's API key
const DEVICE_API_KEY = "wxUwtxdpDxPXad08VSjej2evlwCfQ4Q4JpYCoZhzYXquuWnFmYnMb6q9Xnn7U7win1yyNvvHn2xxKwAv";
const thng = new evrythng.Device(DEVICE_API_KEY);
const thngId = "VTy6QSN4nVbRE2cg9HcFUdpp";

// WS used to received peer's API key from scanner
const peerPropertyWsUrl = `wss://ws.evrythng.com:443/thngs/${thngId}/properties/peer?access_token=${DEVICE_API_KEY}`;
let peerPropertyWs = new WebSocket(peerPropertyWsUrl);

// WS used to receive offer from peer
const offerPropertyWsUrl = `wss://ws.evrythng.com:443/thngs/${thngId}/properties/offer?access_token=${DEVICE_API_KEY}`;
let offerPropertyWs;

//WS used to receive ICE candidates from peer
const iceCandidatePropertyWsUrl = `wss://ws.evrythng.com:443/thngs/${thngId}/properties/icecandidate?access_token=${DEVICE_API_KEY}`;
let iceCandidatePropertyWs;

const servers = {
  iceServers: [
    {
      urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
    },
  ],
  iceCandidatePoolSize: 10,
};

let peerConnection;
let peer;
let countLocalIceCandidates;
let countReceivedIceCandidates;
let earlyIceCandidates; // store peer's ICE candidates received before remote description is set

peerPropertyWs.onmessage = handlePeerPropertyWsOnMessageEvent;

peerPropertyWs.onclose = () => {
  console.log('peerPropertyWs closed');
  peerPropertyWs = new WebSocket(peerPropertyWsUrl);
  peerPropertyWs.onmessage = handlePeerPropertyWsOnMessageEvent;
  console.log('Reconnected to peer property WS');
};

// peer's API key received from scanner
async function handlePeerPropertyWsOnMessageEvent(message) {
  const peerAPIkey = JSON.parse(message.data)[0].value;
  console.log(`Received peer API key: ${peerAPIkey}`);
  peer = new evrythng.Device(peerAPIkey);
  await peer.init();
  console.log(`Peer thng initialized`);

  receiverQRcode.hidden = true;

  await Promise.all([openOfferPropertyWS(), openIceCandidatePropertyWS()])
    .then(() => console.log("Offer and ICE candidate WSs opened")); 

  offerPropertyWs.onmessage = handleOfferPropertyWsOnMessageEvent;

  // initialize peer connection only once the promises have been resolved in order not to miss any events
  peerConnection = new RTCPeerConnection(servers); 

  // icecandidate events are fired as soon as the local description is set
  countLocalIceCandidates = 0;
  peerConnection.onicecandidate = handleLocalIceCandidateEvent;

  peerConnection.ontrack = handleTrackEvent;

  peerConnection.oniceconnectionstatechange = handleIceConnectionStateChangeEvent;

  // called by the ICE layer when the ICE agent's process of collecting candidates changes state
  peerConnection.onicegatheringstatechange = (event) => {
    console.log(event);
  };

  countReceivedIceCandidates = 0;
  earlyIceCandidates = [];
  iceCandidatePropertyWs.onmessage = handleIceCandidatePropertyWsOnMessageEvent;
};

function openOfferPropertyWS() {
  return new Promise((resolve, reject) => {
    offerPropertyWs = new WebSocket(offerPropertyWsUrl);
    offerPropertyWs.onopen = () => {
      console.log("Connected to offer property WS");
      resolve();
    };
    offerPropertyWs.onerror = (error) => {
      console.log("Error on offer property WS: " + error);
      reject();
    };
    offerPropertyWs.onclose = () => {
      console.log("Offer property WS closed");
    };
  });  
}

function openIceCandidatePropertyWS() {
  return new Promise((resolve, reject) => {
    iceCandidatePropertyWs = new WebSocket(iceCandidatePropertyWsUrl);
    iceCandidatePropertyWs.onopen = () => {
      console.log("Connected to ice candidate property WS");
      resolve();
    };
    iceCandidatePropertyWs.onerror = (error) => {
      console.log("Error on ice candidate property WS: " + error);
      reject();
    };
    iceCandidatePropertyWs.onclose = () => {
      console.log("Ice candidate property WS closed");
    };
  });
}

// received offer from peer
async function handleOfferPropertyWsOnMessageEvent(message) {
  const offer = new RTCSessionDescription(JSON.parse(JSON.parse(message.data)[0].value));
  console.log("Received peer's offer");
  await peerConnection.setRemoteDescription(offer);
  console.log("Set peer's offer as remote session description");

  // add ICE candidates received from peer before remote description was set
  earlyIceCandidates.forEach((candidateObject) => {
    addIceCandidate(candidateObject);
  });

  peerConnection.createAnswer()
    .then((answer) => {
      peerConnection.setLocalDescription(answer);
      console.log("Answer set as local session description");
      peer.property('answer').update(JSON.stringify(answer));
      console.log("Answer sent to peer");
    })
    .catch(() => console.log("Invalid local session description"));   
};

// called by the ICE layer once a new candidate is found
function handleLocalIceCandidateEvent(event) {
  if (event.candidate) {
    countLocalIceCandidates++;
  }
  else {
    console.log(`Local ICE candidates gathering complete: ${countLocalIceCandidates} found`);
    countLocalIceCandidates = 0;
  }
  // send candidate to peer
  peer.property('icecandidate').update(JSON.stringify(event.candidate));
};

// called by the local WebRTC layer once a new track is added to the peer connection
function handleTrackEvent(event) {
  video.hidden = false;
  video.srcObject = event.streams[0];
  console.log('Received remote stream');
};

// called by the ICE layer once the ICE connection state changes
function handleIceConnectionStateChangeEvent() {
  console.log(`ICE connection state: ${peerConnection.iceConnectionState}`);
  switch(peerConnection.iceConnectionState) {
    case "disconnected":
    case "closed":
    case "failed":
      stopSharedVideo();
      break;
    default:
      break;
  }
}

// received ICE candidate from peer
function handleIceCandidatePropertyWsOnMessageEvent(message) {
  let candidateObject = JSON.parse(JSON.parse(message.data)[0].value);
  // addIceCandidate must be called after setRemoteDescription
  if (peerConnection.remoteDescription) {
    addIceCandidate(candidateObject);
  }
  else {
    console.log("Remote description not set yet, storing ice candidate (null included)");
    earlyIceCandidates.push(candidateObject);
  }
};

// send peer's ICE candidate to local ICE layer
function addIceCandidate(candidateObject) {
  if (candidateObject) {
    const iceCandidate = new RTCIceCandidate(candidateObject);
    peerConnection.addIceCandidate(iceCandidate);
    countReceivedIceCandidates++;
  }
  else {
    console.log(`Received a total of ${countReceivedIceCandidates} ICE candidates from peer`);
    countReceivedIceCandidates = 0;
  }
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

let hasPlayed = false;
function handleFirstPlay() {
  if (!hasPlayed) {
    console.log("Video has started playing");
    hasPlayed = true;
  }
}

function stopSharedVideo() {
  peerConnection.ontrack = null;
  peerConnection.onicecandidate = null;
  peerConnection.onicegatheringstatechange = null;
  peerConnection.oniceconnectionstatechange = null;
  peerConnection.close();
  peerConnection = null;

  if (video.srcObject) {
    video.srcObject.getTracks().forEach(track => track.stop());
  }
  
  offerPropertyWs.close();
  offerPropertyWs = null;

  iceCandidatePropertyWs.close();
  iceCandidatePropertyWs = null;

  video.removeAttribute("srcObject");
  video.hidden = true;
  hasPlayed = false;
  receiverQRcode.hidden = false;
  console.log("Stopped receiving shared screen");
}