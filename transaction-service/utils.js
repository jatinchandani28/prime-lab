const { SQS, SSM } = require('aws-sdk');
const { nanoid } = require('nanoid');
const jwt = require("jsonwebtoken");
const AWS = require("aws-sdk");
const docClient = new AWS.DynamoDB.DocumentClient();
const { generateSeedPhrase } = require('./near-utils');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');


const CONTRACTS_SERVICE_POST_SQS = 'https://sqs.us-east-2.amazonaws.com/015753658222/nearPendingQueue.fifo';

const send = (statusCode, data) => {
  const responseHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': true,
  };

  return {
    statusCode,
    headers: responseHeaders,
    body: JSON.stringify(data, null, 2),
  };
};

const publishBase = async (data, queueUrl, messageGroupId) => {
  try {
    console.log('Publishing on SQS:', queueUrl, data);

    const sqs = new SQS({
      region: process.env.REGION,
    });

    const message = {
      MessageBody: JSON.stringify(data),
      QueueUrl: queueUrl,
    }

    if(messageGroupId)
      message.MessageGroupId = messageGroupId;

    const response = await sqs.sendMessage(message).promise();

    console.log('Message published on SQS:', queueUrl, response);

  } catch (err) {
    console.log('Error when publishing on SQS:', queueUrl, err);
  }
};

const publish = async (data, queueUrl) => {
  await publishBase(data, queueUrl, 'contract-server');
}

const getWallet = async (walletId) => {
  const docClient = new AWS.DynamoDB.DocumentClient();

  const tableParams = {
    KeyConditionExpression: 'walletId = :walletId ',
    ExpressionAttributeValues: { ':walletId': walletId },
    TableName: 'near-wallets',
  };
  return docClient.query(tableParams).promise();
};

const storeKeys = async (params) => {
  const docClient = new AWS.DynamoDB.DocumentClient();
  const secrets = generateSeedPhrase();
  const tableParams = {
    TableName: 'near-wallets-private',
    Item: {
      walletId: params.senderWalletId,
      userId: params.walletId,
      pubKey: secrets.publicKey,
      privateKey: secrets.secretKey,
      seedPhrase: secrets.seedPhrase,
      status: params.status ? params.status : 'complete',
      blockchainStatus: 'pending',
      created: +new Date(),
      updated: +new Date(),
    },
  };
  await docClient.put(tableParams).promise();
  return secrets;
};

const createAccountMessage = async (transaction) => {

  return {
    id: transaction.jobId,
    operation: 'execute',
    contract: 'near',
    method: 'create_account',
    args: {
      new_account_id: transaction.senderWalletId,
      new_public_key: transaction.publicKey,
    },
    sender: transaction.senderWalletId,
    tags: {
      app_id: transaction.appId,
      action_id: transaction.actionId,
      user_id: transaction.senderWalletId
    }
  };
};

const createNFTCreateSeriesMessage = async (transaction, reqParams) => {

  const walletIdHash = await storeHash({ input: reqParams.walletId});

  return {
    "id": transaction.jobId,
    "operation": "execute",
    "contract": "nft.nearapps.near",
    "method": "nft_series_create",
    "sender": transaction.senderWalletId,
    "args": {
      "name": reqParams.name,
      "capacity": reqParams.capacity,
      "creator": transaction.senderWalletId
    },
    "tags": {
      "app_id": reqParams.appId,
      "action_id": reqParams.actionId,
      "user_id": walletIdHash.id
    }
  };
};

const createAccount = async (params) => {

  const newTransaction = await createTransaction(params);
  console.log('newTransaction -> ', newTransaction);

  const walletData = await getWallet(params.senderWalletId);
  console.log('walletData -> ', walletData);

  const { Items, Count } = walletData;

  if (Count) {
    const [walletObj] = Items;
    newTransaction.userId = walletObj.userId;
  }
  console.log('params after userid -> ', newTransaction);

  // Store keys
  const { publicKey } = await storeKeys(newTransaction);

  newTransaction.publicKey = publicKey;

  const createAccountObj = await createAccountMessage(newTransaction);
  console.log('baseObj---> ', createAccountObj);

  await publish(createAccountObj, CONTRACTS_SERVICE_POST_SQS);

  return newTransaction;
};

