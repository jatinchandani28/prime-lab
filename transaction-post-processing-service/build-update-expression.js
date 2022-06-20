const _ = require("underscore");

const buildUpdateExpression = (inputParams) => {
    // Function to generate update expression for DynamoDB automatically based on the inputParams
    let updateExpression = '';
    const finalExpression = {};
    const expAttrNames = {};
    const expAttValues = {};
    const systemValReplacements = {
        status: 'x_status',
        type: 'x_type'
    };
    for (let attr in inputParams) {
        let emptyExpAttrNames = false;
        const replacedAttrVal = attr && systemValReplacements[attr] ? systemValReplacements[attr] : '';
        if (replacedAttrVal && !updateExpression) {
        updateExpression += `set #${replacedAttrVal} = :new_${attr}`;
        } else if (replacedAttrVal){
        updateExpression += `, #${replacedAttrVal} = :new_${attr}`;
        }
        if (!replacedAttrVal && attr && !updateExpression) {
        updateExpression += `set ${attr} = :new_${attr}`;
        } else if (!replacedAttrVal && attr){
        updateExpression += `, ${attr} = :new_${attr}`;
        }
        if (attr) {
        expAttValues[`:new_${attr}`] = inputParams[attr];
        }
        if (replacedAttrVal) {
        expAttrNames[`#${replacedAttrVal}`] = attr;
        }
    }
    if (!_.isEmpty(updateExpression)) {
        finalExpression.UpdateExpression = updateExpression;
    }
    if (!_.isEmpty(expAttrNames)) {
        finalExpression.ExpressionAttributeNames = expAttrNames;
    }
    if (!_.isEmpty(expAttValues)) {
        finalExpression.ExpressionAttributeValues = expAttValues;
    }
    return finalExpression;
};

  
module.exports = {
    buildUpdateExpression
}