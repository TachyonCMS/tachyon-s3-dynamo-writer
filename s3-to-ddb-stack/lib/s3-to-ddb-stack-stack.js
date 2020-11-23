const cdk = require('@aws-cdk/core');
const s3 = require('@aws-cdk/aws-s3')
const s3n = require('@aws-cdk/aws-s3-notifications')
const lambda = require('@aws-cdk/aws-lambda')
const dynamodb = require('@aws-cdk/aws-dynamodb')

class S3ToDdbStackStack extends cdk.Stack {
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

    // Define the CMS Files bucket
    const bucket = new s3.Bucket(this, 'TachyonCMSFiles', {
      versioned: true, // Versioning allows auditng that changes match those in Git.
      publicReadAccess: false,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    // Defines an AWS Lambda resource
    const lambdaFunction = new lambda.Function(this, 'DynamoImportS3Handler', {
      runtime: lambda.Runtime.NODEJS_12_X,    // execution environment
      code: lambda.Code.fromAsset('lambda'),  // code loaded from "lambda" directory
      handler: 'dynamoImportS3.handler',      // Filename and function
      environment: { // Make the following os.env variables available to the Lambda
        CMS_TABLE_NAME: table.tableName,
        BUCKET_NAME: bucket.bucketName
      }
    });

    // Grant Lambda access to table and bucket
    table.grantReadWriteData(lambdaFunction);
    bucket.grantReadWrite(lambdaFunction);

    // Create an S3 Notification referencing the Lambda
    const notification = new s3n.LambdaDestination(lambdaFunction)
    // Add event to S3 bucket
    bucket.addEventNotification(s3.EventType.OBJECT_CREATED, notification)

    // Output DynamoDB values
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
  }

}

module.exports = { S3ToDdbStackStack }
