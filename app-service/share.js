const AWS = require('aws-sdk');
const { nanoid } = require('nanoid');
const { send, sendEmail, getParam, verifyAccessToken } = require('./utils');
const { StatusCodes } = require('http-status-codes');
const { shareAppSchema } = require('./schemaValidation');
const reqId = nanoid();
let options = {};

if (process.env.IS_OFFLINE) {
  options = {
    region: 'us-east-1',
    endpoint: 'http://localhost:8000',
  };
}

const dynamoDbClient = new AWS.DynamoDB.DocumentClient(options);

module.exports.main = async (event) => {
  const { body: bodyPayload } = event;
  const reqBody = JSON.parse(bodyPayload || '{}');

  /** Validating body payload against joi schema **/
  try {
    await shareAppSchema.validateAsync(reqBody);
  } catch (err) {
    console.log(
      `reqId: ${reqId} : Validation Error: ${err.details.message}`,
      err,
    );
    const [error] = err.details;
    return send(StatusCodes.BAD_REQUEST, {
      errors: [{ message: error.message }],
    });
  }

  /** fetch contact and app by id **/
  try {
    const userInfo = await verifyAccessToken(event);
    console.log('userInfo: ', userInfo);
    const contactItemOutput = await dynamoDbClient
      .get({
        TableName: 'near-contacts',
        Key: {
          contactId: reqBody.contactId,
        },
      })
      .promise();

    const appItemOutput = await dynamoDbClient
      .get({
        TableName: 'near-apps',
        Key: {
          appId: reqBody.appId,
        },
      })
      .promise();

    const FROM_EMAIL_ADDRESS = await getParam('FROM_EMAIL_ADDRESS');
    const REPLY_TO_EMAIL_ADDRESS = await getParam('REPLY_TO_EMAIL_ADDRESS');
    const { APP_LINK_BASE_URL } = process.env;
    const appLink = `${APP_LINK_BASE_URL}/${appItemOutput.appName}`;
    const contactEmail = contactItemOutput.email[0].address;
    const shareAppEmailSubject = 'Apps shared by your primelab contact';
    const shareAppEmailBody = `Please use the link to get the App <a href='${appLink}' target="_blank">${appLink}</a>`;

    await sendEmail(
      [contactEmail],
      FROM_EMAIL_ADDRESS,
      REPLY_TO_EMAIL_ADDRESS.split(','),
      shareAppEmailSubject,
      shareAppEmailBody,
    );
    return send(200, {
      message: "Applink sent successfully to contact's email",
      sharedAppLink: appLink,
    });
  } catch (err) {
    console.log(`reqId: ${reqId} : Error while sharing App to contact`, err);
    return send(
      500,
      {
        errors: [{ message: err.message }],
      },
      err,
    );
  }
};
