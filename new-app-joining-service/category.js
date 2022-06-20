const AWS = require("aws-sdk");
const { nanoid } = require('nanoid');
const { StatusCodes } = require('http-status-codes');
const utils = require("./utils");

let options = {}

if (process.env.IS_OFFLINE) {
	options = {
		region: 'us-east-1',
		endpoint: 'http://localhost:8000'
	}
}

const dynamo = new AWS.DynamoDB.DocumentClient(options);

module.exports.handler = async (event) => {

	console.log(event)
	const reqId = nanoid();  //for msg logging

	const { categoryId } = event.pathParameters

	if (!categoryId) {
		console.log(`reqId: ${reqId}, error: One or more fields are invalid.`);
		return utils.send(StatusCodes.BAD_REQUEST, {
			message: "categoryId is required in path!."
		});
	}

	try {
		if (event.routeKey == 'GET /apps/category/{categoryId}') {

			const { Items = [] } = await dynamo.query({
				TableName: "near-apps",
				IndexName: "categoryId-Index",
				KeyConditionExpression: "categoryId = :categoryId",
				ExpressionAttributeValues: {
					":categoryId": categoryId
				},
				ReturnConsumedCapacity: "TOTAL",
			}).promise();

			console.log(`reqId: ${reqId}, msg: Apps found successfully!`);
			return utils.send(StatusCodes.OK, {
				message: 'Apps found for this category!',
				data: {
					...Items
				}
			});
		} else {
			console.log(`reqId: ${reqId}, error: Unsupported route: ${event.routeKey}`);
			return utils.send(StatusCodes.NOT_FOUND, {
				message: `Unsupported route: ${event.routeKey}`
			});
		}
	} catch (error) {
		console.log(`reqId: ${reqId}, error: Error fetching apps for this category`);
		return utils.send(StatusCodes.INTERNAL_SERVER_ERROR, {
			message: 'Error connecting apps to the user!',
			data: error.message
		});
	}
}; 
