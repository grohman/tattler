#!/usr/bin/env sh

# Ensure NODE_LAUNCH_SCRIPT is set to your main script file
NODE_LAUNCH_SCRIPT=${NODE_LAUNCH_SCRIPT:-server.js}

# Stop the app with PM2
pm2 stop tattler