const express = require("express"),
      app = express(),
      fs = require("fs"),
      path = require("path"),
      https = require("https");

const evrythng = require("evrythng");

evrythng.setup({
    apiVersion: 1
});

const certfile = fs.readFileSync(path.join(__dirname, "cert", "cert.pem"));
const keyfile = fs.readFileSync(path.join(__dirname, "cert", "key.pem"));

const port = 6969;
const localIp = "127.0.0.1";
const passphrase = "passphrase_used_to_create_certificate";

const secureServer = https.createServer({ cert: certfile, key: keyfile, passphrase: passphrase }, app);

const TRUSTED_APPLICATION_API_KEY = 'your_trusted_api_key';
const evrythngApp = new evrythng.TrustedApplication(TRUSTED_APPLICATION_API_KEY);
const projectId = 'VTcMsCxcV8PsGff9AC4saEpb';

evrythngApp.init().then(() => {
    evrythngApp.thng().read().then(() => {

        app.set("view engine", "ejs");

        app.get('/', (req, res) => {
            console.log("Request for root received");
            res.render('root.ejs', {
                sender: `https://${localIp}:${port}/sender.html`,
                receiver: `https://${localIp}:${port}/receiver.html`,
            })
        });

        app.get('/sender.html', async (req, res) => {
            console.log("Sender web app requested");
            const payload = { name: 'Temporary Sender' };
            const params = { project: projectId };
            const thng = await evrythngApp.thng().create(payload, { params })
            console.log(`Created sender thng with ID: ${thng.id}`);
            
            res.render('../public/sender.ejs', {
                thngId: `${thng.id}`,
            })
        });

        app.get('/receiver.html', async (req, res) => {
            console.log("Receiver web app requested");
            const payload = { name: 'Temporary Receiver' };
            const params = { project: projectId };
            const thng = await evrythngApp.thng().create(payload, { params })
            console.log(`Created receiver thng with ID: ${thng.id}`);
            
            res.render('../public/receiver.ejs', {
                thngId: `${thng.id}`,
            })
        });

        app.use(express.static('public'));
    })
})

secureServer.listen(port, localIp, function() {
    console.log(`Server running at https://${localIp}:${port}`);
});