const createNFTSeries = async (params) => {

  const newTransaction = await createTransaction(params);

  const newNFTSeries = await createNFTCreateSeriesMessage(newTransaction, params);
  console.log('baseObj---> ', newNFTSeries);
  
  await publish(newNFTSeries, CONTRACTS_SERVICE_POST_SQS);
  return newTransaction;
};

const sendToken = async (params) => {
  // not implemented
};

const createMintNftMessage = async (transaction, reqParams) => {

  const walletIdHash = await storeHash({ input: transaction.senderWalletId});

  return {
    "id": transaction.jobId,
    "operation": "execute",
    "contract": "nft.nearapps.near",
    "method": "nft_series_mint",
    "sender": transaction.senderWalletId,
    "deposit": reqParams.deposit,
    "args": {
      "series_id": reqParams.seriesId,
      "token_owner_id": transaction.senderWalletId,
      "token_metadata": {
        "title": reqParams.title,
        "description": reqParams.description,
        "media": reqParams.media,
        "media_hash": reqParams.mediaHash,
        "copies": reqParams.copies,
        "issued_at": reqParams.issuedAt,
        "expires_at": reqParams.expiresAt,
        "starts_at": reqParams.startsAt,
        "updated_at": reqParams.updatedAt,
        "extra": reqParams.extra,
        "reference": reqParams.reference,
        "reference_hash": reqParams.referenceHash
      }
    },
    "tags": {
      "app_id": reqParams.appId,
      "action_id": reqParams.actionId,
      "user_id": walletIdHash.id
    }
  };
};


const mintNftSeries = async (params) => {
  const newTransaction = await createTransaction(params);
  const mintNft = await createMintNftMessage(newTransaction, params);
  console.log('baseObj---> ', mintNft);
  
  await publish(mintNft, CONTRACTS_SERVICE_POST_SQS);
  return newTransaction;
}

const createTransaction = async (params, type=null) => {
  
  const newTransID = nanoid();
  const job_id = newTransID.replace(/[^a-zA-Z0-9]/g, '');
  const job_id_lcase = job_id.toLowerCase();

  const tableParams = {
    TableName: 'near-transactions',
    Item: {
        "transactionId": newTransID,
        "senderWalletId": params.senderWalletId,
        "receiverWalletId": params.receiverWalletId,
        "transactionValue": params.transactionValue,
        "transactionItemId": params.transactionItemId,
        "type": type? type: params.type,
        "operation": params.type,
        "fileHash": params.fileHash,
        "tags": params.tags,
        "jobId": job_id_lcase,
        "status": params.status ? params.status : 'complete',
        "contractData": params.contractData,
        "blockchainStatus": "pending",
        "parentId": params.parentId,
        "transactionUrl": params.transactionUrl,
        "appId": params.appId,
        "actionId": params.actionId,
        "created": +new Date,
        "updated": +new Date,
        "requestParams": JSON.stringify(params)
    }
  };
  console.log(tableParams);
  await docClient.put(tableParams).promise();
  return tableParams.Item;
};

const createNftSeriesAndMint = async (params) => {

  // we first create the parent transaction
  const nftSerieTransaction = await createTransaction(params, 'nft_series_create');
  console.log('nftSerieTransaction---> ', nftSerieTransaction);

  // then we create the child transaction
  params.parentId = nftSerieTransaction.transactionId;
  const nftMint = await createTransaction(params, 'nft_series_mint');
  console.log('nftMint---> ', nftMint);

  //the series goes to the blockchain, the child will follow when the series is created in the blockchain
  const nftSeriesMessage = await createNFTCreateSeriesMessage(nftSerieTransaction, params);
  console.log('baseObj---> ', nftSeriesMessage);
  
  await publish(nftSeriesMessage, CONTRACTS_SERVICE_POST_SQS);

  return nftSerieTransaction;
};

