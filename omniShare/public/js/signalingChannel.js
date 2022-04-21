let remoteEnd;
let localEnd;

function openChannel(thngId, deviceApiKey, peerAPIkey, callback) {
    //WS used to receive remote SDP and ICE candidates from peer
    const localEndUrl = `wss://ws.evrythng.com:443/thngs/${thngId}/properties/signalingchannel?access_token=${deviceApiKey}`;
    
    evrythng.setup({
        apiVersion: 1
    });

    remoteEnd = new evrythng.Device(peerAPIkey);
    console.log(`Remote end of the signaling channel opened`);
    
    localEnd = new WebSocket(localEndUrl);
    localEnd.onopen = () => {
        console.log("Local end of the signaling channel opened");
    };
    localEnd.onerror = (error) => {
        console.log("Error on the local end of the channel: " + error);
    }; 
    localEnd.onclose = () => {
        console.log("Local end of the signaling channel closed");
    };
    localEnd.onmessage = (message) => {
        const { description, candidate: candidateObject } = JSON.parse(JSON.parse(message.data)[0].value);
        callback(description, candidateObject);
    };
}

function sendToPeer(message) {
    remoteEnd.init().then(() => {
        remoteEnd.property('signalingchannel').update(JSON.stringify(message));
    });
}

function closeChannel() {
    localEnd.close();
    localEnd = null;
}