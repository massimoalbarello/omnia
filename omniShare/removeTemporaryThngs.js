const evrythng = require("evrythng");

evrythng.setup({
    apiVersion: 1
});

const TRUSTED_APPLICATION_API_KEY = 'yourTrustedAppApiKey';
const evrythngApp = new evrythng.TrustedApplication(TRUSTED_APPLICATION_API_KEY);

evrythngApp.thng().setFilter('name=temporarySender').delete();
evrythngApp.thng().setFilter('name=temporaryReceiver').delete();

