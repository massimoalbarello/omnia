const evrythng = require("evrythng");

evrythng.setup({
    apiVersion: 1
});

const TRUSTED_APPLICATION_API_KEY = 'gTibS5rdLBrH38ABAREv4WnvKvD0bqxGTdJ1ikybjRCTLy6uVtmUMsGT1zLi1V4wylWBfV8PHvYK9JHa';
const evrythngApp = new evrythng.TrustedApplication(TRUSTED_APPLICATION_API_KEY);

evrythngApp.thng().setFilter('name=temporarySender').delete();
evrythngApp.thng().setFilter('name=temporaryReceiver').delete();

