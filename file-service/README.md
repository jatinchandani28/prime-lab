# FILES API

file-service

## Implementation Status Progress

[Architecture Diagram](https://lucid.app/lucidchart/b5c543ad-b2c5-44d3-9b39-925455b16ab3/edit?referringApp=slack&invitationId=inv_4d08dd42-3f62-427c-817e-4b6687e5855b&page=TcIWwBbZZ2cK#)

### Lambda
- [x] acceptShare
- [x] copyFile
- [x] createFile
- [x] deleteFile
- [x] getFile
- [ ] grantAccessPermission
- [x] listFiles
- [x] onFileUploaded
- [x] onFileStreamEvent
- [x] requestShare
- [x] revokeShare
- [x] updateFile

### SQS
- [x] DLQ-onFileUploaded
- [x] DLQ-onFileStreamEvent

### S3
- [x] DLQ-onFileUploaded

### Go to production
- [] Sanity check
- [] Dev environment test
- [] Documentation update
- [] Deploy production

## Getting started

In order to run the services locally, `serverless-offline` plugin is required

## Offline Invocation

```sh
npm install
serverless offline
```

---

## Functions

### LIST ALL FILES Request

- **URL**: `{{baseURL}}/files`
- **METHOD**: `GET`
- **PATH PARAMS**: N/A
- **QUERY PARAMS**: N/A
- **REQUEST BODY**: N/A
- **RESPONSE BODY**:

```
{
  {
    "message": "Files retrieved successfully!",
    "data": [
        {
            "status": true,
            "fileId": "gz7IDWamH62xXSbTDtpeD",
            "name": "sample-file.jpeg",
            "filePath": "http://aws.amazon.com/files/sample-file.jpeg"
        },
    ]
}
```

### Share Request

- **URL**: `{{baseURL}}/files/share`
- **METHOD**: `POST`
- **PATH PARAMS**: N/A
- **QUERY PARAMS**: N/A
- **REQUEST BODY**:

```
{
    "status": true,
    "message": "Share request successful!",
    "data": {
        "senderId": "randomsender.near",
        "receiverId": "randomreceiver.near",
        "fileHash": "ba7816bf8f01cfea414140de5dae2223.........",
        "storageHash": "3c747963faee04a635854300c3c4bdf.........",
        "isNotificationDelivered": true
    }
}
```

- **RESPONSE BODY**:

```
{
    "status": true,
    "message": "Share request successful!",
    "data": {
        "senderId": "randomsender.near",
        "receiverId": "randomreceiver.near",
        "fileHash": "ba7816bf8f01cfea414140de5dae2223.........",
        "storageHash": "3c747963faee04a635854300c3c4bdf.........",
        "isNotificationDelivered": true
    }
}
```

### Accept Share

- **URL**: `{{baseURL}}/files/acceptShare`
- **METHOD**: `POST`
- **PATH PARAMS**: N/A
- **QUERY PARAMS**: N/A
- **REQUEST BODY**:

```
{
    "senderId": "randomsender.near",
    "receiverId": "randomreceiver.near",
    "fileHash": "ba7816bf8f01cfea414140de5dae2223.........",
    "isAccepted": true
}
```

- **RESPONSE BODY**:

```
{
    "status": true,
    "message": "accept share request successful!",
    "data": {
        "senderId": "randomsender.near",
        "receiverId": "randomreceiver.near",
        "fileHash": "ba7816bf8f01cfea414140de5dae2223.........",
        "storageHash": "3c747963faee04a635854300c3c4bdf.........",
        "isSenderNotified": true
    }
}
```


### Accept Share

- **URL**: `{{baseURL}}/files/revokeSharePermission`
- **METHOD**: `POST`
- **PATH PARAMS**: N/A
- **QUERY PARAMS**: N/A
- **REQUEST BODY**:

```
{
    "userId": "randomuser.near",
    "storageProvider": "Google cloud storage",
    "fileHash": "ba7816bf8f01cfea414140de5dae2223.........",
    "storageUri": "bfd426d349a68b483b2c..........."
}
```

- **RESPONSE BODY**:

```
{
    "status": true,
    "message": "revoke permission successful!",
    "data": {
        "userId": "randomuser.near",
        "storageProvider": "Google cloud storage",
        "fileHash": "ba7816bf8f01cfea414140de5dae2223.........",
        "storageUri": "bfd426d349a68b483b2c...........",
        "isUserNotified": true
    }
}
```

### Encrypt File

- **URL**: `{{baseURL}}/files/encrypt`
- **METHOD**: `POST`
- **PATH PARAMS**: N/A
- **QUERY PARAMS**:

```
{
    "fileName": "mysecretfile",
    "filePath": "<path-to-file>",
    "publicKey": "ba7816bf8f01cfea414140de5dae2223........."
}
```

- **REQUEST BODY**: N/A
- **RESPONSE BODY**:

```
{
    "status": true,
    "message": "File encrypted successfully!",
    "data": {
        "fileName": "mysecretfile",
        "encryptedFileHash": "ba7816bf8f01cfea414140de5dae2223........."
    }
}
```

### Decrypt File

- **URL**: `{{baseURL}}/files/decrypt`
- **METHOD**: `POST`
- **PATH PARAMS**: N/A
- **QUERY PARAMS**: N/A
- **REQUEST BODY**:

```
{
        "fileName": "mysecretfile",
        "encryptedFileHash": "ba7816bf8f01cfea414140de5dae2223........."
}
```

- **RESPONSE BODY**:

```
{
    "fileName": "mysecretfile",
    "filePath": "<path-to-file>",
    "publicKey": "ba7816bf8f01cfea414140de5dae2223........."
}
```

### Grant Access Permission

- **URL**: `{{baseURL}}/files/grantPermission`
- **METHOD**: `POST`
- **PATH PARAMS**: N/A
- **QUERY PARAMS**: N/A
- **REQUEST BODY**:

```
{
    "userId": "randomuser.near",
    "storageProvider": "Google cloud storage",
    "fileHash": "ba7816bf8f01cfea414140de5dae2223.........",
    "storageUri": "bfd426d349a68b483b2c..........."
}
```

- **RESPONSE BODY**:

```
{
    "status": true,
    "message": "Grant permission successful!",
    "data": {
        "ownerId": "randomowner.near",
        "userId": "randomuser.near",
        "fileHash": "ba7816bf8f01cfea414140de5dae2223.........",
        "storageHash": "3c747963faee04a635854300c3c4bdf.........",
        "isUserNotified": true
    }
}
```

### Revoke Access Permission

- **URL**: `{{baseURL}}/files/revokePermission`
- **METHOD**: `POST`
- **PATH PARAMS**: N/A
- **QUERY PARAMS**: N/A
- **REQUEST BODY**:

```
{
    "userId": "randomuser.near",
    "storageProvider": "Google cloud storage",
    "fileHash": "ba7816bf8f01cfea414140de5dae2223.........",
    "storageUri": "bfd426d349a68b483b2c..........."
}
```

- **RESPONSE BODY**:

```
{
    "status": true,
    "message": "revoke permission successful!",
    "data": {
        "ownerId": "randomsender.near",
        "userId": "randomreceiver.near",
        "fileHash": "ba7816bf8f01cfea414140de5dae2223.........",
        "storageHash": "3c747963faee04a635854300c3c4bdf.........",
        "isUserNotified": true
    }
}
```

### List File Access

- **URL**: `{{baseURL}}/files/listAccess?fileHash=ba7816bf8f01cfea414140de5dae2223b...`
- **METHOD**: `GET`
- **PATH PARAMS**: N/A
- **QUERY PARAMS**: `fileHash`
- **REQUEST BODY**: N/A
- **RESPONSE BODY**:

```
{
    "status": true,
    "message": "Request successful!",
    "data": [
        {
            "userId": "CCB6wW-S-ZaZOta8JaWUI",
            "firstName": "John",
            "lastName": "Doe",
            "phone": "9834567890",
            "email": "sjobs@apple.com",
        }
    ]
}
```

### List Shared Files

- **URL**: `{{baseURL}}/files/sharedFiles`
- **METHOD**: `GET`
- **PATH PARAMS**: N/A
- **QUERY PARAMS**: N/A
- **REQUEST BODY**: N/A
- **RESPONSE BODY**:

```
{
    "status": true,
    "message": "Request successful!",
    "data": [
        {
            "fileName": "mysecretfile",
            "filePath": "<path-to-file>"
        }
    ]
}
```

### List Files Shared

- **URL**: `{{baseURL}}/files/filesShared`
- **METHOD**: `GET`
- **PATH PARAMS**: N/A
- **QUERY PARAMS**: N/A
- **REQUEST BODY**: N/A
- **RESPONSE BODY**:

```
{
    "status": true,
    "message": "Request successful!",
    "data": [
        {
            "fileName": "mysecretfile",
            "filePath": "<path-to-file>"
        }
    ]
}
```

### Update File

- **URL**: `{{baseURL}}/files/{{fileId}}`
- **METHOD**: `PUT`
- **PATH PARAMS**: `fileId`
- **QUERY PARAMS**: N/A
- **REQUEST BODY**:

```
{
    "file": "<attachedfile>",
}
```

- **RESPONSE BODY**:

```
{
    "status": true,
    "message": "File Updated Successfully!",
    "data": {
        "fileId": "CCB6wW-S-ZaZOta8JaWUI",
        "fileName": "myupdatedsecretfile",
        "fileDescription": "myupdatedsecretfile",
        "createdDate": "2022-01-12 11:22:48.230203+00",
        "ModifiedDate": "2022-01-30 10:29:48.230203+00"
    }
}
```

### Copy File

- **URL**: `{{baseURL}}/files/{{fileId}}/copy`
- **METHOD**: `POST`
- **PATH PARAMS**: `fileId`
- **QUERY PARAMS**: N/A
- **REQUEST BODY**:

```
{
    "storageLocation": "AWS s3 bucket"
}
```

- **RESPONSE BODY**:

```
{
    "status": true,
    "message": "File copied Successfully!",
    "data": {
        "fileId": "CCB6wW-S-ZaZOta8JaWUI",
        "fileName": "myupdatedsecretfile",
        "storageLocation": "Google cloud storage",
        "originalFilePath": "<path-to-the-actual-file>",
        "copyFilePath": "<path-to-the-copy-file>",
        "createdDate": "2022-01-12 11:22:48.230203+00"
    }
}
```

### Create File

- **URL**: `{{baseURL}}/files`
- **METHOD**: `POST`
- **PATH PARAMS**: N/A
- **QUERY PARAMS**: N/A
- **REQUEST BODY**:

```
{
    "senderId": "randomsender.near",
    "receiverId": "randomreceiver.near",
    "fileHash": "ba7816bf8f01cfea414140de5dae2223.........",
    "storageHash": "3c747963faee04a635854300c3c4bdf........."
}
```

- **RESPONSE BODY**:

```
{
    "status": true,
    "message": "Share request successful!",
    "data": {
        "senderId": "randomsender.near",
        "receiverId": "randomreceiver.near",
        "fileHash": "ba7816bf8f01cfea414140de5dae2223.........",
        "storageHash": "3c747963faee04a635854300c3c4bdf.........",
        "isNotificationDelivered": true
    }
}
```

### Grant Access Permission

- **URL**: `{{baseURL}}/grantPermission`
- **METHOD**: `POST`
- **PATH PARAMS**: N/A
- **QUERY PARAMS**: N/A
- **REQUEST BODY**:

```
{
    "userId": "randomuser.near",
    "storageProvider": "Google cloud storage",
    "fileHash": "ba7816bf8f01cfea414140de5dae2223.........",
    "storageUri": "bfd426d349a68b483b2c..........."
}
```

- **RESPONSE BODY**:

```
{
    "message": "Grant permission successful!",
    "ownerId": "randomowner.near",
    "userId": "randomuser.near",
    "fileHash": "ba7816bf8f01cfea414140de5dae2223.........",
    "storageHash": "3c747963faee04a635854300c3c4bdf.........",
    "isUserNotified": true
}
```
