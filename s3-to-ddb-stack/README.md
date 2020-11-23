# Welcome to the Tachyon CMS S3-to-DynamoDB Writer

This project will create the following:

1. An S3 bucket with an event trigger
2. A Lambda to process the trigger
3. A DynamoDB table to hold the itmes.

## Installation

### Checkout the code

```bash
git clone https://github.com/TachyonCMS/tachyon-s3-dynamo-writer.git
```

### Change into repo's CDK directory

```bash
cd tachyon-s3-dynamo-writer/tachyon-s3-dynamo-writer
```

### Deploy  the CDK stack

Assuming you've read through the code and are ok with the defaults deploying the stack is simple.

```bash
cdk deploy
```

## Useful commands

* `npm run test`         perform the jest unit tests
* `cdk deploy`           deploy this stack to your default AWS account/region
* `cdk diff`             compare deployed stack with current state
* `cdk synth`            emits the synthesized CloudFormation template

## How this stack was made

### Create Directory and change into it

```bash
mkdir s3-to-ddb-stack
cd s3-to-ddb-stack
```

### Initialize JavaScript CDK app

If this were going to be a bigger project I'd use typescript.
For simple projects its easier to avoid the need to compile the typescript.
Plain JS reduces the nuber of local dependencies, this is important for small personal projects.

```bash
cdk init app --language javascript
```

### Install the required packages

AWS provides a CDK package for each service.

```bash
npm install --save \
@aws-cdk/aws-dynamodb \
@aws-cdk/aws-lambda \
@aws-cdk/aws-s3 \
@aws-cdk/aws-s3-notifications
```

## Edit the Stack definition

```bash
lib/s3-to-ddb-stack-stack.js
```

Started with the CDK generated default:

```javascript
const cdk = require('@aws-cdk/core');

class S3ToDdbStackStack extends cdk.Stack {
  /**
   *
   * @param {cdk.Construct} scope
   * @param {string} id
   * @param {cdk.StackProps=} props
   */
  constructor(scope, id, props) {
    super(scope, id, props);

    // The code that defines your stack goes here
  }
}

module.exports = { S3ToDdbStackStack }
```

### Require additional service modules

Add the following below the existing require statements.

Note: If you're new to CDK make sure you aer using the latest version and just as importnantly, *the instructions you follow are for that version*.

```javascript
const s3 = require('@aws-cdk/aws-s3')
const s3n = require('@aws-cdk/aws-s3-notifications')
const lambda = require('@aws-cdk/aws-lambda')
const dynamodb = require('@aws-cdk/aws-dynamodb')
```

## Define our Stack

AWS makes it *really* easy to put our code in the correct place.
Just look for the comment below.

```javascript
// The code that defines your stack goes here
```

### Define the DynamoDB table

*PRO Tip* Use `pk` and `sk` as the names of the partition and sort key even if you aren't implementing a "single table design". That allows for easily adding single table design elelemnts down the road without additional changes.

```javascript
// Define the Tachyon CMS Dynamo Table
const table = new dynamodb.Table(this, 'TachyonCMS', {
    partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
    sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
    billingMode: dynamodb.BillingMode.PAY_PER_REQUEST
});
```

### Define the S3 Bucket

```javascript
// Define the CMS Files bucket
const bucket = new s3.Bucket(this, 'TachyonCMSFiles', {
    versioned: true,
    publicReadAccess: false,
    removalPolicy: cdk.RemovalPolicy.DESTROY
});
```

### Define the Lambda resource

```javascript
// Defines an AWS Lambda resource
const lambdaFunction = new lambda.Function(this, 'DynamoImportS3Handler', {
    runtime: lambda.Runtime.NODEJS_12_X,    // execution environment, use a current one
    code: lambda.Code.fromAsset('lambda'),  // code loaded from "lambda" directory
    handler: 'dynamoImportS3.handler',      // Filename and function
    environment: { // Make the following os.env variables available to the Lambda
        CMS_TABLE_NAME: table.tableName,
        BUCKET_NAME: bucket.bucketName
      }
});
```

### Grant the Lambda permssions

All AWS CDK ersources have grant methods that grant sane, least privileges permsiions to the resource.
Here we grant the lambdaFunction read/write permission to the DyanmoDB table and the S3 bucket.

```javascript
// Grant Lambda access to table and bucket
table.grantReadWriteData(lambdaFunction);
bucket.grantReadWrite(lambdaFunction);
```

### Create an S3 Notification referencing the Lambda

```javascript
// Create an S3 Notification referencing the Lambda
const notification = new s3n.LambdaDestination(lambdaFunction)
```

### Add that event to the S3 bucket

```javascript
// Add event to S3 bucket
bucket.addEventNotification(s3.EventType.OBJECT_CREATED, notification)
```

### Create the output values

```javascript
new cdk.CfnOutput(this, "CmsTableName", {
    value: table.tableName
});
new cdk.CfnOutput(this, "CmsTableArn", {
    value: table.tableArn
});
// Output S3 bucket values
new cdk.CfnOutput(this, "CmsBucketName", {
    value: bucket.bucketName
});
new cdk.CfnOutput(this, "CmsBucketArn", {
    value: bucket.bucketArn
});
```

## Create our Lambda

Create a new `/lambda` directory in the root.

```bash
mkdir lambda
```



```javascript
const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.CMS_TABLE_NAME;
const BUCKET_NAME = process.env.BUCKET_NAME;

const s3 = new AWS.S3();

const parentElements = 2;

exports.handler = async function (event) {
    let S3Object = parseS3Event(event);
    let key = S3Object[0].key

    let params = { Bucket: BUCKET_NAME, Key: key }
    s3.getObject(params, function (err, data) {
        if (err) {
            console.log(err, err.stack);
        }// an error occurred
        else {
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

    while (!identified) {
        current = keysPath.shift()
        if (current == 'entries') {
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
            if (keysPath.length === 1) {
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

function saveToDynamoDB(data) {
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
```