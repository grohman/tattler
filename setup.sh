#!/bin/bash
npm install supervisor -g
npm install bower -g
rm -rf ./bin
mv scripts bin
rm -f butler.sh
rm -f package.json
mv package.json.skeleton package.json
npm install
bower install
chmod u+x ./bin/start.sh
chmod u+x ./bin/stop.sh
chmod u+x ./bin/dev_start.sh
