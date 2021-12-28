function errorHandler(context) {
  return function(error) {
    trace('Failure in ' + context + ': ' + error.toString);
  };
}

function noAction() {
}

function videocall(stream, handler) {
  let pc1 = new RTCPeerConnection();
  let pc2 = new RTCPeerConnection();

  pc1.addStream(stream);
  pc1.onicecandidate = function(event) {
    if (event.candidate) {
      pc2.addIceCandidate(new RTCIceCandidate(event.candidate),
                          noAction, errorHandler('AddIceCandidate'));
    }
  };
  pc2.onicecandidate = function(event) {
    if (event.candidate) {
      pc1.addIceCandidate(new RTCIceCandidate(event.candidate),
                          noAction, errorHandler('AddIceCandidate'));
    }
  };
  pc2.onaddstream = function(e) {
    handler(e.stream);
  };
  pc1.createOffer(function(desc) {
    pc1.setLocalDescription(desc);
    pc2.setRemoteDescription(desc);
    pc2.createAnswer(function(desc2) {
      pc2.setLocalDescription(desc2);
      pc1.setRemoteDescription(desc2);
    }, errorHandler('pc2.createAnswer'));
  }, errorHandler('pc1.createOffer'));
}

