const dynamodb = require("aws-sdk/clients/dynamodb");
const { StatusCodes } = require("http-status-codes");

const lambda = require("../../../list-offers");
const utils = require("../../../utils");
const mock = require('./mock.json');

describe("List offers", () => {
  let getSpy;

  beforeAll(() => {
    getSpy = jest.spyOn(dynamodb.DocumentClient.prototype, "query");
  });

  // Clean up mocks
  afterAll(() => {
    getSpy.mockRestore();
  });

  it("should fail when validation is missing", async () => {
    const event = {
      httpMethod: "GET",
      pathParameters: {
        status:"",
        nftId:mock.offers[0].nftId
      },
      headers: {Authorization: mock.Authorization}
    };

    const result = await lambda.handler(event);
    // console.log("🚀 ~ file: list-offers.test.js ~ line 31 ~ it ~ result", result)

    const expectedResult = utils.send(StatusCodes.BAD_REQUEST, {
        message: 'One or more fields are invalid.'
      });

    expect(JSON.parse(result.body).message).toEqual(JSON.parse(expectedResult.body).message);

  });

  it('should get list of offers by status and nftId', async () => {
    
    // Return the specified value whenever the spied get function is called
    getSpy.mockReturnValue({
      promise: () => Promise.resolve({Item: mock.offers}),
    });

    const event = {
      httpMethod: 'GET',
      pathParameters: { status: mock.offers[0].status, nftId:mock.offers[0].nftId },
      headers: { Authorization: mock.Authorization },
    };

    const result = await lambda.handler(event);
    console.log("🚀 ~ file: list-offers.test.js ~ line 55 ~ it ~ result", result)

    const expectedResult = utils.send(StatusCodes.OK, {
      message: `offer list by '${mock.offers[0].status}' retrieved successfully`,
      data: mock.offers,
    });
    expect(JSON.parse(result.body).message).toEqual(JSON.parse(expectedResult.body).message);
  });
});

