#!/usr/bin/env sh

export NODE_ENV=development
export NODE_CLUSTERED=0
export NODE_SERVE_STATIC=1
export NODE_HOT_RELOAD=1
export NODE_LOGGER_GRANULARLEVELS=1

# Set NODE_APP_INSTANCE to an empty value to avoid warnings from node-config
export NODE_APP_INSTANCE=""

# Ensure NODE_LAUNCH_SCRIPT is set to your main script file
NODE_LAUNCH_SCRIPT=${NODE_LAUNCH_SCRIPT:-server.js}

# Function to stop the PM2 process
cleanup() {
    pm2 delete tattler-dev
}

# Trap SIGINT (Ctrl+C), SIGTERM (kill command), and EXIT to stop PM2
trap cleanup SIGINT SIGTERM EXIT

# Start the app with PM2 in watch mode, and prevent auto-restart
pm2 start $NODE_LAUNCH_SCRIPT --name tattler-dev --watch --no-autorestart --no-daemon