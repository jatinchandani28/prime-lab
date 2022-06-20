# NFT API

nft-service

## Getting started

In order to run the services locally, `serverless-offline` plugin is required

## Offline Invocation

```sh
npm install
serverless offline
```

---

## Functions

### CREATE

- **URL**: `/nfts`
- **METHOD**: `POST`
- **PATH PARAMS**: N/A
- **QUERY PARAMS**: N/A
- **REQUEST BODY**:

```json
{
    "title": "nft title",
    "description": "this is my favorite art!",
    "externalDescriptionLink": "https://google.com",
    "collectionId": "_0iM8scD5fkKFi6l9tMo0",
    "categoryId": "_0iM8scD5fkKFi6l9tMo0",
    "imageUrl": "http://example-bucket.s3-website.us-west-2.amazonaws.com/photo.jpg",
    "tags": ["real"],
    "capacity": "2",
    "appId": "_0iM8scD5fkKFi6l9tMo8"
}
```

- **RESPONSE BODY**:

```json
 {
   "message": "NFT created successfully!",
      "data": {
          "nft": {
            "nftId": "1323441p",
            "title": "nft title",
            "description": "this is my favorite art!",
            "externalDescriptionLink": "https://lonelystarart.com",
            "collectionId": "_0iM8scD5fkKFi6l9tMo0",
            "categoryId": "_0iM8scD5fkKFi6l9tMo0",
            "imageUrl": "http://example-bucket.s3-website.us-west-2.amazonaws.com/photo.jpg",
            "tags": ["rare", "fun"],
            "capacity": "2",
            "appId": "123456789",
            "createdAt": "1644665660697",
          },
      },
 }
```

### UPDATE

- **URL**: `/nfts`
- **METHOD**: `PUT`
- **PATH PARAMS**:

```json
{
  "nftId": "8ja1AXfaqBukQNHn3CX8i"
}
```

- **QUERY PARAMS**: N/A
- **REQUEST BODY**:

```json
{
  "description": "Mock Description For Nft",
  "status": "completed",
  "ownerId": "j353q50jg940"
}
```

- **RESPONSE BODY**:

```json
{
  "message": "Nft updated successfully"
}
```

### DELETE

- **URL**: `/nfts`
- **METHOD**: `DELETE`
- **PATH PARAMS**:

```json
{
  "nftId": "8ja1AXfaqBukQNHn3CX8i"
}
```

- **QUERY PARAMS**: N/A
- **REQUEST BODY**: N/A

- **RESPONSE BODY**:

```json
{
  "message": "Nft deleted successfully"
}
```

### GET

- **URL**: `/nfts`
- **METHOD**: `GET`
- **PATH PARAMS**:

```json
{
  "nftId": "8ja1AXfaqBukQNHn3CX8i"
}
```

- **QUERY PARAMS**: N/A
- **REQUEST BODY**: N/A
- **RESPONSE BODY**:

```json
{
  "message": "success",
  "data": {
    "nftId": "q432tji31j",
    "title": "Mock Nft",
    "description": "Mock Description For Nft",
    "status": "completed",
    "ownerId": "j353q50jg940",
    "fileUrl": "https://dev-s3.amazonaws.com/example.png",
    "created": 1644518539414,
    "updated": 1644518539414,
    "owner": {
      "userId": "z343q70jg947",
      "title": "Mock Nft",
      "description": "Mock Description For Nft",
      "status": "completed",
      "ownerId": "j353q50jg940",
      "fileUrl": "https://dev-s3.amazonaws.com/example.png",
      "created": 1644518539414,
      "updated": 1644518539414
    }
  }
}
```

### LIST

- **URL**: `/nfts/list`
- **METHOD**: `GET`
- **PATH PARAMS**: N/A
- **QUERY PARAMS**: N/A
- **REQUEST BODY**: N/A

- **RESPONSE BODY**:

```json
{
  "message": "success",
  "data": {
    "nftId": "list",
    "title": "Mock Nft",
    "description": "Mock Description For Nft",
    "transactionId":"ZC12321312",
    "status": "completed",
    "ownerId": "j353q50jg940",
    "fileUrl": "https://dev-s3.amazonaws.com/example.png",
    "created": 1644518539414,
    "updated": 1644518539414,
  }
}
```

### CLAIM NFT

- **URL**: `/nfts/:nftId/claim/:claimToken`
- **METHOD**: `GET`
- **PATH PARAMS**:

```json
{
  "nftId": "8ja1AXfaqBukQNHn3CX8i",
  "claimToken": "iahg93t35"
}
```

- **QUERY PARAMS**: N/A
- **REQUEST BODY**: N/A
- **RESPONSE BODY**:

```json
{ "message": "NFT claimed successfully" }
```
