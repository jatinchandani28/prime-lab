const { map, pull } = require('lodash');
const BPromise = require('bluebird');
const { nanoid } = require('nanoid');
const SNS = require('aws-sdk/clients/sns');
const SES = require('aws-sdk/clients/ses');

const Wallets = require('./lib/model/wallets');
const Transactions = require('./lib/model/transaction');
const { sendTransaction } = require('./create');

const sns = new SNS();
const ses = new SES({ apiVersion: '2010-12-01' });

async function sendSMS(PhoneNumber, Message) {
  try {
    const { MessageId } = await sns.publish({
      Message,
      PhoneNumber,
    }).promise();
    return MessageId;
  } catch (error) {
    // Avoid throwing error so receiver won't be spammed
    console.error(error);
    return null;
  }
}

async function sendEmail(toEmailAddresses, fromEmailAddress, subject, messageBody) {
  try {
    const { MessageId } = await ses.sendEmail({
      Destination: {
        ToAddresses: toEmailAddresses,
      },
      Message: {
        Body: {
          Html: {
            Charset: 'UTF-8',
            Data: messageBody,
          },
        },
        Subject: {
          Charset: 'UTF-8',
          Data: subject,
        },
      },
      Source: `NFT Maker App <do-not-reply@nearlogin.io>`,
      ReplyToAddresses: [],
    }).promise();
    return MessageId;
  } catch (error) {
    console.log(error);
    return null;
    // throw error;
  }
}

async function checkWalletTransactionState(walletId) {
  const wallet = await Wallets.getWallet(walletId);
  if (!wallet) {
    throw new Error(`checkWalletTransactionState: Wallet '${walletId}' not found`);
  }
  if (wallet.transactionId) {
    const transaction = await Transactions.getTransactionById(wallet.transactionId);
    if (!transaction) {
      throw new Error(`checkWalletTransactionState: Transaction for wallet creation '${walletId}' not found`);
    }
    if (transaction.blockchainStatus !== 'complete') {
      console.warn(
        `checkWalletTransactionState: Transaction for '${walletId}' has blockchainStatus '${transaction.blockchainStatus}'`,
      );
      // // TODO: remove this when transaction blockchain status will be updated from the indexer?
      // throw new Error(
      //   `checkWalletTransactionState: Transaction '${transaction.transactionId}' for '${walletId}' has blockchainStatus '${transaction.blockchainStatus}'`,
      // );
    }
  }
}

async function onSQSRecords(event) {
  const { Records } = event;

  const unprocessedMessageIds = map(Records, (record) => record.messageId);
  try {
    await BPromise.mapSeries(Records, async (record) => {
      const item = JSON.parse(record.body);
      const {
        nft, receiver, sender,
      } = item;
      if (!receiver) {
        console.error(`Receiver is undefined for NFT '${nft?.nftId}' sent by ${sender?.walletId}`, item);
        return; // Early return, no need to retry this message as it will fail again
      }
      await checkWalletTransactionState(receiver.walletId);
      await sendTransaction({
        ...nft, nftId: nanoid(), ownerWalletId: receiver.walletId, ownerId: receiver.user.userId,
      });
      const senderName = [sender.user.firstName, sender.user.lastName].filter((x) => !!x).join(' ');
      const message = `${senderName} has gifted you a Near NFT '${nft.title}'. Login with your Near Name: ${receiver.walletId} to claim your NFT https://nftmakerapp.io/`;
      if (receiver.user.phone && receiver.user.countryCode) {
        await sendSMS(
          `${receiver.user.countryCode}${receiver.user.phone}`,
          message,
        );
      }
      if (receiver.user.email) {
        await sendEmail([receiver.user.email], sender.user.email, `${senderName} sent you an NFT gift`, message);
      }

      // we arrived here so every thing is OK. remove this record id from unprocessed array.
      pull(unprocessedMessageIds, record.messageId);
    });
  } catch (error) {
    console.error('Got error', error);
  }
  if (unprocessedMessageIds.length) {
    console.warn('Unprocessed messages', unprocessedMessageIds);
  }

  return {
    batchItemFailures: map(unprocessedMessageIds, (id) => ({ itemIdentifier: id })),
  };
}

module.exports.handler = async (event) => {
  console.log('event', JSON.stringify(event));
  return onSQSRecords(event);
};
