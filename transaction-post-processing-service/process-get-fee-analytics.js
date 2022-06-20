const { publishSqs } = require("./publish-sqs");
const AWS = require('aws-sdk');
const { nanoid } = require('nanoid');
const CONTRACTS_SERVICE_POST_SQS = 'https://sqs.us-east-2.amazonaws.com/015753658222/nearPendingQueue.fifo';
const docClient = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {

  await Promise.all(event.Records.map(async event => { 
    
    console.log(event);        
    const {body} = event;
    const parsedBody = body ? JSON.parse(body) : {};

    try{            
      
      const transaction = await createTransaction(parsedBody, 'insert_analytics');

      const getTransactionFeeMessage = createGetTransactionFeeMessage(transaction.jobId, transaction.senderWalletId, transaction.appId, transaction.actionId);
      
      await publishSqs(getTransactionFeeMessage, CONTRACTS_SERVICE_POST_SQS, "contract_service");
      
    } catch(err) {
      console.log('Get Trasaction Fee processing failed!', err);
    }
  }));
}

const generateJobId = (id) => id.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

const createTransaction = async (params, type=null) => {  
  const transactionId = nanoid();
  const jobId = generateJobId(transactionId);

  const tableParams = {
    TableName: 'near-transactions',
    Item: {
        "transactionId": transactionId,
        "senderWalletId": params.senderWalletId,
        "receiverWalletId": params.receiverWalletId,
        "transactionValue": params.transactionValue,
        "transactionItemId": params.transactionItemId,
        "type": type,
        "operation": params.type,
        "tags": params.tags,
        "jobId": jobId,
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
