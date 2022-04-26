const senderQRcode = document.getElementById('senderQRcode');
const connectButton = document.getElementById('connectButton');
const disconnectButton = document.getElementById('disconnectButton');
const sendButton = document.getElementById('sendButton');
const messageBox = document.getElementById('messageBox');
const messageInput = document.getElementById('message');

evrythng.setup({
  apiVersion: 1
});

// own thng's API key
const DEVICE_API_KEY = "8R7Xng8aY5Sjip4VmLxYNe85gFpimyE1P1maHrP78aOeysSL8y5e4pivblc8NgWIUJOUdVJyO3SEdMyv";
const thng = new evrythng.Device(DEVICE_API_KEY);
const thngId = "VTyqPXxTCd3P3hddsKFfQhch";

// WS used to received peer's API key from scanner
const peerPropertyWsUrl = `wss://ws.evrythng.com:443/thngs/${thngId}/properties/peer?access_token=${DEVICE_API_KEY}`;
let peerPropertyWs = new WebSocket(peerPropertyWsUrl);

// WS used to receive answer from peer
const answerPropertyWsUrl = `wss://ws.evrythng.com:443/thngs/${thngId}/properties/answer?access_token=${DEVICE_API_KEY}`;
let answerPropertyWs;

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
let sendChannel;

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

  senderQRcode.hidden = true;

  await Promise.all([openAnswerPropertyWS(), openIceCandidatePropertyWS()])
    .then(() => console.log("Answer and ICE candidate WSs opened")); 
  
  connectButton.hidden = false;
  connectButton.addEventListener('click', connectPeer, false);
  disconnectButton.addEventListener('click', disconnectPeer, false);
  sendButton.addEventListener('click', sendMessage, false);
};

function openAnswerPropertyWS() {
  return new Promise((resolve, reject) => {
    answerPropertyWs = new WebSocket(answerPropertyWsUrl);
    answerPropertyWs.onopen = () => {
      console.log("Connected to answer property WS");
      resolve();
    };
    answerPropertyWs.onerror = (error) => {
      console.log("Error on answer property WS: " + error);
      reject();
    }; 
    answerPropertyWs.onclose = () => {
      console.log("Answer property WS closed");
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

function connectPeer() {
  console.log("Connecting peers");
  // initialize peer connection only once the promises have been resolved in order not to miss any events
  peerConnection = new RTCPeerConnection(servers); 
  
  sendChannel = peerConnection.createDataChannel("sendChannel");
  sendChannel.onopen = handleSendChannelStatusChange;
  sendChannel.onclose = handleSendChannelStatusChange;

  peerConnection.onnegotiationneeded = handleNegotiationNeededEvent;

  // icecandidate events are fired as soon as the local description is set
  countLocalIceCandidates = 0;
  peerConnection.onicecandidate = handleLocalIceCandidateEvent;

  peerConnection.oniceconnectionstatechange = handleIceConnectionStateChangeEvent;

  // called by the ICE layer when the ICE agent's process of collecting candidates changes state
  peerConnection.onicegatheringstatechange = (event) => {
    console.log(event);
  };

  answerPropertyWs.onmessage = handleAnswerPropertyWsOnMessageEvent;

  countReceivedIceCandidates = 0;
  earlyIceCandidates = [];
  iceCandidatePropertyWs.onmessage = handleIceCandidatePropertyWsOnMessageEvent;
};

function handleSendChannelStatusChange(event) {
  if (sendChannel) {
    let state = sendChannel.readyState;
    console.log("Send channel state changed: " + state);
    if (state === "open") {
      connectButton.hidden = true;
      disconnectButton.hidden = false;
      messageBox.hidden = false;
      messageInput.focus();
    }
  }
}

// called whenever the WebRTC infrastructure needs you to start the session negotiation process anew
function handleNegotiationNeededEvent() {
  peerConnection.createOffer()
    .then((offer) => {
      peerConnection.setLocalDescription(offer);
      console.log("Offer set as local session description");
      peer.property('offer').update(JSON.stringify(offer));
      console.log("Offer sent to peer");
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

// called by the ICE layer once the ICE connection state changes
function handleIceConnectionStateChangeEvent() {
  console.log(`ICE connection state: ${peerConnection.iceConnectionState}`);
  switch(peerConnection.iceConnectionState) {
    case "disconnected":
    case "closed":
    case "failed":
      disconnectPeer();
      break;
    default:
      break;
  }
}

// received answer from peer
async function handleAnswerPropertyWsOnMessageEvent(message) {
  const answer = new RTCSessionDescription(JSON.parse(JSON.parse(message.data)[0].value));
  console.log("Received answer from peer");
  await peerConnection.setRemoteDescription(answer);
  console.log("Set peer's answer as remote session description");

  // add ICE candidates received from peer before remote description was set
  earlyIceCandidates.forEach((candidateObject) => {
    addIceCandidate(candidateObject);
  });
};

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

function disconnectPeer() {  
  sendChannel.close();
  sendChannel = null;
  
  peerConnection.onicecandidate = null;
  peerConnection.oniceconnectionstatechange = null;
  peerConnection.onicegatheringstatechange = null;
  peerConnection.onnegotiationneeded = null;
  peerConnection.close();
  peerConnection = null;

  answerPropertyWs.close();
  answerPropertyWs = null;

  iceCandidatePropertyWs.close();
  iceCandidatePropertyWs = null;
  
  messageInput.value = "";

  senderQRcode.hidden = false;
  connectButton.hidden = true;
  disconnectButton.hidden = true;
  messageBox.hidden = true;

  console.log("Local peer disconnected");
}

function sendMessage() {
  let message = messageInput.value;
  sendChannel.send(message);  
  messageInput.value = "";
  messageInput.focus();
}
