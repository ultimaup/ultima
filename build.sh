#!/bin/bash

# get dependencies
cd endpoints
yarn install --frozen-lockfile
cd ..

cd file-manager
yarn install --frozen-lockfile
cd ..

cd mgmt
yarn install --frozen-lockfile

cd builders/nodejs
npm ci
cd ../..

cd ..


# Create backup
tar -cvpJf build-${DRONE_COMMIT_SHA}.tar.xz --exclude build-${DRONE_COMMIT_SHA}.tar.xz .

# upload backup to somewhere
