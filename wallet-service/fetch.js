const AWS = require("aws-sdk");
const { nanoid } = require('nanoid');
const { StatusCodes } = require('http-status-codes');
const utils = require("./src/helpers/utils");
const schema = require("./validation/wallet-schema");

let options = {}

if (process.env.IS_OFFLINE) {
	options = {
		region: 'us-east-1',
		endpoint: 'http://localhost:8000'
	}
}

const dynamo = new AWS.DynamoDB.DocumentClient(options);

module.exports.main = async (event) => {

	const { userId } = event.queryStringParameters
	if (!userId) {
		return utils.send(StatusCodes.BAD_REQUEST, {
			message: "userId is required in query params"
		});
	}
	try {
		let queryInput = {
			"TableName": "near-wallets",
			"ScanIndexForward": true,
			"IndexName": "userId-Index",
			"KeyConditionExpression": "#key_userId = :key_userId",
			"ExpressionAttributeValues": {
				":key_userId": userId
			},
			"ExpressionAttributeNames": {
				"#key_userId": "userId"
			}
		}

		try {
			const queryOutput = await dynamo.query(queryInput).promise();
			return utils.send(StatusCodes.OK, {
				"wallets": queryOutput.Items
			});
		} catch (err) {
			return utils.send(500, {
				message: "Internal Server Error",
				body: err
			});
		}
	} catch (error) {
		return utils.send(StatusCodes.INTERNAL_SERVER_ERROR, {
			message: 'Error fetching wallets to the user!',
			data: error.message
		});
	}
};