const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

const evrythng = require("evrythng");
evrythng.setup({
  apiVersion: 1,
});

const trustedAppKey = "yourTrustedAppApiKey";
const evrythngApp = new evrythng.TrustedApplication(trustedAppKey);
const projectId = "VTcMsCxcV8PsGff9AC4saEpb";

exports.generateUID = functions.https.onRequest((request, response) => {
  const name = request.query.name;
  functions.logger.info("UID requested from " + name);
  const payload = {name: name};
  const params = {project: projectId};
  evrythngApp.thng().create(payload, {params}).then((thng) => {
    functions.logger.info(`Created sender thng with ID: ${thng.id}`);
    response.set("Access-Control-Allow-Origin", "https://omnia-iot.com");
    response.send({
      thngId: `${thng.id}`,
    });
  });
});
