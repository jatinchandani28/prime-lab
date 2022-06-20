const BPromise = require('bluebird');
const { backOff } = require('exponential-backoff');
const { diff } = require('deep-diff');
const Lambda = require('aws-sdk/clients/lambda');
const DynamoDB = require('aws-sdk/clients/dynamodb');

const {
  reduce, isString, upperFirst, uniq,
} = require('lodash');
const Files = require('../../src/models/files');

const lambda = new Lambda();

const { LAMBDA_FUNCTION_NAME_TRANSACTION_SERVICE_CREATE } = process.env;

const parse = DynamoDB.Converter.unmarshall;

// Map diff kinds to regular text see: https://github.com/flitbit/diff
const diffEventMap = new Map([
  ['N', 'Added'],
  ['D', 'Deleted'],
  ['E', 'Edited'],
  ['A', 'ArrayItem'],
]);

const extractTableNameFromEventSourceArn = (arn) => {
  const matches = arn.match(/^arn:aws:dynamodb:[a-z0-9-]+:[0-9-]+:table\/([\w-]+)/);

  if (matches === null) {
    throw new Error(`Can't extract table name from eventSourceArn : ${arn}`);
  }

  return matches[1];
};

/**
 * Generate method name based on type of difference of a JSON object between its old
 * presentation and its new structure/attributes by starting the method with `on` then
 * uppercase first letter of the field affected by the change. If type of difference affects an
 * array the method will be appended by `ArrayItem` then the kind of modification to the array.<br>
 *
 * @param {{path: [string], kind: string, item?: { kind: string} }} diff - difference between old
 * object and new object
 *
 * @example
 * `{ "path": ['syncFrequency'], kind: "E", "lhs": 1, "rhs": 3}` => `onSyncFrequencyEdited`
 *
 * @return {*}
 */
const parseDiff = (diff) => {
  let method = `${reduce(
    diff.path,
    (path, prop) => {
      if (isString(prop)) {
        return path + upperFirst(prop);
      }
      return path;
    },
    '',
  )}`;
  if (!diffEventMap.has(diff.kind)) {
    return null;
  }
  method
      += diffEventMap.get(diff.kind) + (diff.kind === 'A' ? diffEventMap.get(diff.item.kind) : '');
  return method;
};

const processRecord = (record) => {
  const { dynamodb, eventName } = record;
  const newImage = parse(dynamodb.NewImage);
  const oldImage = parse(dynamodb.OldImage);
  const time = new Date(dynamodb.ApproximateCreationDateTime * 1000).toISOString();
  const diffsArray = (diff(oldImage, newImage) || []).filter(
    (diffItem) => !['created', 'updated'].includes(
      diffItem.path[0],
    )
              && !['created', 'updated'].includes(
                diffItem.path[diffItem.path.length - 1],
              ),
  ) || [];
  return {
    time,
    eventName,
    table: extractTableNameFromEventSourceArn(record.eventSourceARN),
    keys: parse(dynamodb.Keys),
    newImage,
    oldImage,
    diff: diffsArray,
    diffActions: uniq(diffsArray.map(parseDiff)),
  };
};

async function sendTransaction(trx) {
  const { Payload } = await lambda.invoke({
    FunctionName: LAMBDA_FUNCTION_NAME_TRANSACTION_SERVICE_CREATE,
    InvocationType: 'RequestResponse',
    Payload: JSON.stringify({
      body: trx,
    }),
  }).promise();
  const { statusCode, body } = JSON.parse(Payload);
  if (statusCode !== 200) {
    throw new Error(body);
  }
  return JSON.parse(body);
}

async function sendFileShareRevokedTransaction({ oldImage: { ownerId, hash } }) {
  const data = {

    senderWalletId: ownerId,
    fileHash: hash,
    type: 'grant_file_access',
  };
  return sendTransaction(data);
}

async function sendFileSharedTransaction({ newImage: { ownerId, hash } }) {
  const data = {

    senderWalletId: ownerId,
    fileHash: hash,
    type: 'revoke_file_access',
  };
  return sendTransaction(data);
}

async function sendFileDeletedTransaction({ oldImage: { walletId, hash } }) {
  const data = {

    senderWalletId: walletId,
    fileHash: hash,
    type: 'delete_file',
  };
  return sendTransaction(data);
}

async function sendFileCreatedTransaction({ newImage: { walletId, hash }, newImage }) {
  const data = {
    senderWalletId: walletId,
    fileHash: hash,
    type: 'create_file',
  };
  return sendTransaction(data);
}

// TODO: implement onFileUploaded
module.exports.handler = async (event) => {
  // TODO: use a library that handles log sampling according to stage
  console.log('event', JSON.stringify(event));
  const { Records } = event;

  // limit to 5 concurrent updates to hot partition issue with files table
  return BPromise.map(Records, async (record) => {
    const item = processRecord(record);
    switch (true) {
      case item.diffActions.includes('HashAdded'): // A file has been uploaded to S3 bucket
        return sendFileCreatedTransaction(item);
      case item.eventName === 'REMOVE' && !!item.hash && item.oldImage.walletId
      === item.oldImage.ownerId:
        return sendFileDeletedTransaction(item);
      case item.eventName === 'INSERT' && !!item.newImage.sharedAt: // A file has been shared and accepted
        return sendFileSharedTransaction(item);
      case item.eventName === 'REMOVE' && item.oldImage.walletId
      !== item.oldImage.ownerId: // A file share has been revoked
        return sendFileShareRevokedTransaction(item);
      default:
        console.warn('Dynamodb event unhandled');
    }
    return item;
    // return sendTransaction(trx);
  }, { concurrency: 5 });
};
