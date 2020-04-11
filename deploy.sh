#!/bin/bash

mode=${DRONE_BRANCH}

echo "Going to deploy ${mode}"
curl -X "POST"  http://ultima.re:4480/build-${DRONE_COMMIT_SHA}.tar.xz
if [ $mode = "master" ]
then
        curl -X "POST"  http://ultima.re:4480/build-${DRONE_COMMIT_SHA}.tar.xz
elif [ $mode = "staging" ]
then
        echo "is staging"
else
        echo "not necessary"
fi
