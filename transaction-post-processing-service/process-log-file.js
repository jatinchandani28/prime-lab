const { executeCommand } = require("./execute-command");
const AWS = require('aws-sdk');
const NEAR_DIR = '/opt/nodejs/node_modules/near-cli/bin';
const CONTRACT_NAME = "file.nearapps.near";
//"dev-1646119647496-71951969367549";
const NETWORK = 'mainnet';

exports.handler = async (event) => {

  await Promise.all(event.Records.map(async event => { 
    
    console.log(event);
    const {body} = event;
    const params = body ? JSON.parse(body) : {};
    try
    {      
      params.senderWalletSeedPhrase = await getSenderWalletSeedPhrase(params.senderWalletId);
      if(params.senderWalletSeedPhrase === '')
            throw new Error('Wallet or SeedPhrase not found.');        

      console.log('Log File >>>');

      await executeCommand(`NEAR_ENV=${NETWORK} ${NEAR_DIR}/near generate-key ${params.senderWalletId} --seedPhrase="${params.senderWalletSeedPhrase}"`);

      await executeCommand(`ls /tmp/.near-credentials/${NETWORK}/ -a`);

      const blockchainResult = await executeCommand(`NEAR_ENV=${NETWORK} ${NEAR_DIR}/near call ${CONTRACT_NAME} log_event '{"time": ${+new Date}, "operation": "${params.operation}","hash":"${params.fileHash}"}' --accountId ${params.senderWalletId} --amount --gas 6000000000000`);
    
      console.log('Success <<<', blockchainResult);  

      return blockchainResult;


    }catch(err){
      console.log('File Operation processing failed!', err);
    }
  }));
}

const getSenderWalletSeedPhrase = async (walletId) => {

  const wallet = await getWalletPrivate(walletId);

  if(!wallet){
   console.log('Wallet not found.', walletId);
   return "";
  }
  return wallet.seedPhrase;
}

const getWalletPrivate = async (walletId) => {

  const docClient = new AWS.DynamoDB.DocumentClient();

  const tableParams = {
    KeyConditionExpression: 'walletId = :walletId ',
    ExpressionAttributeValues: { ':walletId': walletId },
    TableName: 'near-wallets-private',
  };

  const result = await docClient.query(tableParams).promise();

  return result.Count ? result.Items[0] : null;
};
