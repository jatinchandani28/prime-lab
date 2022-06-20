const dynamodb = require('aws-sdk/clients/dynamodb');
const { StatusCodes } = require('http-status-codes');

const lambda = require('../get');
const utils = require('../utils');

// const Authorization =
//   'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjcmVhdGVkIjoxNjQ2MzAzMzgzNzM1LCJzdGF0dXMiOiJhY3RpdmUiLCJpc1Bob25lVmVyaWZpZWQiOmZhbHNlLCJpc0VtYWlsVmVyaWZpZWQiOmZhbHNlLCJlbWFpbCI6InRlc3Rmb3JpdmFuQGdtYWlsLmNvbSIsImZpcnN0TmFtZSI6IlRlc3QiLCJsYXN0TmFtZSI6Ikl2YW4iLCJ1c2VySWQiOiJWMVN0R1hSOF9aNjVkSGk2Qi1teVQiLCJ3YWxsZXROYW1lIjoidGVzdGZvcml2YW4ubmVhciIsImlhdCI6MTY0NjMwMzM4M30.SuOtqyIW76ZY3_Y3ijWuPPcZ5gGDz1wWgTgPL8H4E6o';
const appId = 'DGWS4dPa8dejsDNMMlwzg';

describe('Test getApp', () => {
  let getSpy;

  beforeAll(() => {
    getSpy = jest.spyOn(dynamodb.DocumentClient.prototype, 'get');
  });

  // Clean up mocks
  afterAll(() => {
    getSpy.mockRestore();
  });

  it('should fail when appId is missing', async () => {
    const event = {
      httpMethod: 'GET',
      pathParameters: {},
      headers: {},
    };

    // Invoke retrieve-app()
    const result = await lambda.main(event);

    const expectedResult = utils.send(StatusCodes.BAD_REQUEST, {
      message: 'The path parameter "appId" is required.',
    });

    // Compare the result with the expected result
    expect(result).toEqual(expectedResult);
  });

  it('should fail when appId does not exist', async () => {
    getSpy.mockReturnValue({
      promise: () => Promise.resolve({ Item: undefined }),
    });
    const newAppId = 'something-that-does-not-exist';
    const event = {
      httpMethod: 'GET',
      routeKey: 'GET /apps/{appId}',
      pathParameters: {
        appId: newAppId,
      },
    };

    // Invoke retrieve-app()
    const result = await lambda.main(event);

    const expectedResult = utils.send(StatusCodes.NOT_FOUND, {
      errors: [
        {
          message: `unable to find the app appId: ${newAppId} !`,
        },
      ],
    });

    // Compare the result with the expected result
    expect(result).toEqual(expectedResult);
  });

  it('should get app by appId', async () => {
    const item = {
      categoryId: '147782bc-3124-451f-9f57-ba1f3d731806',
      ownerId: '147782bc-3124-451f-9f57-ba1f3d731807',
      appName: 'Test app',
      description: 'Test description',
      tags: ['tag1', 'tag2'],
      version: '3',
      developer: '',
      created: '2022-02-24T21:54:30',
      updated: '2022-02-24T21:54:30',
      appId: '35ycqqrLye0-AsLeyow9t',
    };

    // Return the specified value whenever the spied get function is called
    getSpy.mockReturnValue({
      promise: () => Promise.resolve({ Item: item }),
    });

    const event = {
      httpMethod: 'GET',
      pathParameters: {
        appId
      },
      routeKey: 'GET /apps/{appId}',
      headers: {
        Authorization:
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjcmVhdGVkIjoxNjQ2MzAzMzgzNzM1LCJzdGF0dXMiOiJhY3RpdmUiLCJpc1Bob25lVmVyaWZpZWQiOmZhbHNlLCJpc0VtYWlsVmVyaWZpZWQiOmZhbHNlLCJlbWFpbCI6InRlc3Rmb3JpdmFuQGdtYWlsLmNvbSIsImZpcnN0TmFtZSI6IlRlc3QiLCJsYXN0TmFtZSI6Ikl2YW4iLCJ1c2VySWQiOiJWMVN0R1hSOF9aNjVkSGk2Qi1teVQiLCJ3YWxsZXROYW1lIjoidGVzdGZvcml2YW4ubmVhciIsImlhdCI6MTY0NjMwMzM4M30.SuOtqyIW76ZY3_Y3ijWuPPcZ5gGDz1wWgTgPL8H4E6o',
      },
    };

    // Invoke retrieve-app()
    const result = await lambda.main(event);

    const expectedResult = utils.send(StatusCodes.OK, {
      success: true,
      message: 'App retrieved successfully!',
      data: item
    });

    // Compare the result with the expected result
    expect(result).toEqual(expectedResult);
  });
});