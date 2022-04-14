const senderQRcode = document.getElementById('senderQRcode');
const stopSharingBtn = document.getElementById('stopSharingBtn');

evrythng.setup({
  apiVersion: 1
});

const DEVICE_API_KEY = "8R7Xng8aY5Sjip4VmLxYNe85gFpimyE1P1maHrP78aOeysSL8y5e4pivblc8NgWIUJOUdVJyO3SEdMyv";
const thng = new evrythng.Device(DEVICE_API_KEY);
const thngId = "VTyqPXxTCd3P3hddsKFfQhch";

const peerPropertyWsUrl = `wss://ws.evrythng.com:443/thngs/${thngId}/properties/peer?access_token=${DEVICE_API_KEY}`;
let peerPropertyWs = new WebSocket(peerPropertyWsUrl);

const answerPropertyWsUrl = `wss://ws.evrythng.com:443/thngs/${thngId}/properties/answer?access_token=${DEVICE_API_KEY}`;
let answerPropertyWs;

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

peerPropertyWs.onmessage = handlePeerPropertyWsOnMessageEvent;

async function handlePeerPropertyWsOnMessageEvent(message) {
  const peerAPIkey = JSON.parse(message.data)[0].value;
  console.log(`Received peer API key: ${peerAPIkey}`);
  senderQRcode.hidden = true;

  await Promise.all([openAnswerPropertyWS(), openIceCandidatePropertyWS()])
    .then(() => console.log("Answer and ICE candidate WSs opened")); 

  peer = new evrythng.Device(peerAPIkey);
  await peer.init();
  console.log(`Peer thng initialized`);
  
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

peerPropertyWs.onclose = () => {
  console.log('peerPropertyWs closed');
  peerPropertyWs = new WebSocket(peerPropertyWsUrl);
  peerPropertyWs.onmessage = handlePeerPropertyWsOnMessageEvent;
  console.log('Reconnected to peer property WS');
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

async function screenShare(stream, peerAPIkey) {
  // initialize peer connection only once the promises have been resolved in order not to miss any events
  peerConnection = new RTCPeerConnection(servers); 
  stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));

  peerConnection.onnegotiationneeded = () => {
    peerConnection.createOffer()
      .then((offer) => {
        peerConnection.setLocalDescription(offer);
        console.log("Offer set as local session description")
        peer.property('offer').update(JSON.stringify(offer));
        console.log("Offer sent to peer");
      })
      .catch(() => console.log("Invalid local session description"));

    // icecandidate events are fired as soon as the local description is set
    let countLocalIceCandidates = 0;
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        countLocalIceCandidates++;
      }
      else {
        console.log(`Local ICE candidates gathering complete: ${countLocalIceCandidates} found`);
        countLocalIceCandidates = 0;
      }
      peer.property('icecandidate').update(JSON.stringify(event.candidate));
    };
  };

  answerPropertyWs.onmessage = (message) => {
    const answer = new RTCSessionDescription(JSON.parse(JSON.parse(message.data)[0].value));
    console.log("Received answer from peer");
    peerConnection.setRemoteDescription(answer);
    console.log("Set peer's answer as remote session description");
    stopSharingBtn.hidden = false;

    // todo: start listening for remote candidates immediately, store them until remote description is set
    let countReceivedIceCandidates = 0;
    iceCandidatePropertyWs.onmessage = (message) => {
      let candidateObject = JSON.parse(JSON.parse(message.data)[0].value);
      if (candidateObject) {
        const iceCandidate = new RTCIceCandidate(candidateObject);
        // addIceCandidate must be called after setRemoteDescription
        peerConnection.addIceCandidate(iceCandidate)
        countReceivedIceCandidates++;
      }
      else {
        console.log(`Received a total of ${countReceivedIceCandidates} ICE candidates from peer`);
        countReceivedIceCandidates = 0;
      }
    };
  };

  peerConnection.oniceconnectionstatechange = () => {
    switch(peerConnection.iceConnectionState) {
      case "disconnected":
      case "closed":
      case "failed":
        console.log(`ICE connection state: ${peerConnection.iceConnectionState}`);
        stopSharing();
        break;
      default:
        console.log(`ICE connection state: ${peerConnection.iceConnectionState}`);
    }
  }
  
  peerConnection.onicegatheringstatechange = (event) => {
    console.log(event);
  };
};

function stopSharing() {
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
  stopSharingBtn.hidden = true;
  senderQRcode.hidden = false;
  console.log("Stopped sharing");
}