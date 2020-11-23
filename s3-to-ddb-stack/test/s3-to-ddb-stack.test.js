const { expect, matchTemplate, MatchStyle } = require('@aws-cdk/assert');
const cdk = require('@aws-cdk/core');
const S3ToDdbStack = require('../lib/s3-to-ddb-stack-stack');

test('Empty Stack', () => {
    const app = new cdk.App();
    // WHEN
    const stack = new S3ToDdbStack.S3ToDdbStackStack(app, 'MyTestStack');
    // THEN
    expect(stack).to(matchTemplate({
      "Resources": {}
    }, MatchStyle.EXACT))
});
