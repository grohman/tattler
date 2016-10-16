#!/bin/bash
sudo npm install supervisor -g
sudo npm install bower -g
sudo npm install forever -g
npm install
chmod u+x ./bin/start.sh
chmod u+x ./bin/stop.sh
chmod u+x ./bin/dev_start.sh
