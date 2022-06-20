const dynamodb = require("aws-sdk/clients/dynamodb");
const { StatusCodes } = require("http-status-codes");

const lambda = require("../../../get");
const utils = require("../../../utils");
const mock = require('./mock.json');

describe("Get pending offer by ndtId", () => {
    let getSpy;

    beforeAll(() => {
        getSpy = jest.spyOn(dynamodb.DocumentClient.prototype, "get");
    });

    // Clean up mocks
    afterAll(() => {
        getSpy.mockRestore();
    });

    it("should fail when validation is missing", async () => {
        const event = {
            httpMethod: "GET",
            pathParameters: {
                nftCollectionId: ""
            },
            headers: { Authorization: mock.Authorization }
        };

        const result = await lambda.handler(event);

        const expectedResult = utils.send(StatusCodes.BAD_REQUEST, {
            message: 'The path parameter \"nftId\" is required.'
        });

        expect(JSON.parse(result.body).message).toEqual(JSON.parse(expectedResult.body).message);

    });

    it('should get list pending offer by status and nftId', async () => {

        // Return the specified value whenever the spied get function is called
        getSpy.mockReturnValue({
            promise: () => Promise.resolve({ Item: mock.offers[0] }),
        });

        const event = {
            httpMethod: 'GET',
            pathParameters: {
                nftId: mock.offers[0].nftId,
                status: mock.offers[0].status
            },
            headers: { Authorization: mock.Authorization },
        };

        const result = await lambda.handler(event);

        const expectedResult = utils.send(StatusCodes.OK, {
            message: 'offer list by status retrieved successfully',
            data: mock.offers[0],
        });
        expect(JSON.parse(result.body).message).toEqual(JSON.parse(expectedResult.body).message);
    });
});
