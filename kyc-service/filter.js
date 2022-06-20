const utils = require("./utils");
const { StatusCodes } = require("http-status-codes");
module.exports.getAllCategories = async (event) => {
    try {
        const params = {
            TableName: process.env.DYNAMODB_APP_CATEGORIES_TABLE,
        };
        const result = await utils.dynamoDb.scan(params);
        return utils.send(StatusCodes.OK, result);
    } catch (err) {
        return utils.send(StatusCodes.INTERNAL_SERVER_ERROR, {
            message: "Ops...",
        });
    }
};
const schema = require("./validation/filter-validation-schema.js");

module.exports.getByKeyword = async (event) => {
    try {
        const validationParams = {
            keyword: event.pathParameters.keyword,
        };
        const { error } = schema.validate(validationParams);

        if (error) {
            return utils.send(StatusCodes.BAD_REQUEST, {
                errors: error.details.map((item) => item.message),
            });
        }

        const params = {
            TableName: process.env.DYNAMODB_APPS_TABLE,
            FilterExpression: "contains(#name, :keyword) OR contains(#description, :keyword)",
            ExpressionAttributeNames: {
                "#name": "name",
                "#description": "description",
            },
            ExpressionAttributeValues: {
                ":keyword": event.pathParameters.keyword,
            },
        };
        const result = await utils.dynamoDb.scan(params);
        return utils.send(StatusCodes.OK, result);
    } catch (err) {
        return utils.send(StatusCodes.INTERNAL_SERVER_ERROR, {
            message: "Ops...",
        });
    }
};

module.exports.getByCategories = async (event) => {
    try {


        
        const validationParams = {
            categoryId: event.pathParameters.categories,
        };
        const { error } = schema.validate(validationParams);
        if (error) {
            return utils.send(StatusCodes.BAD_REQUEST, {
                errors: error.details.map((item) => item.message),
            });
        }

        let categoriesArray = event.pathParameters.categories.split(",");
        let FilterExpression = "";
        let ExpressionAttributeValues = {};

        for (var categoryIndex = 0; categoryIndex < categoriesArray.length; categoryIndex++) {
            FilterExpression += `categoryId = :category` + categoryIndex + ` OR `;
            ExpressionAttributeValues[":category" + categoryIndex] = categoriesArray[categoryIndex];
        }
        FilterExpression = FilterExpression.substring(0, FilterExpression.lastIndexOf("OR"));
        const params = {
            TableName: process.env.DYNAMODB_APPS_TABLE,
            FilterExpression: FilterExpression,
            ExpressionAttributeValues: ExpressionAttributeValues,
        };

        const result = await utils.dynamoDb.scan(params);
        return utils.send(StatusCodes.OK, result);
    } catch (err) {
        return utils.send(StatusCodes.INTERNAL_SERVER_ERROR, {
            message: "Ops...",
        });
    }
};
