let remoteEnd;
let localEnd;

async function openChannel(thngId, deviceApiKey, peerAPIkey, handleSignalingChannelOnMessageEvent) {
    //WS used to receive remote SDP and ICE candidates from peer
    const localEndUrl = `wss://ws.evrythng.com:443/thngs/${thngId}/properties/signalingchannel?access_token=${deviceApiKey}`;
    
    evrythng.setup({
        apiVersion: 1
    });

    remoteEnd = new evrythng.Device(peerAPIkey);
    await remoteEnd.init();
    console.log(`Remote end of the signaling channel opened`);
    
    await openLocalEndWS(localEndUrl, handleSignalingChannelOnMessageEvent);
}

function openLocalEndWS(localEndUrl, handleSignalingChannelOnMessageEvent) {
    localEnd = new WebSocket(localEndUrl);
    localEnd.onclose = () => {
        console.log("Local end of the signaling channel closed");
    };
    localEnd.onmessage = (message) => {
        const { description, candidate: candidateObject } = JSON.parse(JSON.parse(message.data)[0].value);
        handleSignalingChannelOnMessageEvent(description, candidateObject);
    };
    return new Promise((resolve, reject) => { 
        localEnd.onopen = () => {
            console.log("Local end of the signaling channel opened");
            resolve();
        };
        localEnd.onerror = (error) => {
            console.log("Error on the local end of the channel: " + error);
            reject();
        };
    });
}

function sendToPeer(message) {
    remoteEnd.property('signalingchannel').update(JSON.stringify(message));
}

function closeChannel() {
    localEnd.close();
    localEnd = null;
}