const { executeCommand } = require('./execute-command');
const { getSecret } = require("./sm");
const AWS = require('aws-sdk');
const NEAR_DIR = '/opt/nodejs/node_modules/near-cli/bin';
const CONTRACT_NAME = "analytics.nearapps.near";
const NETWORK = 'mainnet';

exports.handler = async (event) => {

  await Promise.all(event.Records.map(async event => { 
    
    console.log(event);        
    const {body} = event;
    const params = body ? JSON.parse(body) : {};

    try {
      params.operation = params.operation || params.type;  
      params.senderWalletSeedPhrase = await getSenderWalletSeedPhrase(params.senderWalletId);

      if(params.senderWalletSeedPhrase === '')
        throw new Error('Wallet or SeedPhrase not found.');

      return await insertAnalytics(params);      
    } catch(err) {
      console.log('Analytics processing failed!', err);
    }
  }));
}

const insertAnalytics = async (params) => {
  
  console.log('Insert Analytics >>>', params.operation);  

  await executeCommand(`NEAR_ENV=${NETWORK} ${NEAR_DIR}/near generate-key ${params.senderWalletId} --seedPhrase="${params.senderWalletSeedPhrase}"`);

  await executeCommand(`ls /tmp/.near-credentials/${NETWORK}/ -a`);

  const blockchainResult = await executeCommand(`NEAR_ENV=${NETWORK} ${NEAR_DIR}/near call ${CONTRACT_NAME} log_event '{"time": ${ +new Date()}, "operation": "${params.operation}","transaction_hash":"${params.transactionHash}"}' --accountId ${params.senderWalletId} --amount --gas 6000000000000`);
 
  console.log('Success <<<', blockchainResult);  

  return blockchainResult;
};

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
