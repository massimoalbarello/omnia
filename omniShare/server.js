const express = require("express"),
      app = express(),
      fs = require("fs"),
      path = require("path"),
      https = require("https");


const certfile = fs.readFileSync(path.join(__dirname, "cert", "cert.pem"));
const keyfile = fs.readFileSync(path.join(__dirname, "cert", "key.pem"));

const port = 6969;
const localIp = "127.0.0.1";
const passphrase = "lasocietadellarete";

const secureServer = https.createServer({ cert: certfile, key: keyfile, passphrase: passphrase }, app);

app.set("view engine", "ejs");

app.get('/', (req, res) => {
    res.render('root.ejs', {
        sender: `https://${localIp}:${port}/sender.html`,
        receiver: `https://${localIp}:${port}/receiver.html`,
        scanner: `https://${localIp}:${port}/scanner.html`
    })
});

app.use(express.static('public'));

secureServer.listen(port, localIp, function() {
    console.log(`Server running at https://${localIp}:${port}`);
});