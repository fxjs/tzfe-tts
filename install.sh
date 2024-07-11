#!/bin/bash

# 变量定义
SERVICE_NAME="tzfe-tts"
SERVICE_FILE="/etc/systemd/system/$SERVICE_NAME.service"
BIN_URL="http://localhost:8000/tzfe-tts.tar.gz"  # 请将这个替换为实际的下载地址
TMP_DIR="/tmp/$SERVICE_NAME"
BIN_PATH="/usr/local/bin/$SERVICE_NAME"
LOG_DIR="/var/log/$SERVICE_NAME"
LOG_FILE="$LOG_DIR/$SERVICE_NAME.log"

# 创建临时目录
echo "Creating temporary directory..."
mkdir -p $TMP_DIR

# 下载 tzfe-tts tar.gz 压缩包
echo "Downloading $SERVICE_NAME tar.gz..."
wget -O $TMP_DIR/$SERVICE_NAME.tar.gz $BIN_URL

# 解压 tar.gz 压缩包
echo "Extracting $SERVICE_NAME binary..."
tar -xzf $TMP_DIR/$SERVICE_NAME.tar.gz -C $TMP_DIR

# 移动二进制文件到目标目录
if [ -f "$TMP_DIR/$SERVICE_NAME" ]; then
  mv $TMP_DIR/$SERVICE_NAME $BIN_PATH
  chmod +x $BIN_PATH
else
  echo "Error: $SERVICE_NAME binary not found in the tar.gz archive."
  exit 1
fi

# 清理临时目录
rm -rf $TMP_DIR

# 创建必要的目录
echo "Creating necessary directories..."
mkdir -p $LOG_DIR

# 创建 systemd 服务文件
echo "Creating systemd service file..."
cat <<EOL > $SERVICE_FILE
[Unit]
Description=tzfe-tts
Wants=network-online.target
After=network-online.target
AssertFileIsExecutable=$BIN_PATH

[Service]
User=root
Group=root
ProtectProc=invisible
# 配置环境变量
Environment="TTS_PORT=8901"
ExecStart=$BIN_PATH
Restart=always
LimitNOFILE=1048576
TasksMax=infinity
TimeoutStopSec=infinity
SendSIGKILL=no
StandardOutput=append:$LOG_FILE
StandardError=append:$LOG_FILE

[Install]
WantedBy=multi-user.target
EOL

# 重新加载 systemd 服务配置
echo "Reloading systemd daemon..."
systemctl daemon-reload

# 启动服务
echo "Enabling and starting $SERVICE_NAME service..."
systemctl enable $SERVICE_NAME
systemctl start $SERVICE_NAME

echo "$SERVICE_NAME service installed and started successfully."
