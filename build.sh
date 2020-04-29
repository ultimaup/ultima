#!/bin/bash

set -e
# get dependencies
echo "Getting Endpoint deps"
cd endpoints
yarn install --frozen-lockfile
cd ..

echo "Getting file-manager deps"
cd file-manager
yarn install --frozen-lockfile
cd ..

echo "Getting router-mgmt deps"
cd router
yarn install --frozen-lockfile
cd ..

echo "Getting frontend deps"
cd frontend
yarn install --frozen-lockfile
cd ..

echo "Getting mgmt deps"
cd mgmt
yarn install --frozen-lockfile

echo "Getting builder/nodejs deps"
cd builders/nodejs
npm ci
cd ../..

echo "Getting development/nodejs deps"
cd development/nodejs
yarn install --frozen-lockfile
cd ../..

cd ..

echo "Getting deployer deps"
cd deployer
yarn install --frozen-lockfile
cd ..

echo "Building frontend"

cd frontend
yarn build
rm -rf node_modules
npm install express
cd ..

echo "Creating tarball"
# Create backup
tar -cpzf ../build-${DRONE_COMMIT_SHA}.tar.gz --exclude .git .

echo "Uploading to S3"
# upload backup to somewhere
host=drone.ultima.re
s3_key="${S3_ACCESS_KEY}"
s3_secret="${S3_ACCESS_SECRET}"

resource="/build-artifacts/build-${DRONE_COMMIT_SHA}.tar.gz"
content_type="application/octet-stream"
date=`date -R`
_signature="PUT\n\n${content_type}\n${date}\n${resource}"
signature=`echo -en ${_signature} | openssl sha1 -hmac ${s3_secret} -binary | base64`

curl -4 -v -X PUT -T "../build-${DRONE_COMMIT_SHA}.tar.gz" \
          -H "Host: $host" \
          -H "Date: ${date}" \
          -H "Content-Type: ${content_type}" \
          -H "Authorization: AWS ${s3_key}:${signature}" \
          http://${host}:9000${resource}

echo "Done"
