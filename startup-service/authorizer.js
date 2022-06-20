const SSM = require('aws-sdk/clients/ssm');
const jwt = require('jsonwebtoken');
const parameterStore = new SSM();

let SECRET_KEY = 'MyAwesomeKey'; // TODO: Remove the fixed value when bug is fixed

exports.handler = async (event, context) => {
  console.log('event', JSON.stringify(event));
  if (!SECRET_KEY) {
    const secreteKeyParameterStore = await parameterStore.getParameter({
      Name: 'SECRET_KEY',
    }).promise();

    SECRET_KEY = secreteKeyParameterStore.Parameter.Value;
  }

  const token = event.headers.authorization || event.headers.Authorization; //support both

  if (!token) {
    return { isAuthorized: false };
  }

  try {
    await jwt.verify(token.replace('Bearer ', ''), SECRET_KEY);
    return { isAuthorized: true };
  } catch (e) {
    return { isAuthorized: false };
  }

};
