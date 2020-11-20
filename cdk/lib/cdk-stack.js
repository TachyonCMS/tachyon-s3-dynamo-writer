const cdk = require('@aws-cdk/core')
const s3 = require('@aws-cdk/aws-s3')
const s3n = require('@aws-cdk/aws-s3-notifications')
const lambda = require('@aws-cdk/aws-lambda')
const dynamodb = require('@aws-cdk/aws-dynamodb')

class CdkStack extends cdk.Stack {
  /**
   *
   * @param {cdk.Construct} scope
   * @param {string} id
   * @param {cdk.StackProps=} props
   */
  constructor(scope, id, props) {
    super(scope, id, props);

    // Define the Tachyon CMS Dynamo Table
    const table = new dynamodb.Table(this, 'TachyonCMS', {
      partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST
    });

    const bucket = new s3.Bucket(this, 'TachyonCMSFiles', {
      versioned: true,
      publicReadAccess: false,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    // defines an AWS Lambda resource
    const lambdaFunction = new lambda.Function(this, 'DynamoImportS3Handler', {
      runtime: lambda.Runtime.NODEJS_12_X,    // execution environment
      code: lambda.Code.fromAsset('lambda'),  // code loaded from "lambda" directory
      handler: 'dynamoImportS3.handler',
      environment: {
        CMS_TABLE_NAME: table.tableName,
        BUCKET_NAME: bucket.bucketName
      }                
    });

    table.grantReadWriteData(lambdaFunction);

    const notification = new s3n.LambdaDestination(lambdaFunction)
    
    bucket.addEventNotification(s3.EventType.OBJECT_CREATED, notification)

    bucket.grantReadWrite(lambdaFunction);


  }
}

module.exports = { CdkStack }
