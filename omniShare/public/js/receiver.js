const video2 = document.querySelector('video#video2');
const offerInput = document.getElementById("offer");
const answerOutput = document.getElementById("answer");
const offerBtn = document.getElementById("offerBtn");
const form = document.getElementById("form");

let remoteStream;

const servers = {
  iceServers: [
    {
      urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
    },
  ],
  iceCandidatePoolSize: 10,
};
let pc2 = new RTCPeerConnection(servers);

pc2.onicecandidate = e => {
  console.log("New ICE candidate, reprinting SDP: " + JSON.stringify(pc2.localDescription));
  answerOutput.innerText = JSON.stringify(pc2.localDescription);
  form.style.display = "none";
}

pc2.onaddstream = function(e) {
  remoteStream = e.stream;
  video2.srcObject = remoteStream;
  console.log(remoteStream)
  console.log('Received remote stream');
};

offerBtn.onclick = async () => {
  const offer = offerInput.value;
  if (offer) {
    console.log("Setting offer: " + offer);
    await pc2.setRemoteDescription(JSON.parse(offer));
    console.log("Offer set!");
    const answer = await pc2.createAnswer();
    pc2.setLocalDescription(answer);
  }
}