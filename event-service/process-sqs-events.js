const utils = require('./utils');

module.exports.main = async (event) => {

    console.log('event -> ', event);

    await Promise.all(event.Records.map(async event => {        
        console.log(event);        
        const {body} = event;
        const parsedBody = body ? JSON.parse(body) : {};

        if (parsedBody.success) {
            await utils.processBlockchainResults(parsedBody);
            console.log('Blockchain processing success!', parsedBody);            
        } else {
            console.log('Blockchain processing failed!:', parsedBody);
        }
    }));

};