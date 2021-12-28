const video1 = document.getElementById("video1");
const answerInput = document.getElementById("answer");
const offerOutput = document.getElementById("offer");
const answerBtn = document.getElementById("answerBtn");
const form = document.getElementById("form");

let localStream;

function gotStream(stream) {
  console.log('Received local stream');
  video1.srcObject = stream;
  localStream = stream;
  console.log('Starting call');
  videocall(localStream);
}

function videocall(stream) {
  const pc1 = new RTCPeerConnection();
  pc1.addStream(stream);

  pc1.onicecandidate = e => {
    console.log("New ICE candidate, reprinting SDP: " + JSON.stringify(pc1.localDescription));
    offerOutput.innerText = JSON.stringify(pc1.localDescription);
  }
  pc1.createOffer().then(o => pc1.setLocalDescription(o)).then(a => {
    console.log("Set successfully!");
  });

  answerBtn.onclick = () => {
    const answer = answerInput.value;
    if (answer) {
      console.log("Setting answer: " + answer);
      pc1.setRemoteDescription(JSON.parse(answer));
      answerInput.value = "";
      offerOutput.innerText = "";
      form.style.display = "none";
    }
  }

}

console.log('Requesting local stream');
const options = {audio: false, video: true};
navigator.mediaDevices
    .getDisplayMedia(options)
    .then(gotStream)
    .catch(function(e) {
      alert('getUserMedia() failed');
      console.log('getUserMedia() error: ', e);
    });

