const AWS = require('aws-sdk');
let DocumentClient = new AWS.DynamoDB.DocumentClient({
    region: 'us-east-1' //process.env.AWS_SDK_REGION,
})

const isTest = process.env.JEST_WORKER_ID;

if(isTest){
    DocumentClient = new AWS.DynamoDB.DocumentClient({
        region: 'localhost',
        endpoint: 'http://0.0.0.0:8001'
    });
}

export default DocumentClient;