#!/usr/bin/env sh

if [ ! -d "$PWD/node_modules" ]; then
  echo "Please run the shell script from the project's root folder"
  exit 1
fi

export NODE_CONFIG_DISABLE_FILE_WATCH="Y"

if [ ! $NODE_LOGGER_LEVEL ]; then
  export NODE_LOGGER_LEVEL='notice'
fi
if [ ! $NODE_LOGGER_GRANULARLEVELS ]; then
  export NODE_LOGGER_GRANULARLEVELS=0
fi
if [ ! $NODE_LOGGER_PLUGIN ]; then
  export NODE_LOGGER_PLUGIN='util'
fi

NBS_CURR_PROJECT_PATH=$PWD

# Ensure NODE_LAUNCH_SCRIPT is set to your main script file
NODE_LAUNCH_SCRIPT=${NODE_LAUNCH_SCRIPT:-server.js}

if [ ! -f "$NODE_LAUNCH_SCRIPT" ]; then
  echo "Launch script: '$NODE_LAUNCH_SCRIPT' could not be located. Aborting..."
  exit 1
fi

export NODE_ENV=production
export NODE_CLUSTERED=${NODE_CLUSTERED:-1}
export NODE_SERVE_STATIC=${NODE_SERVE_STATIC:-1}
export NODE_HOT_RELOAD=0

if [ !  $NODE_CONFIG_DIR ]; then
  export NODE_CONFIG_DIR="$NBS_CURR_PROJECT_PATH/config"
fi
if [ ! -d "$NODE_CONFIG_DIR" ]; then
  mkdir -p $NODE_CONFIG_DIR
fi

if [ ! $NODE_LOG_DIR ]; then
  export NODE_LOG_DIR="$NBS_CURR_PROJECT_PATH/logs"
fi
if [ ! -d "$NODE_LOG_DIR" ]; then
  mkdir -p $NODE_LOG_DIR
fi

if [ ! -f "$NODE_LOG_DIR/pm2.log" ]; then
    touch $NODE_LOG_DIR/pm2.log
fi
if [ ! -f "$NODE_LOG_DIR/out.log" ]; then
    touch $NODE_LOG_DIR/out.log
fi
if [ ! -f "$NODE_LOG_DIR/err.log" ]; then
    touch $NODE_LOG_DIR/err.log
fi

# Start the app with PM2 in production mode
pm2 start $NODE_LAUNCH_SCRIPT --name tattler --output $NODE_LOG_DIR/out.log --error $NODE_LOG_DIR/err.log --log $NODE_LOG_DIR/pm2.log --env production