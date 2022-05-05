const servers = {
    iceServers: [
      {
        urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
      },
    ]
};

let peerConnection;
let countLocalIceCandidates = 0;
let countReceivedIceCandidates = 0;
let earlyIceCandidates = [];   // store peer's ICE candidates received before remote description is set
let makingOffer = false;
let ignoreOffer = false;
let handleConnectionError;
let isPolite;

async function openPeerConnection(thngId, polite, streamer, peerThngId, handleTrackEvent, connectionErrorHanlder) {
        
    await openChannel(thngId, peerThngId, signalingChannelOnMessageEventHandler);
    console.log("Channel opened");

    // initialize peer connection only once the signaling channel is setup in order not to miss any messages
    peerConnection = new RTCPeerConnection(servers); 

    makingOffer = false;
    peerConnection.onnegotiationneeded = handleNegotiationNeededEvent;

    // icecandidate events are fired as soon as the local description is set
    countLocalIceCandidates = 0;
    peerConnection.onicecandidate = handleLocalIceCandidateEvent;

    peerConnection.oniceconnectionstatechange = handleIceConnectionStateChangeEvent;

    peerConnection.onicegatheringstatechange = handleIceGatheringStateChangeEvent;

    countReceivedIceCandidates = 0;
    earlyIceCandidates = [];   // store peer's ICE candidates received before remote description is set
    ignoreOffer = false;
    isPolite = polite;

    handleConnectionError = connectionErrorHanlder;

    if (streamer) {
        console.log('Requesting local stream');
        const options = {audio: true, video: true};
        navigator.mediaDevices
            .getDisplayMedia(options)
            .then((stream) => {
                stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));
            })
            .catch(function(e) {
            alert('getDisplayMedia() failed');
            console.log('getDisplayMedia() error: ', e);
            });
    }
    else {
        peerConnection.ontrack = handleTrackEvent;
    }
}

async function signalingChannelOnMessageEventHandler(description, candidateObject) {
    try {
        if (description) {
            const offerCollision = (description.type == "offer") &&
                                    (makingOffer || peerConnection.signalingState != "stable");
        
            ignoreOffer = !isPolite && offerCollision;
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
                console.log(peerConnection.localDescription);
                sendToPeer({ description: peerConnection.localDescription });
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

// called whenever the WebRTC infrastructure needs you to start the session negotiation process anew
async function handleNegotiationNeededEvent() {
    makingOffer = true;
    await peerConnection.setLocalDescription();
    console.log(peerConnection.localDescription);
    sendToPeer({ description: peerConnection.localDescription });
    console.log("SDP sent to peer");
    makingOffer = false;
};

// called by the ICE layer once a new candidate is found
function handleLocalIceCandidateEvent({candidate}) {
    console.log(candidate);
    if (candidate) {
        countLocalIceCandidates++;
    }
    // send candidate to peer
    sendToPeer({candidate});
};

// called by the ICE layer once the ICE connection state changes
function handleIceConnectionStateChangeEvent() {
    console.log(`ICE connection state: ${peerConnection.iceConnectionState}`);
    switch(peerConnection.iceConnectionState) {
        case "connected":
            let iceTransport = peerConnection.getSenders()[0].transport.iceTransport;
            let pair = iceTransport.getSelectedCandidatePair();
            console.log(pair.local);
            console.log(pair.remote);
            break;
        case "disconnected":
        case "closed":
        case "failed":
            closePeerConnection();
            break;
        default:
            break;
    }
}

function handleIceGatheringStateChangeEvent() {
    if(peerConnection.iceGatheringState == "complete") {
        console.log(`Local ICE candidates gathering complete: ${countLocalIceCandidates} found`);
        countLocalIceCandidates = 0;
    }
    else {
        console.log(`ICE candidates gathering state changed: ${peerConnection.iceGatheringState}`);
    }
}

// send peer's ICE candidate to local ICE layer
function addIceCandidate(candidateObject) {
    if (candidateObject) {
        const iceCandidate = new RTCIceCandidate(candidateObject);
        console.log(iceCandidate);
        peerConnection.addIceCandidate(iceCandidate);
        console.log("Remote candidate passed to ICE layer")
        countReceivedIceCandidates++;
    }
    else {
        console.log(`Received a total of ${countReceivedIceCandidates} valid ICE candidates from peer`);
        countReceivedIceCandidates = 0;
    }
}

function closePeerConnection() {
    peerConnection.onicecandidate = null;
    peerConnection.oniceconnectionstatechange = null;
    peerConnection.onicegatheringstatechange = null;
    peerConnection.onnegotiationneeded = null;
    peerConnection.close();
    peerConnection = null;
    console.log("Peer connection closed")

    countLocalIceCandidates = 0;
    countReceivedIceCandidates = 0;
    earlyIceCandidates = [];
    makingOffer = false;
    ignoreOffer = false;

    closeChannel();

    handleConnectionError();
}