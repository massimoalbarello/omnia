class SignalingChannel {
    constructor(thngId, deviceApiKey) {
        //WS used to receive remote SDP and ICE candidates from peer
        this.localEndUrl = `wss://ws.evrythng.com:443/thngs/${thngId}/properties/signalingchannel?access_token=${deviceApiKey}`;
        this.localEnd;
        
        evrythng.setup({
            apiVersion: 1
        });

        this.remoteEnd;
    }

    async setupChannel(handler, peerAPIkey) {
        this.remoteEnd = new evrythng.Device(peerAPIkey);
        await this.remoteEnd.init();
        console.log(`Remote end of the signaling channel opened`);

        return new Promise((resolve, reject) => {
            this.localEnd = new WebSocket(this.localEndUrl);
            this.localEnd.onopen = () => {
                console.log("Local end of the signaling channel opened");
                resolve();
            };
            this.localEnd.onerror = (error) => {
                console.log("Error on the local end of the channel: " + error);
                reject();
            }; 
            this.localEnd.onclose = () => {
                console.log("Local end of the signaling channel closed");
            };
            this.localEnd.onmessage = (message) => {
                let { description, candidate: candidateObject } = JSON.parse(JSON.parse(message.data)[0].value);
                handler(description, candidateObject);
            };
        });
    }

    sendToPeer(message) {
        this.remoteEnd.property('signalingchannel').update(JSON.stringify(message));
    }

    closeChannel() {
        this.localEnd.close();
        this.localEnd = null;
    }
}