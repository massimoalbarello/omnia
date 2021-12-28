const video1 = document.querySelector('video#video1');
const video2 = document.querySelector('video#video2');

let localStream;
let remoteStream;

function gotStream(stream) {
  console.log('Received local stream');
  video1.srcObject = stream;
  localStream = stream;
  console.log('Starting call');
  new videocall(localStream, gotremoteStream);
}

function gotremoteStream(stream) {
  remoteStream = stream;
  video2.srcObject = stream;
  console.log(stream)
  console.log('Received remote stream');
}


console.log('Requesting local stream');
const options = {audio: false, video: true};
navigator.mediaDevices
    .getUserMedia(options)
    .then(gotStream)
    .catch(function(e) {
      alert('getUserMedia() failed');
      console.log('getUserMedia() error: ', e);
    });

