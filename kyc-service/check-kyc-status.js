const utils = require("./utils");
const { StatusCodes } = require("http-status-codes");
const schema = require("./validation/kyc-status-check-schema.js");

module.exports.handler = async (event) => {
    
    try {

        const validationParams = {
            walletId: event.pathParameters.walletId,
        };
        const { error } = schema.validate(validationParams);

        if (error) {
            return utils.send(StatusCodes.BAD_REQUEST, {
                errors: error.details.map((item) => item.message),
            });
        }

        const params = {
            TableName: process.env.DYNAMODB_KYC_INFO_TABLE,
            FilterExpression: "wallet_id = :walletId",
            ExpressionAttributeValues: {
                ":walletId": event.pathParameters.walletId,
            },

        };
        
        const result = await utils.dynamoDb.scan(params);
        if(result.length == 0){
            return utils.send(StatusCodes.NOT_FOUND, {
                message: "Requested wallet id not found",
            });
        }
        const kycInfo = result[0];
        const daysSinceKYCApproved = utils.getDateDifference(kycInfo.kyc_approved_on,"yyyy-MM-dd'T'HH:mm:ss",'days')
        if(parseInt(daysSinceKYCApproved) > process.env.KYC_REQUIRED_AFTER_DAYS){

            return utils.send(StatusCodes.OK, {
                is_kyc_required:true,
                message: "KYC resubmission required",
            });
        }else{
            return utils.send(StatusCodes.OK, {
                is_kyc_required:false,
                message: "KYC resubmission not required",
            });
        }
        
    } catch (err) {
        
        return utils.send(StatusCodes.INTERNAL_SERVER_ERROR, {
            message: "Ops...",
        });
    }
};
