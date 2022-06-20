'use strict';
const AWS = require("aws-sdk");
const _ = require("underscore");
AWS.config.update({region: 'us-east-1'});

const constructUpdateExpressions = (inputParams) => {
  // Function to generate update expression for DynamoDB automatically based on the inputParams
  let updateExpression = '';
  const finalExpression = {};
  const expAttrNames = {};
  const expAttValues = {};
  const systemValReplacements = {
    status: 'x_status',
    type: 'x_type'
  };
  for (let attr in inputParams) {
    let emptyExpAttrNames = false;
    const replacedAttrVal = attr && systemValReplacements[attr] ? systemValReplacements[attr] : '';
    if (replacedAttrVal && !updateExpression) {
      updateExpression += `set #${replacedAttrVal} = :new_${attr}`;
    } else if (replacedAttrVal){
      updateExpression += `, #${replacedAttrVal} = :new_${attr}`;
    }
    if (!replacedAttrVal && attr && !updateExpression) {
      updateExpression += `set ${attr} = :new_${attr}`;
    } else if (!replacedAttrVal && attr){
      updateExpression += `, ${attr} = :new_${attr}`;
    }
    if (attr) {
      expAttValues[`:new_${attr}`] = inputParams[attr];
    }
    if (replacedAttrVal) {
      expAttrNames[`#${replacedAttrVal}`] = attr;
    }
  }
  if (!_.isEmpty(updateExpression)) {
    finalExpression.UpdateExpression = updateExpression;
  }
  if (!_.isEmpty(expAttrNames)) {
    finalExpression.ExpressionAttributeNames = expAttrNames;
  }
  if (!_.isEmpty(expAttValues)) {
    finalExpression.ExpressionAttributeValues = expAttValues;
  }
  return finalExpression;
};

const updateTransaction = async (transactionId, data) => {

  console.log('updateTransaction ---> ', transactionId, data);

  const docClient = new AWS.DynamoDB.DocumentClient();
  const tableParams = {
    TableName: "near-transactions",
    Key: {
        "transactionId": transactionId
    },
    ...constructUpdateExpressions(data)
  };

  console.log('updateTransaction tableParams ---> ', JSON.stringify(tableParams));

  return docClient.update(tableParams).promise();
};

const getTransactionByJobId = async (jobId) => {
  
  console.log('getTransactionByJobId ---> ', jobId);

  const docClient = new AWS.DynamoDB.DocumentClient();

  const tableParams = {
    KeyConditionExpression: "jobId = :jobId ",
    ExpressionAttributeValues: { ":jobId": jobId },
    TableName: "near-transactions",
    IndexName: "jobId-created-Index",
  };

  const result = await docClient.query(tableParams).promise();
  return result.Count ? result.Items[0] : null;
};

const processBlockchainResults = async (blockchainResult) => {

  console.log('processBlockchainResults -> ', blockchainResult);
  
  // update the record with jobId as query param
  const hashArr = blockchainResult.explorerUrl ? blockchainResult.explorerUrl.split('/') : [];

  const hashValue = hashArr && hashArr.length ? hashArr[hashArr.length - 1] : '';

  const transactionObj = await getTransactionByJobId(blockchainResult.id);
  
  console.log('transactionObj -> ', transactionObj);

  if (!transactionObj) {    
    console.log('Transaction object from DB for the job id seems to be empty!', transactionObj);
    return;
  }

  const updateObject = { 
    transactionHash: hashValue
    , contractOutArgs: blockchainResult.args
    , blockchainStatus: 'complete', updated: +new Date 
  };
  
  await updateTransaction(transactionObj.transactionId, updateObject);

  const transactionUpdated = { ...transactionObj, ...updateObject};

  if(transactionObj.type === 'create_account'){
    await publishAnalyticsMessage(transactionUpdated);
    await publishPostTransactionMessage(transactionUpdated);
  }
  
  else if(transactionObj.type === 'nft_series_create') {
    await publishAnalyticsMessage(transactionUpdated);
    await publishPostTransactionMessage(transactionUpdated);
  }

  else if(transactionObj.type === 'nft_series_mint') {
    await publishAnalyticsMessage(transactionUpdated);
  }

  else if(transactionObj.type === 'transfer_nft') {
    await publishAnalyticsMessage(transactionUpdated);
  }

  else if(transactionObj.type === 'insert_analytics') {
    await publishAnalyticsV2Message(transactionUpdated);
  }

  else if(transactionObj.type === 'log_file') {
    await publishLogFileMessage(transactionUpdated);
    await publishAnalyticsMessage(transactionUpdated);
  }

  return transactionUpdated;
}

const publishLogFileMessage = async (data) => {
  const sqsUrl = 'https://sqs.us-east-1.amazonaws.com/227200131463/callLogFile';
  await publish(data, sqsUrl);
}

const publishAnalyticsV2Message = async (data) => {
  const sqsUrl = 'https://sqs.us-east-1.amazonaws.com/227200131463/callAnalyticsV2';
  await publish(data, sqsUrl);
}

const publishAnalyticsMessage = async (data) => {
  const sqsUrl = 'https://sqs.us-east-1.amazonaws.com/227200131463/callAnalytics';
  await publish(data, sqsUrl);
}

const publishPostTransactionMessage = async (data) => {
  const sqsUrl = 'https://sqs.us-east-1.amazonaws.com/227200131463/callPostTransaction';
  await publish(data, sqsUrl);
}

const publish = async (data, queueUrl) => {
  try {
    
    console.log('Publishing on SQS:', queueUrl, data);

    const sqs = new AWS.SQS({ region: 'us-east-1' });

    const response = await sqs.sendMessage({
      MessageBody: JSON.stringify(data),
      QueueUrl: queueUrl,
    }).promise();

    console.log('Message published on SQS:', queueUrl, response);
    
  } catch (err) {
    console.log('Error when publishing on SQS:', queueUrl, err);
  }
};

module.exports = {
  processBlockchainResults
};

