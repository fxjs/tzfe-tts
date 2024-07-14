#!/bin/bash

# 变量定义
SERVICE_NAME="tzfe-tts"
SERVICE_FILE="/etc/systemd/system/$SERVICE_NAME.service"
BIN_PATH="/usr/local/bin/$SERVICE_NAME"
LOG_DIR="/var/log/$SERVICE_NAME"

echo "Removing $SERVICE_NAME service..."
systemctl stop $SERVICE_NAME
systemctl disable $SERVICE_NAME
systemctl daemon-reload

rm -rf $SERVICE_FILE
rm -rf $BIN_PATH
rm -rf $LOG_DIR

echo "$SERVICE_NAME service uninstalled."