const processOperation = async (params) => {
  if (!params.type || !processObjMapping[params.type]) { return; }

  //TODO: improve this, quick fix now, override appId and hashId
  await hashDataForBlockChain(params);


  return processObjMapping[params.type](params);
};

const toTimestamp = (strDate) => {
  return Date.parse(strDate);
}

const preapareNanoHash = () => nanoid().replace(/[^a-zA-Z0-9]/g, '').toLowerCase();


const hashDataForBlockChain = async (params) => {
  const newAppId = preapareNanoHash();
  const newActionId = preapareNanoHash();
  const newReference = preapareNanoHash();
  const newMedia = preapareNanoHash();

  await Promise.all([
    saveHidden(newActionId, params.actionId),
    saveHidden(newReference, params.reference),
    saveHidden(newMedia, params.media)
   ]);

  params.appId = newAppId;
  params.actionId = newActionId;

  if(params.reference) {
      params.reference = newReference;
  }
  if(params.media){
      params.media = newMedia;
  }

};

const logFileOperation = async (params) => {

  const transaction = await createTransaction(params, 'log_file');

  const getTransactionFeeMessage = createGetTransactionFeeMessage(transaction.jobId, transaction.senderWalletId, transaction.appId, transaction.actionId);
  
  await publish(getTransactionFeeMessage, CONTRACTS_SERVICE_POST_SQS, "contract_service");

  return transaction;
};

const createGetTransactionFeeMessage = (jobId, senderWalletId, appId, actionId) => {

  return {
    "id": jobId,
    "operation": "execute",
    "contract": "send-near.nearapps.near",
    "method": "send_logged",
         "deposit": "0.00072",
    "args": {
      "receiver": senderWalletId,
      "amount": "700000000000000000000", //"0.0007" Near
      "nearapps_tags": {
        "app_id": appId,
        "action_id": actionId,
        "user_id": "v2.nearapps.near"
      }
    },
    "tags": {
      "app_id": appId,
        "action_id": actionId,
        "user_id": "v2.nearapps.near"
    }
  }
}


const processObjMapping = {
  'send_token': sendToken,
  'create_account': createAccount,
  "create_file": logFileOperation,
  "delete_file": logFileOperation,
  "grant_file_access": logFileOperation,
  "revoke_file_access": logFileOperation,
  'nft_series_create': createNFTSeries,
  'nft_series_mint': mintNftSeries,
  'create_and_mint_nft': createNftSeriesAndMint
};

const verifyAccessToken = async (req) => {
  try {
    let token = req.headers.Authorization || req.headers.authorization;
    if (!token) {
      throw new Error('Access Token is required.');
    }
    token = token.replace('Bearer ', '');
    const secret = await getParameter("SECRET_KEY");
    const userInfo = await jwt.verify(token, secret);
    userInfo.walletId = userInfo.walletId || userInfo.walletName;
    userInfo.walletName = userInfo.walletId || userInfo.walletName;
    return userInfo;
  } catch (err) {
    console.error(`verifyAccessToken: ${err.message}`);
    throw err;
  }
};

const getParameter = async (name, decrypt) => {
  const ssm = new SSM();
  const result = await ssm.getParameter({ Name: name, WithDecryption: decrypt }).promise();
  return result.Parameter.Value;
}

const storeHash = async (params) => {

  let response = { id: nanoid() };
  try{
    const URL = 'https://api.dev.nearlogin.io/hashes';
    const apiHeaders = {
      'Content-Type': 'application/json'
    };
    response = await axios.post(`${URL}`, JSON.stringify(params), {
      headers: apiHeaders,
    });
 }catch(err){
   console.log(err);
 }

  return response;
};


const saveHidden = async (hidden, value) => {
  if(!value) return;
  const tableParams = {
    TableName: 'near-hidden',
    Item: {
        "id": hidden,
        "value": value,
    }
  };
  console.log("savving to near hidden --> ", tableParams);
  await docClient.put(tableParams).promise();
  return tableParams.Item;
};

module.exports = {
  send,
  processOperation,
  toTimestamp,
  verifyAccessToken
};
