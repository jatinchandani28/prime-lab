const AWS = require('aws-sdk');
const _ = require("underscore");
const { buildUpdateExpression }  = require('./build-update-expression');

const CONTRACTS_SERVICE_POST_SQS = '/contract-service/sqs/nearPendingQueue/arn';

exports.handler = async (event) => {
    await Promise.all(event.Records.map(async event => {        
        console.log(event);        
        const {body} = event;
        const parsedBody = body ? JSON.parse(body) : {};

        try{
            await processPostTransactionResults(parsedBody);
            console.log('Post Transaction processing success!', parsedBody);            
        } catch {
            console.log('Post Transaction processing failed!:', parsedBody);
        }
    }));
};

const processPostTransactionResults = async(transaction) =>{

    if(transaction.type === 'create_account'){
        await updateWalletPrivateAndWallet(transaction);
    } 
    
    else if(transaction.type === 'nft_series_create'){
        await processChildTransaction(transaction);
    }
}

const processChildTransaction = async (transaction) => {

    const childTransaction = await getTransactionByParentId(transaction.transactionId);

    if(!childTransaction){
        console.log('There is no child transaction to process.');
        return;
    }

    let requestParams = {};
    
    try{
        requestParams = JSON.parse(childTransaction.requestParams);
    }catch(err){
        console.log('The transaction request parameters could not be recovered.', err);
        return;
    }

    if(childTransaction.type === 'nft_series_mint')
        await mintNftSeries(transaction, childTransaction, requestParams);
}

const updateWalletPrivateAndWallet = async (transactionObj) => {

    const updateObject = { blockchainStatus: 'complete', updated: +new Date };
  
    try {
      await updateWalletPrivate(transactionObj.senderWalletId, updateObject);
    } catch(err) {
      console.log('Error updating near-wallets-private', transactionObj, err);
    }
  
    try {
      await updateWallet(transactionObj.senderWalletId, updateObject);
    } catch(err) {
      console.log('Wallet doesn\'t exist on near-wallets', transactionObj.senderWalletId, err)
    }
  }

const getTransactionByParentId = async (parentId) => {

    console.log('getTransactionByParentId ---> ', parentId);
  
    const docClient = new AWS.DynamoDB.DocumentClient();
    const tableParams = {
      KeyConditionExpression: "parentId = :parent_id ",
      ExpressionAttributeValues: { ":parent_id": parentId },
      TableName: "near-transactions",
      IndexName: "parentId-created-Index",
    };
  
    console.log('getTransactionByParentId tableParams -> ', tableParams);
  
    const result = await docClient.query(tableParams).promise();
    
    return result.Count ? result.Items[0] : null;
};

const getParameter = async (name, decrypt) => {  
    const ssm = new AWS.SSM();
    const result = await ssm.getParameter({ Name: name, WithDecryption: decrypt }).promise();
    return result.Parameter.Value;
}

const publish = async (data, queueUrl) => {  
    try {
      console.log('Publishing on SQS:', queueUrl, data);
      
      const sqs = new AWS.SQS({
        region: process.env.REGION,
      });
  
      const response = await sqs.sendMessage({
        MessageBody: JSON.stringify(data),
        MessageGroupId: 'contract-server',
        QueueUrl: queueUrl,
      }).promise();
  
      console.log('Message published on SQS:', queueUrl, response);
  
    } catch (err) {
      console.log('Error when publishing on SQS:', queueUrl, err);
    }
  };

const mintNftSeries = async (parentTransaction, transactionObj, params) => {
    const mintNft = createMintNftMessage(parentTransaction, transactionObj, params);
    console.log('baseObj---> ', mintNft);
  
    const contractsServicePostSQS = await getParameter(CONTRACTS_SERVICE_POST_SQS);
    await publish(mintNft, contractsServicePostSQS);
    return transactionObj;
}

const createMintNftMessage = (parentTransaction, transaction, reqParams) => {
    return {
      "id": transaction.jobId,
      "operation": "execute",
      "contract": "nft.nearapps.near",
      "method": "nft_series_mint",
      "sender": transaction.senderWalletId,
      "deposit": reqParams.deposit,
      "args": {
        "series_id": parentTransaction.contractOutArgs,
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
        "user_id": transaction.senderWalletId
      }
    };
  };
  
  const updateWallet = async (walletId, data) => {

    const docClient = new AWS.DynamoDB.DocumentClient();
  
    const tableParams = {
      TableName: "near-wallets",
      Key: {
          "walletId": walletId
      },
      ...buildUpdateExpression(data)
    };  
  
    return docClient.update(tableParams).promise();
  };
  
  const updateWalletPrivate = async (walletId, data) => {
  
    const docClient = new AWS.DynamoDB.DocumentClient();
  
    const tableParams = {
      TableName: "near-wallets-private",
      Key: {
          "walletId": walletId
      },
      ...buildUpdateExpression(data)
    };  
  
    return docClient.update(tableParams).promise();
  };
