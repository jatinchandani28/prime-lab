const dynamodb = require("aws-sdk/clients/dynamodb");
const { StatusCodes } = require("http-status-codes");

const lambda = require("../../../activities");
const utils = require("../../../utils");

describe("Test create", () => {
  let putSpy;

  beforeAll(() => {
    putSpy = jest.spyOn(dynamodb.DocumentClient.prototype, "get");
  });

  // Clean up mocks
  afterAll(() => {
    putSpy.mockRestore();
  });

  it("should fail when auth is missing", async () => {
    const event = {
      httpMethod: "GET",
      pathParameters: {},
      headers: {
        Authorization:null //you also pass wrong token
      },
      body: {},
    };

    const result = await lambda.handler(event);
    const expectedResult = utils.send(StatusCodes.INTERNAL_SERVER_ERROR, {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': true
        },
        body: '{"message":"Unexpected token o in JSON at position 1"}'
      });

    const body = JSON.parse(result.body);

    const expectedResultBody = JSON.parse(expectedResult.body);

    expect(result).toEqual(expectedResultBody);

    const {statusCode} = result;

    const {statusCode:status} = expectedResult;

    console.log(`Here is the Result --- Status Code: ${statusCode}, Message: ${body.message}`);
    console.log(`Here is the Expected Result --- Status Code: ${status}, Message: ${JSON.parse(expectedResultBody.body).message}`);
  });

  it("should fail when validation is missing", async () => {
    const event = {
      httpMethod: "GET",
      pathParameters: {},
      headers: {
        Authorization:
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjb3VudHJ5Q29kZSI6IisxIiwibGFzdE5hbWUiOiJOYW1lIiwidXNlcklkIjoiMThrVDBpeWFRekM1SzRCZHV5ZThzIiwic3RhdHVzIjoiYWN0aXZlIiwiY3JlYXRlZCI6MTY0NjIzNjM1Njk4NSwiaXNQaG9uZVZlcmlmaWVkIjpmYWxzZSwicGhvbmUiOiIzMDcyMTUzNjU5IiwiZmlyc3ROYW1lIjoiVGVzdCIsImlzRW1haWxWZXJpZmllZCI6ZmFsc2UsIndhbGxldE5hbWUiOiJkYXZpdC5uZWFyIiwiaWF0IjoxNjQ3MjgwODQ3LCJleHAiOjE2NDczNjcyNDd9.GkcD3HCxQKm416dCeNVjlkjMAyQZNq6XNgRuUYAEujE",
      },
      body: '{"collectionName": "","ownerId": ""}',
    };

    const result = await lambda.handler(event);

    const expectedResult = utils.send(StatusCodes.BAD_REQUEST, {
        message: 'One or more fields are invalid.'
      });

    expect(JSON.parse(result.body).message).toEqual(JSON.parse(expectedResult.body).message);

    console.log(`Here is the Result --- Status Code: ${JSON.stringify(result.statusCode)}, Message: ${JSON.parse(result.body).message}`);
    console.log(`Here is the Expected Result --- Status Code: ${JSON.stringify(expectedResult.statusCode)}, Message: ${JSON.parse(expectedResult.body).message}`);
  });

  it("should list activities nft-collection", async () => {
    const item = {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
      },
      body: '{"message": "NFT activities retrieved successfully"}',
    };

    // Return the specified value whenever the spied get function is called
    putSpy.mockReturnValue({
      promise: () => Promise.resolve({ Item: item }),
    });

    const event = {
        httpMethod: "GET",
        pathParameters: {
            nftId: 'f353q50jg949',
        },
        headers: {
          Authorization:
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjb3VudHJ5Q29kZSI6IisxIiwibGFzdE5hbWUiOiJOYW1lIiwidXNlcklkIjoiMThrVDBpeWFRekM1SzRCZHV5ZThzIiwic3RhdHVzIjoiYWN0aXZlIiwiY3JlYXRlZCI6MTY0NjIzNjM1Njk4NSwiaXNQaG9uZVZlcmlmaWVkIjpmYWxzZSwicGhvbmUiOiIzMDcyMTUzNjU5IiwiZmlyc3ROYW1lIjoiVGVzdCIsImlzRW1haWxWZXJpZmllZCI6ZmFsc2UsIndhbGxldE5hbWUiOiJkYXZpdC5uZWFyIiwiaWF0IjoxNjQ3MjgwODQ3LCJleHAiOjE2NDczNjcyNDd9.GkcD3HCxQKm416dCeNVjlkjMAyQZNq6XNgRuUYAEujE",
        },
        body: '',
      };

    const result = await lambda.handler(event);

    const expectedResult = utils.send(StatusCodes.OK, item);

    const exp = JSON.parse(expectedResult.body).body

    expect(JSON.parse(result.body).message).toEqual(JSON.parse(exp).message);

    console.log(`Here is the Result --- Status Code: ${JSON.stringify(result.statusCode)}, Message: ${JSON.parse(result.body).message}`);
    console.log(`Here is the Expected Result --- Status Code: ${JSON.stringify(expectedResult.statusCode)}, Message: ${JSON.parse(exp).message}`);
  });
});

