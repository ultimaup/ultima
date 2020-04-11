#!/bin/bash

mode=${DRONE_BRANCH}

echo "Going to deploy ${mode}"
if [ $mode = "master" ]
then
        curl -4 -X "POST"  http://ultima.re:4480/build-${DRONE_COMMIT_SHA}.tar.xz
elif [ $mode = "staging" ]
then
        echo "is staging"
else
        echo "not necessary"
fi
