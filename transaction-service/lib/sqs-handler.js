import { SQS } from 'aws-sdk';

export const publish = async (data, queueUrl) => {
  try {
    const sqs = new SQS({
      region: process.env.REGION,
    });
    const response = await sqs.sendMessage({
      MessageBody: JSON.stringify(data),
      QueueUrl: queueUrl,
    }).promise();
    console.log('response - ', response);
  } catch (e) {
    console.log('Exception on queue', e);
  }
};
