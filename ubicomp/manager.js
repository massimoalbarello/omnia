const express = require('express');
const cors = require('cors');
const WS = require('ws');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

var corsOptions = {
    origin: '*',
}
app.use(cors(corsOptions));

let accounts = {
    "mez": {},
};

app.get('/', (req, res) => {
    res.send('GET request to the homepage');
})

app.post('/', (req, res) => {
    const {account, ...peripheralData} = req.body;
    const uid = generateUID();
    addPeripheral(account, uid, peripheralData);
    res.send({
        id: uid,
        signalingChannel: "127.0.0.1:2000"

    });
})

app.listen(3000, () => {
  console.log(`Server started`);
});

function addPeripheral(account, uid, peripheralData) {
    accounts[account][uid] = peripheralData;
    accounts[account][uid]["candidates"] = [];
    // console.log(accounts);
}

function generateUID() {
    return Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1);
}

const wss = new WS.WebSocketServer({ port: 2000 });

wss.on('connection', (ws) => {
  ws.on('message', (message) => {
        const {account, id, candidate, sdp} = JSON.parse(message.toString());
        if (candidate || candidate === null) {
            // console.log(candidate);
            accounts[account][id]["candidates"].push(candidate);
        }
        else {
            // console.log(sdp);
            accounts[account][id]["sdp"] = sdp;
        }
    });
    setTimeout(() => {
        console.log(JSON.stringify(accounts, null, 2));
    }, 3000);
});

