const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.CMS_TABLE_NAME;
const BUCKET_NAME = process.env.BUCKET_NAME;

const s3 = new AWS.S3();

const parentElements = 2;

exports.handler = async function(event) {
    let S3Object = parseS3Event(event);
    let key = S3Object[0].key

    let params = {Bucket: BUCKET_NAME, Key: key}
    s3.getObject(params, function(err, data) {
      if (err) {
          console.log(err, err.stack);
      }// an error occurred
      else  {   
        let objectData = JSON.parse(data.Body.toString('utf-8'));
        let keys = parseS3Key(key)
        Object.assign(keys, objectData)
        return saveToDynamoDB(keys);// successful response
      }
    });
};

function parseS3Key(key) {

    let pk = ''
    let sk = ''

    // Use native JS vs. importing Path to keep our Lambda as small as possible.
    // The S3 path key is very predictable.

    // Trim the `.json` from the right side
    key = key.substr(0, key.length - 5)

    // Split string on slashes
    let s3Path = key.split('/')

    // Discard the parentPath number of elements
    let keysPath = s3Path.slice(parentElements)

    // Test elements until we get to one that is either:
    // `entries` or `contentTypes`
    // Everything before this become part of the PK.
    // Everything after it is the SK.
    // entry SK get prepended with `e`
    // contentType SK get prepended with `ct`
    // The rest of the PK and SK elements get concatenated with `#` as separators.
    let pkArray = []
    let identified = false

    let current = ''

    while(! identified) {
        current = keysPath.shift()
        if(current == 'entries') {
            // We have an entries file
            identified = true
            pkArray.push(keysPath.shift())


        } else if (current == 'contentTypes') {
            // We have a contentTypes file
            identified = true
            keysPath.unshift('ct')

        } else {
            // Add this element to the PK array
            pkArray.push(current)

            // If there is only a single element left it must be the SK.
            if(keysPath.length === 1) {
               identified = true
            }
        }
    }

    // Use the identifed PK and SK elements as keys.
    pk = pkArray.join('#')
    sk = keysPath.join('#')

    // Return pk and sk object
    return {
        pk: pk,
        sk: sk
    }

}

function saveToDynamoDB (data)  {
    if (!data) {
        return Promise.resolve();
    }
    let params = {
        TableName: TABLE_NAME,
        Item: data
    }
    return docClient.put(params)
        .promise()
        .then(response => response)
        .catch(err => {
            console.log(err);
            return err;
        });
};

function parseS3Event(event) {
	if (!event || !event.Records || !Array.isArray(event.Records)) {
		return [];
  }
  let extractMessage = record => record.s3 && record.s3.object;
	return event.Records.map(extractMessage).filter(object => object);
};
