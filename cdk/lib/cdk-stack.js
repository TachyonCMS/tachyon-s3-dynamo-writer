const cdk = require('@aws-cdk/core')
const s3 = require('@aws-cdk/aws-s3')
const dynamo = require('@aws-cdk/aws-s3-notifications')
const lambda = require('@aws-cdk/aws-lambda')
const dynamo = require('@aws-cdk/aws-dynamodb')

class CdkStack extends cdk.Stack {
  /**
   *
   * @param {cdk.Construct} scope
   * @param {string} id
   * @param {cdk.StackProps=} props
   */
  constructor(scope, id, props) {
    super(scope, id, props);

    // Create the Topic so we can reference it in S3
    const TachyonCmsFileUpdates = new sns.Topic(this, 'TachyonCmsFileUpdates');

    // Create the S3 bucket that will accept the CMS files
    new s3.Bucket(this, 'TachyonCmsFiles', {
      versioned: true
    });
  }
}

module.exports = { CdkStack }
