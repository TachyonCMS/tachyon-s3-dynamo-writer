const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = {TABLE};

const s3 = new AWS.S3();

exports.handler = (event) => {
    let S3Object = parseS3Event(event);
    let key = S3Object[0].key
    let params = {Bucket: {BUCKET}, Key: key}
    s3.getObject(params, function(err, data) {
      if (err) {
          console.log(err, err.stack);
      }// an error occurred
      else  {   
        let objectData = JSON.parse(data.Body.toString('utf-8'));
        return saveToDynamoDB(objectData);// successful response
      }
    });
    
};

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