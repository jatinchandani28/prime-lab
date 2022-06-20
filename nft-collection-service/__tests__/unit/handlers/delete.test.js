const dynamodb = require("aws-sdk/clients/dynamodb");
const { StatusCodes } = require("http-status-codes");

const del = require("../../../delete");
const utils = require("../../../utils");
const mock = require('./mock.json');

describe("Test Delete", () => {
  let putSpy;

  beforeAll(() => {
    putSpy = jest.spyOn(dynamodb.DocumentClient.prototype, "delete");
  });

  // Clean up mocks
  afterAll(() => {
    putSpy.mockRestore();
  });

  it("should fail when validation is missing", async () => {
    const event = {
      httpMethod: "DELETE",
      pathParameters: {
        nftCollectionId:""
      },
      headers: {Authorization: mock.Authorization}
    };

    const result = await del.handler(event);

    const expectedResult = utils.send(StatusCodes.BAD_REQUEST, {
        message: 'The path parameter "nftCollectionId" is required.'
      });

    expect(JSON.parse(result.body).message).toEqual(JSON.parse(expectedResult.body).message);

    console.log(`Here is the Result --- Status Code: ${JSON.stringify(result.statusCode)}, Message: ${JSON.parse(result.body).message}`);
    console.log(`Here is the Expected Result --- Status Code: ${JSON.stringify(expectedResult.statusCode)}, Message: ${JSON.parse(expectedResult.body).message}`);
  });

  it("should delete nft-collection", async () => {
    const item = {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
      },
      body: '{"message": "NFT collection deleted successfully."}',
    };

    // Return the specified value whenever the spied get function is called
    putSpy.mockReturnValue({
      promise: () => Promise.resolve({ Item: item }),
    });

    const event = {
        httpMethod: "DELETE",
        pathParameters: {
          nftCollectionId: mock.collectionId
        },
        headers: {Authorization: mock.Authorization}
      };

    const result = await del.handler(event);

    const expectedResult = utils.send(StatusCodes.OK, item);

    const exp = JSON.parse(expectedResult.body).body

    expect(result.body.message).toEqual(exp.message);

    console.log(`Here is the Result --- Status Code: ${JSON.stringify(result.statusCode)}, Message: ${JSON.parse(result.body).message}`);
    console.log(`Here is the Expected Result --- Status Code: ${JSON.stringify(expectedResult.statusCode)}, Message: ${JSON.parse(exp).message}`);
  });
});

