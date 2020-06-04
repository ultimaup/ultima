#!/bin/bash

mode=${DRONE_BRANCH}

echo "Going to deploy ${mode}"
if [ $mode = "master" ]
then
        curl -4 -X "POST"  http://build.onultima.com:4480/build-${DRONE_COMMIT_SHA}.tar.gz
elif [ $mode = "staging" ]
then
        echo "is staging"
else
        echo "not necessary"
fi
