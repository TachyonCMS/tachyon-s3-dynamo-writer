#!/usr/bin/env node

const cdk = require('@aws-cdk/core');
const { S3ToDdbStackStack } = require('../lib/s3-to-ddb-stack-stack');

const app = new cdk.App();
new S3ToDdbStackStack(app, 'S3ToDdbStackStack');
