const { expect, matchTemplate, MatchStyle } = require('@aws-cdk/assert');
const cdk = require('@aws-cdk/core');
const TachyonCmsDatastore = require('../lib/tachyon-cms-datastore-stack');

test('Empty Stack', () => {
    const app = new cdk.App();
    // WHEN
    const stack = new TachyonCmsDatastore.TachyonCmsDatastoreStack(app, 'MyTestStack');
    // THEN
    expect(stack).to(matchTemplate({
      "Resources": {}
    }, MatchStyle.EXACT))
});
