
# Profile Service

### View Profile

- **URL**: `{{baseUrl}}/profile/{userId}`
- **METHOD**: `GET`
- **PATH PARAMS**: `userId`
- **QUERY PARAMS**: N/A
- **REQUEST BODY**:

Response:
```
{
    "message": "User detail retrieved successfully!",
    "data": {
        "Item": {
            "lastName": "Purohit",
            "firstName": "Chirag",
            "profilePhotoPath": "/testing",
            "isPhoneVerified": false,
            "phone": "+918733962950",
            "countryCode": "+91",
            "created": 1646003199970,
            "userId": "axDPXjActaGrAXP7relqM",
            "email": "nnnx-user-signup40@mailinator.com",
            "isEmailVerified": false,
            "status": "active"
        }
    }
}
```

### Update Profile

- **URL**: `{{baseUrl}}/profile/axDPXjActaGrAXP7relqM`
- **METHOD**: `PUT`
- **PATH PARAMS**: `userId`
- **QUERY PARAMS**: N/A
- **REQUEST BODY**:

```
{
    "firstName": "Johnny",
    "profilePhoto": "file.apiserver.display_photo.png",
    "lastName": "Doe",
    "email": "abc123@gmail.com",
    "phone": "+9749446545",
    "countryCode": "+1"
}
```

- **RESPONSE BODY**:

```
{
    "message": "User detail updated successfully!",
    "data": {
        "lastName": "Doe",
        "isPhoneVerified": true,
        "wallets": [],
        "userId": "CCB6wW-S-ZaZOta8JaWUI",
        "isEmailVerified": true,
        "nftCollections": [],
        "createdAt": "2022-01-05 11:22:48.230203+00",
        "firstName": "Johnny",
        "profilePhoto": "file.apiserver.display_photo.png",
        "phone": "+9749446545",
        "countryCode": "+1",
        "files": [],
        "contacts": [],
        "email": "abc123@gmail.com",
        "status": "active"
    }
}
```

### Delete Profile

- **URL**: `{{baseUrl}}/profile/{userId}`
- **METHOD**: `DELETE`
- **PATH PARAMS**: `userId`
- **QUERY PARAMS**: N/A
- **REQUEST BODY**: otp

Response:
```
{
    "message": "You have successfully deleted user dX-2WSj1ly16YMzrgY3xx",
    "data": []
}
```