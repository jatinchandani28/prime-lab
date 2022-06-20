const { SSM, SecretsManager } = require("aws-sdk");


const getWalletId = async () => {

    const region = "us-east-1";
    const secretName = "KiSxhgEVSttYY124gMLsQoKH";
    
    const result = await new Promise((resolve, reject) => {
        
        var client = new SecretsManager({
            region: region
        });
        
        return client.getSecretValue({ SecretId: secretName }, function(err, data) {
            if (err) {
                reject(err)
            }
            else {
                // Decrypts secret using the associated KMS CMK.
                // Depending on whether the secret is a string or binary, one of these fields will be populated.
                if ('SecretString' in data) {
                    resolve(data.SecretString)
                } else {
                    let buff = new Buffer(data.SecretBinary, 'base64');
                    resolve(buff.toString('ascii'))
                }
            }
        })
        
    });
    
    return JSON.parse(result).phrase;
}

module.exports.getWalletId = getWalletId;