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

//WS used to receive remote SDP and ICE candidates from peer
const signalingChannelUrl = `wss://ws.evrythng.com:443/thngs/${thngId}/properties/signalingchannel?access_token=${DEVICE_API_KEY}`;
let signalingChannelWs;

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
let makingOffer;
let ignoreOffer;
let polite = true;

peerPropertyWs.onopen = () => console.log("Peer property WS opened");

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
  
  await openSignalingChannelWs();

  peer = new evrythng.Device(peerAPIkey);
  await peer.init();
  console.log(`Peer thng initialized`);

  receiverQRcode.hidden = true;

  // initialize peer connection only once the promises have been resolved in order not to miss any events
  peerConnection = new RTCPeerConnection(servers); 

  makingOffer = false;
  peerConnection.onnegotiationneeded = handleNegotiationNeededEvent;

  // icecandidate events are fired as soon as the local description is set
  countLocalIceCandidates = 0;
  peerConnection.onicecandidate = handleLocalIceCandidateEvent;

  peerConnection.ontrack = handleTrackEvent;

  peerConnection.oniceconnectionstatechange = handleIceConnectionStateChangeEvent;

  countReceivedIceCandidates = 0;
  earlyIceCandidates = [];
  ignoreOffer = false;
  signalingChannelWs.onmessage = handleSignalingChannelOnMessageEvent;
};


function openSignalingChannelWs() {
  return new Promise((resolve, reject) => {
    signalingChannelWs = new WebSocket(signalingChannelUrl);
    signalingChannelWs.onopen = () => {
      console.log("Connected to signaling channel WS");
      resolve();
    };
    signalingChannelWs.onerror = (error) => {
      console.log("Error on signaling channel WS: " + error);
      reject();
    }; 
    signalingChannelWs.onclose = () => {
      console.log("Signaling channel WS closed");
    };
  });  
}

// called whenever the WebRTC infrastructure needs you to start the session negotiation process anew
async function handleNegotiationNeededEvent() {
  try {
    makingOffer = true;
    await peerConnection.setLocalDescription();
    peer.property('signalingchannel').update(JSON.stringify({ description: peerConnection.localDescription }));
    console.log("SDP sent to peer");
  } catch(err) {
    console.error(err);
  } finally {
    makingOffer = false;
  }
};

// called by the ICE layer once a new candidate is found
function handleLocalIceCandidateEvent({candidate}) {
  if (candidate) {
    countLocalIceCandidates++;
  }
  else {
    console.log(`Local ICE candidates gathering complete: ${countLocalIceCandidates} found`);
    countLocalIceCandidates = 0;
  }
  // send candidate to peer
  peer.property('signalingchannel').update(JSON.stringify({candidate}));
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

async function handleSignalingChannelOnMessageEvent(message) {
  let { description, candidate: candidateObject } = JSON.parse(JSON.parse(message.data)[0].value);
  try {
    if (description) {
      const offerCollision = (description.type == "offer") &&
                             (makingOffer || peerConnection.signalingState != "stable");

      ignoreOffer = !polite && offerCollision;
      if (ignoreOffer) {
        console.log("Ignoring offer")
        return;
      }

      await peerConnection.setRemoteDescription(description); 
      // add ICE candidates received from peer before remote description was set
      earlyIceCandidates.forEach((candidateObject) => {
        addIceCandidate(candidateObject);
      });

      if (description.type == "offer") {
        console.log("Received offer");
        await peerConnection.setLocalDescription();
        peer.property('signalingchannel').update(JSON.stringify({ description: peerConnection.localDescription }));
        console.log("Answer sent to peer");
      }
      else {
        console.log("Received answer");
      }
    }
    else {
      // addIceCandidate must be called after setRemoteDescription
      if (peerConnection.remoteDescription) {
        addIceCandidate(candidateObject);
      }
      else {
        console.log("Remote description not set yet, storing ice candidate (null included)");
        earlyIceCandidates.push(candidateObject);
      }
    }
  } catch(err) {
    console.error(err);
  }
}

// send peer's ICE candidate to local ICE layer
function addIceCandidate(candidateObject) {
  if (candidateObject) {
    const iceCandidate = new RTCIceCandidate(candidateObject);
    peerConnection.addIceCandidate(iceCandidate);
    console.log("Remote candidate passed to ICE layer")
    countReceivedIceCandidates++;
  }
  else {
    console.log(`Received a total of ${countReceivedIceCandidates} valid ICE candidates from peer`);
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
  
  signalingChannelWs.close();
  signalingChannelWs = null;

  video.removeAttribute("srcObject");
  video.hidden = true;
  hasPlayed = false;
  receiverQRcode.hidden = false;
  console.log("Stopped receiving shared screen");
}