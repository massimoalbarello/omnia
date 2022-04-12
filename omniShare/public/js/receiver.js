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

peerPropertyWs.onmessage = (message) => {
  peerConnection = new RTCPeerConnection(servers); 
  offerPropertyWs = new WebSocket(offerPropertyWsUrl);
  iceCandidatePropertyWs = new WebSocket(iceCandidatePropertyWsUrl);

  const peerAPIkey = JSON.parse(message.data)[0].value;
  console.log(`Received peer API key: ${peerAPIkey}`);
  const peer = new evrythng.Device(peerAPIkey);

  offerPropertyWs.onmessage = async (message) => {
    const offer = new RTCSessionDescription(JSON.parse(JSON.parse(message.data)[0].value));
    console.log("Received peer's offer");
    await peerConnection.setRemoteDescription(offer);
    console.log("Set peer's offer as remote session description");

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

    const answer = await peerConnection.createAnswer();
    peerConnection.setLocalDescription(answer);
    console.log("Set answer as local session description");

    await peer.init();

    // icecandidate events are fired as soon as the local description is set
    peerConnection.onicecandidate = (event) => {
      console.log("New local ICE candidate");
      peer.property('icecandidate').update(JSON.stringify(event.candidate));
      console.log("Local ICE candidate sent to peer");
    };

    peer.property('answer').update(JSON.stringify(answer));
    console.log("Answer sent to peer");
  };
  
  peerConnection.ontrack = (event) => {
    receiverQRcode.hidden = true;
    video.hidden = false;
    video.srcObject = event.streams[0];
    console.log('Received remote stream');
  };

  peerConnection.oniceconnectionstatechange = () => {
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

  peerConnection.onicegatheringstatechange = (event) => {
    console.log(event);
  };
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
function handleFirstPlay(event) {
  if (!hasPlayed) {
    console.log("Video has started playing");
    hasPlayed = true;
    let vid = event.target;
    vid.onplay = null;  // remove handler from video element
  }
}

function stopSharedVideo() {
  if (peerConnection) {
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
  }
  video.removeAttribute("srcObject");
  video.hidden = true;
  receiverQRcode.hidden = false;
  console.log("Stopped receiving shared screen");
}