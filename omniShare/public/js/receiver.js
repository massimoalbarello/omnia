const video = document.getElementById('video');
const receiverQRcode = document.getElementById('receiverQRcode');

evrythng.setup({
  apiVersion: 1
});

const DEVICE_API_KEY = "wxUwtxdpDxPXad08VSjej2evlwCfQ4Q4JpYCoZhzYXquuWnFmYnMb6q9Xnn7U7win1yyNvvHn2xxKwAv";
const thng = new evrythng.Device(DEVICE_API_KEY);
const thngId = "VTy6QSN4nVbRE2cg9HcFUdpp";

const peerPropertyWsUrl = `wss://ws.evrythng.com:443/thngs/${thngId}/properties/peer?access_token=${DEVICE_API_KEY}`;
let peerPropertyWs = new WebSocket(peerPropertyWsUrl);

const offerPropertyWsUrl = `wss://ws.evrythng.com:443/thngs/${thngId}/properties/offer?access_token=${DEVICE_API_KEY}`;
let offerPropertyWs;

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

peerPropertyWs.onmessage = handlePeerPropertyWsOnMessageEvent;

peerPropertyWs.onclose = () => {
  console.log('peerPropertyWs closed');
  peerPropertyWs = new WebSocket(peerPropertyWsUrl);
  peerPropertyWs.onmessage = handlePeerPropertyWsOnMessageEvent;
  console.log('Reconnected to peer property WS');
};

async function handlePeerPropertyWsOnMessageEvent(message) {
  const peerAPIkey = JSON.parse(message.data)[0].value;
  console.log(`Received peer API key: ${peerAPIkey}`);
  peer = new evrythng.Device(peerAPIkey);
  await peer.init();
  console.log(`Peer thng initialized`);

  await Promise.all([openOfferPropertyWS(), openIceCandidatePropertyWS()])
    .then(() => console.log("Offer and ICE candidate WSs opened")); 

  // initialize peer connection only once the promises have been resolved in order not to miss any events
  peerConnection = new RTCPeerConnection(servers); 

  // icecandidate events are fired as soon as the local description is set
  countLocalIceCandidates = 0;
  peerConnection.onicecandidate = handleLocalIceCandidateEvent;

  peerConnection.ontrack = handleTrackEvent;

  peerConnection.oniceconnectionstatechange = handleIceConnectionStateChangeEvent;

  peerConnection.onicegatheringstatechange = (event) => {
    console.log(event);
  };

  offerPropertyWs.onmessage = handleOfferPropertyWsOnMessageEvent;
  
  countReceivedIceCandidates = 0;
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

function handleLocalIceCandidateEvent(event) {
  if (event.candidate) {
    countLocalIceCandidates++;
  }
  else {
    console.log(`Local ICE candidates gathering complete: ${countLocalIceCandidates} found`);
    countLocalIceCandidates = 0;
  }
  peer.property('icecandidate').update(JSON.stringify(event.candidate));
};

function handleTrackEvent(event) {
  receiverQRcode.hidden = true;
  video.hidden = false;
  video.srcObject = event.streams[0];
  console.log('Received remote stream');
};

function handleIceConnectionStateChangeEvent() {
  switch(peerConnection.iceConnectionState) {
    case "disconnected":
    case "closed":
    case "failed":
      console.log(`ICE connection state: ${peerConnection.iceConnectionState}`);
      stopSharedVideo();
      break;
    default:
      console.log(`ICE connection state: ${peerConnection.iceConnectionState}`);
  }
}

async function handleOfferPropertyWsOnMessageEvent(message) {
  const offer = new RTCSessionDescription(JSON.parse(JSON.parse(message.data)[0].value));
  console.log("Received peer's offer");
  await peerConnection.setRemoteDescription(offer);
  console.log("Set peer's offer as remote session description");

  peerConnection.createAnswer()
    .then((answer) => {
      peerConnection.setLocalDescription(answer);
      console.log("Answer set as local session description");
      peer.property('answer').update(JSON.stringify(answer));
      console.log("Answer sent to peer");
    })
    .catch(() => console.log("Invalid local session description"));   
};

function handleIceCandidatePropertyWsOnMessageEvent(message) {
  let candidateObject = JSON.parse(JSON.parse(message.data)[0].value);
  if (candidateObject) {
    const iceCandidate = new RTCIceCandidate(candidateObject);
    // addIceCandidate must be called after setRemoteDescription
    if (peerConnection.remoteDescription) {
      peerConnection.addIceCandidate(iceCandidate)
      countReceivedIceCandidates++;
    }
    else {
      console.log("Remote description not set yet, storing ice candidate");
      // todo: start listening for remote candidates immediately, store them until remote description is set
    }
  }
  else {
    console.log(`Received a total of ${countReceivedIceCandidates} ICE candidates from peer`);
    countReceivedIceCandidates = 0;
  }
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

function stopSharedVideo() {
  peerConnection.ontrack = null;
  peerConnection.onicecandidate = null;
  peerConnection.onicegatheringstatechange = null;
  peerConnection.oniceconnectionstatechange = null;
  if (video.srcObject) {
    video.srcObject.getTracks().forEach(track => track.stop());
  }
  peerConnection.close();
  peerConnection = null;
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