#!/bin/bash
sudo npm install pm2 -g
npm ci && npm i
chmod u+x ./bin/start.sh
chmod u+x ./bin/stop.sh
chmod u+x ./bin/dev_start.sh
