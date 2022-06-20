const { StatusCodes } = require("http-status-codes");
const { filter, find, flatten, chunk } = require("lodash");
const BPromise = require("bluebird");
const parsePhoneNumber = require("libphonenumber-js");
const SQS = require("aws-sdk/clients/sqs");

const utils = require("./utils");
const Contacts = require("./lib/model/contacts");
const Users = require("./lib/model/users");
const Wallets = require("./lib/model/wallets");
const Nfts = require("./lib/model/nft");
const schema = require("./validation/gift-nft-schema");
const HttpError = require("./lib/error");

const sqs = new SQS();

const { SQS_URL_SEND_NFT_GIFT } = process.env;

async function createUser(contact) {
  let identity = {
    firstName: contact.firstName,
    lastName: contact.lastName,
  };
  const [phone] = contact.phone || [];
  const [email] = contact.email || [];

  if (email?.address) {
    identity = { ...identity, email: email.address };
  }
  if (phone && phone.number && phone.number !== "") {
    const phoneNumber = parsePhoneNumber(`+${phone.number.replace("+", "")}`);
    if (phoneNumber) {
      identity = {
        ...identity,
        phone: phoneNumber.nationalNumber,
        countryCode: `+${phoneNumber.countryCallingCode}`,
      };
    }
  }
  if (identity.phone) {
    identity = {
      ...identity,
      walletName: `${identity.phone}${
        Math.floor(Math.random() * 10000) + 1
      }.near`,
    };
  } else {
    identity = {
      ...identity,
      walletName: `${identity.email
        ?.split("@")[0]
        ?.toLowerCase()
        .replace(/[^a-z][^0-9]/g, "")}.near`,
    };
  }

  const [userByEmail, userByPhone] = await Promise.all([
    identity.email ? Users.getUserByEmail(identity.email) : null,
    identity.phone ? Users.getUserByPhone(identity.phone) : null,
  ]);
  if (userByEmail || userByPhone) {
    const userWallets = await Wallets.listUserWallets(
      (userByEmail || userByPhone).userId
    );
    if (!userWallets || !userWallets.length) {
      throw new HttpError(
        StatusCodes.NOT_FOUND,
        `User wallet not found. ${identity.email} ${identity.phone}`
      );
    }
    return {
      receiver: {
        walletId: userWallets[0].walletId,
        user: userByEmail || userByPhone,
      },
    };
  }

  const { statusCode, body } = await utils.callServerRequest(
    "/users",
    "POST",
    null,
    identity
  );

  if (statusCode === StatusCodes.CREATED) {
    await Contacts.updateContact({
      contactId: contact.contactId,
      linkedUserId: body.user.userId,
    });
    return {
      receiver: {
        walletId: identity.walletName,
        user: body.user,
      },
    };
  }
  if (statusCode === StatusCodes.CONFLICT) {
    // TODO: handle conflicts
    // throw new HttpError(StatusCodes.CONFLICT, body.message);
    console.log(
      "Conflict: Cannot convert contact to user. User already exist",
      body
    );
  }
  return null;
}

module.exports.handler = async (event) => {
  console.log("event", event);
  try {
    const {
      pathParameters: { nftId },
      body: eventBody,
    } = event;
    const body = JSON.parse(eventBody);

    let user;
    try {
      user = await utils.verifyAccessToken(event);
    } catch (e) {
      throw new HttpError(StatusCodes.UNAUTHORIZED, e.message);
    }
    if (!nftId) {
      throw new HttpError(StatusCodes.BAD_REQUEST, "Missing nftId path param");
    }
    if (!body?.contactIds) {
      throw new HttpError(
        StatusCodes.BAD_REQUEST,
        "Missing contactIds in body"
      );
    }
    const { error } = schema.validate(body, utils.schemaOptions);
    if (error) {
      throw new HttpError(
        StatusCodes.BAD_REQUEST,
        error.details.map((x) => x.message).join(" ")
      );
    }
    const nft = await Nfts.getNftById(nftId);
    if (!nft) {
      throw new HttpError(
        StatusCodes.NOT_FOUND,
        `NFT with id '${nftId}' not found`
      );
    }
    if (![user.walletId, user.walletName].includes(nft.ownerWalletId)) {
      throw new HttpError(
        StatusCodes.UNAUTHORIZED,
        `You are not allowed gift this NFT '${nft.nftId}' as it does not belong to your wallet`
      );
    }
    let { contactIds = [] } = body;
    contactIds = [...new Set(contactIds)]; //unique elements...

    console.log(contactIds);
    const contacts = await Contacts.batchGetContacts(contactIds);
    console.log(contacts);

    let is_diff = [];

    contacts.forEach((c) => {
      contactIds.forEach(ci => {
        if(c.contactId != ci) {
          is_diff.push(ci);
        }
      })
    });


    if (!contactIds?.length || contacts.length !== contactIds.length) {
      throw new HttpError(
        StatusCodes.BAD_REQUEST,
        `Some of the provided contactIds were not found: ${is_diff}`
      );
    }

    const existentUserIds = filter(
      contacts,
      (contact) => contact && !!contact.linkedUserId
    ).map(({ linkedUserId }) => linkedUserId);
    const usersToCreate = filter(
      contacts,
      (contact) => contact && !contact.linkedUserId
    );

    const existentUsers = await Users.batchGetUsers(existentUserIds);

    const [result, linkedWallets] = await Promise.all([
      BPromise.map(usersToCreate, createUser, { concurrency: 5 }),
      BPromise.map(
        existentUsers,
        async (user) => {
          return Wallets.listUserWallets(user.userId).then((contactWallets) => {
            const defaultWallet =
              find(contactWallets, (w) => w.isPrimary) || contactWallets[0];
            if (defaultWallet) {
              return {
                receiver: {
                  walletId: defaultWallet.walletId,
                  user,
                },
              };
            }
            return null;
          });
        },
        { concurrency: 5 }
      ),
    ]);
    const safeResults = result.filter((d) => d);
    const batches = chunk(
      [...safeResults, ...flatten(linkedWallets).filter((x) => !!x)],
      10
    );
    // AWS imposes a limit of 10 per request. See https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_BatchWriteItem.html
    // consider a
    // message of ~320B, 256Kb
    // sendMessageBatch
    // limit is 256KB * 0.80 (20% security)

    await BPromise.map(
      batches,
      async (batch, batchId) =>
        sqs
          .sendMessageBatch({
            QueueUrl: SQS_URL_SEND_NFT_GIFT,
            Entries: batch.map((record, index) => ({
              Id: `${batchId}_${index}`,
              MessageBody: JSON.stringify({
                ...record,
                transactionType: "gift-nft",
                nft,
                sender: {
                  walletId: nft.ownerWalletId,
                  user,
                  jwt:
                    event.headers.Authorization || event.headers.authorization,
                },
              }),
            })),
          })
          .promise(),
      { concurrency: 5 }
    );

    return utils.send(StatusCodes.OK, { message: "NFT sent successfully." });
  } catch (e) {
    if (!e.status) {
      console.error(e.message, e);
    }
    return utils.send(e.status || StatusCodes.INTERNAL_SERVER_ERROR, {
      message: e.message,
      data: e.data,
    });
  }
};
