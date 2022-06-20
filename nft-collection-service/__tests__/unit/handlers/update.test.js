const dynamodb = require('aws-sdk/clients/dynamodb');
const jwt = require('jsonwebtoken');
const { StatusCodes } = require('http-status-codes');

const lambda = require('../../../update');
const utils = require('../../../utils');
const mock = require('./mock.json');
const sinon = require('sinon');

describe('Update Collection by collectionId', () => {
  let getSpy;

  beforeAll(() => {
    // It is just the way to bypass the DynamoDB oprations during Test Case
    getSpy = jest.spyOn(dynamodb.DocumentClient.prototype, 'query');

    // It is just the way to bypass the JWT oprations during Test Case
    sinon.stub(jwt, 'verify').callsFake((req, res, next) => mock.user);
  });

  // Clean up mocks
  afterAll(() => {
    sinon.restore();
    // getSpy.mockRestore();
  });

  it('should fail when nftCollectionId is missing', async () => {
    const event = {
      httpMethod: 'PUT',
      pathParameters: {},
      headers: { Authorization: mock.Authorization },
    };

    const result = await lambda.handler(event);

    const expectedResult = utils.send(StatusCodes.BAD_REQUEST, {
      message: 'The path parameter "nftCollectionId" is required.',
    });

    expect(JSON.parse(result.body).message).toEqual(
      JSON.parse(expectedResult.body).message
    );

    console.log(
      `Here is the Result --- Status Code: ${JSON.stringify(
        result.statusCode
      )}, Message: ${JSON.parse(result.body).message}`
    );
    console.log(
      `Here is the Expected Result --- Status Code: ${JSON.stringify(
        expectedResult.statusCode
      )}, Message: ${JSON.parse(expectedResult.body).message}`
    );
  });

  it('should fail when auth is missing', async () => {
    const event = {
      httpMethod: 'GET',
      pathParameters: { nftCollectionId: mock.collectionId },
      headers: {},
    };

    const result = await lambda.handler(event);
    const expectedResult = utils.send(StatusCodes.INTERNAL_SERVER_ERROR, {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: '{"message":"Access Token is required."}',
    });

    const body = JSON.parse(result.body);

    const expectedResultBody = JSON.parse(expectedResult.body);

    expect(result).toEqual(expectedResultBody);

    const { statusCode } = result;

    const { statusCode: status } = expectedResult;

    console.log(
      `Here is the Result --- Status Code: ${statusCode}, Message: ${body.message}`
    );
    console.log(
      `Here is the Expected Result --- Status Code: ${status}, Message: ${
        JSON.parse(expectedResultBody.body).message
      }`
    );
  });

  it('it should fail to update collection due to schema validation', async () => {
    const event = {
      httpMethod: 'PATCH',
      pathParameters: { nftCollectionId: mock.collectionId },
      headers: { Authorization: mock.Authorization },
      body: JSON.stringify({
        collectionName: 'My Second Collection',
        ownerId: `@@`,
      }),
    };

    const result = await lambda.handler(event);
    const body = JSON.parse(result.body);

    const expectedResult = utils.send(StatusCodes.BAD_REQUEST, {
      message: 'One or more fields are invalid.',
      errors: body.errors,
    });

    expect(result).toEqual(expectedResult);

    const { statusCode } = result;

    const { statusCode: status } = expectedResult;

    console.log(
      `Here is the Result --- Status Code: ${statusCode}, Message: ${body.message}`
    );
    console.log(
      `Here is the Expected Result --- Status Code: ${status}, Message: ${expectedResult.body.message}`
    );
  });

  it('it should update collection', async () => {
    const event = {
      httpMethod: 'PATCH',
      pathParameters: { nftCollectionId: mock.collectionId },
      headers: { Authorization: mock.Authorization },
      body: JSON.stringify({
        collectionName: mock.collectionName,
        ownerId: mock.ownerId,
      }),
    };

    const result = await lambda.handler(event);
    const body = JSON.parse(result.body);

    const expectedResult = utils.send(StatusCodes.OK, {
      message: 'NFT collection updated successfully.',
      data: result,
    });

    expect(result).toEqual(expectedResult);

    const { statusCode } = result;

    const { statusCode: status } = expectedResult;

    console.log(
      `Here is the Result --- Status Code: ${statusCode}, Message: ${body.message}`
    );
    console.log(
      `Here is the Expected Result --- Status Code: ${status}, Message: ${expectedResult.body.message}`
    );
  });
});
