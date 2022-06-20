const { handler } = require('../lambda/createFile/index');
const event = require('../lambda/createFile/events/sample.json');

//Mock Dynamodb

describe('CreateFiles', () => {
    it('should fail when walletId is missing', async () => {
        const event = {
            httpMethod: 'post',
            pathParameters: {},
            headers: {},
            body: JSON.stringify({})
        };

        const result = await handler(event);
        const expectedResult = utils.send(StatusCodes.BAD_REQUEST, {
            errors: ['walletID is a required field'],
        });
        expect(result).toEqual(expectedResult);
    });

    it('should fail when userId does not exist', async () => {
        getSpy.mockReturnValue({
            promise: () => Promise.resolve({ Item: undefined }),
        });
        const newUserId = 'something-that-does-not-exist';
        const event = {
            httpMethod: 'GET',
            routeKey: 'GET /wallets/{userId}',
            pathParameters: {
                userId: newUserId,
            },
        };

        const result = await lambda.main(event);

        const expectedResult = utils.send(StatusCodes.NOT_FOUND, {
            errors: [
                {
                    message: `unable to find the app userId: ${newUserId} !`,
                },
            ],
        });

        expect(result).toEqual(expectedResult);
    });

    it('should get app by userId', async () => {
        const item = {
            name: "myfile.png",
            path: "/myDrive/myfile.png",
            description: "description ",
            storageProvider: "Google Drive"
        };

        // Return the specified value whenever the spied get function is called
        getSpy.mockReturnValue({
            promise: () => Promise.resolve({ Item: item }),
        });

        const event = {
            httpMethod: 'POST',
            pathParameters: {
                walletId
            },
            routeKey: 'POST/wallets/:walletId/files',
        };

        // Invoke retrieve-app()
        const result = await lambda.main(event);

        const expectedResult = utils.send(StatusCodes.OK, {
            success: true,
            message: 'created file successfully!',
            data: item
        });

        // Compare the result with the expected result
        expect(result).toEqual(expectedResult);
    });

});
