### file-service-createFile

## TODOs
* Delete s3 bucket near-file created in this service and instead use the S3 bucket created via startup-service when #14 is merged
* Import Tables names via SSM parameter (should be exported by Terraform stack)
* Encrypt dataEncryptionKey using public key when clients will have access to their private key
