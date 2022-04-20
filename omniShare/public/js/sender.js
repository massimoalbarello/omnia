const senderQRcode = document.getElementById('senderQRcode');
const stopSharingBtn = document.getElementById('stopSharingBtn');

// own thng's API key
const deviceApiKey = "8R7Xng8aY5Sjip4VmLxYNe85gFpimyE1P1maHrP78aOeysSL8y5e4pivblc8NgWIUJOUdVJyO3SEdMyv";
const thngId = "VTyqPXxTCd3P3hddsKFfQhch";

// WS used to received peer's API key from scanner
const peerPropertyWsUrl = `wss://ws.evrythng.com:443/thngs/${thngId}/properties/peer?access_token=${deviceApiKey}`;
let peerPropertyWs = new WebSocket(peerPropertyWsUrl);

const signaling = new SignalingChannel(thngId, deviceApiKey);

const servers = {
  iceServers: [
    {
      urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
    },
  ],
  iceCandidatePoolSize: 10,
};

let peerConnection;
let countLocalIceCandidates;
let countReceivedIceCandidates;
let earlyIceCandidates; // store peer's ICE candidates received before remote description is set
let makingOffer;
let ignoreOffer;
let polite = false;

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

  senderQRcode.hidden = true;

  await signaling.setupChannel(handleSignalingChannelOnMessageEvent, peerAPIkey); 
  
  console.log('Requesting local stream');
  const options = {audio: true, video: true};
  navigator.mediaDevices
    .getDisplayMedia(options)
    .then((stream) => {
      screenShare(stream)
    })
    .catch(function(e) {
      alert('getUserMedia() failed');
      console.log('getUserMedia() error: ', e);
    });
};

function screenShare(stream) {
  // initialize peer connection only once the promises have been resolved in order not to miss any events
  peerConnection = new RTCPeerConnection(servers); 
  
  stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));

  makingOffer = false;
  peerConnection.onnegotiationneeded = handleNegotiationNeededEvent;

  // icecandidate events are fired as soon as the local description is set
  countLocalIceCandidates = 0;
  peerConnection.onicecandidate = handleLocalIceCandidateEvent;

  peerConnection.oniceconnectionstatechange = handleIceConnectionStateChangeEvent;

  countReceivedIceCandidates = 0;
  earlyIceCandidates = [];
  ignoreOffer = false;
};

// called whenever the WebRTC infrastructure needs you to start the session negotiation process anew
async function handleNegotiationNeededEvent() {
  try {
    makingOffer = true;
    await peerConnection.setLocalDescription();
    signaling.sendToPeer({ description: peerConnection.localDescription });
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
  signaling.sendToPeer({candidate});
};

// called by the ICE layer once the ICE connection state changes
function handleIceConnectionStateChangeEvent() {
  console.log(`ICE connection state: ${peerConnection.iceConnectionState}`);
  switch(peerConnection.iceConnectionState) {
    case "disconnected":
    case "closed":
    case "failed":
      stopSharing();
      break;
    default:
      break;
  }
}

async function handleSignalingChannelOnMessageEvent(description, candidateObject) {
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
        signaling.sendToPeer({ description: peerConnection.localDescription });
        console.log("Answer sent to peer");
      }
      else {
        console.log("Received answer");
      }
      stopSharingBtn.hidden = false;
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

function stopSharing() {
  peerConnection.onicecandidate = null;
  peerConnection.oniceconnectionstatechange = null;
  peerConnection.onicegatheringstatechange = null;
  peerConnection.onnegotiationneeded = null;
  peerConnection.close();
  peerConnection = null;

  signaling.closeChannel();
  
  stopSharingBtn.hidden = true;
  senderQRcode.hidden = false;
  console.log("Stopped sharing");
}