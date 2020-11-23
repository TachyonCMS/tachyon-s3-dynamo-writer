#!/usr/bin/env node

const cdk = require('@aws-cdk/core');
const { TachyonCmsDatastoreStack } = require('../lib/tachyon-cms-datastore-stack');

const app = new cdk.App();
new TachyonCmsDatastoreStack(app, 'TachyonCmsDatastoreStack');
