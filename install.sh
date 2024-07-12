#!/bin/bash

# 变量定义
SERVICE_NAME="tzfe-tts"
GITHUB_REPO="fxjs/$SERVICE_NAME"  # GitHub 仓库
SERVICE_FILE="/etc/systemd/system/$SERVICE_NAME.service"
TMP_DIR="/tmp/$SERVICE_NAME"
BIN_DIR="/usr/local/bin"
LOG_DIR="/var/log/$SERVICE_NAME"
LOG_FILE="$LOG_DIR/$SERVICE_NAME.log"

# 手动指定平台
PLATFORM="x86_64-unknown-linux-gnu"  # 请根据需要修改这个值，例如 "aarch64-unknown-linux-gnu", "x86_64-apple-darwin" 等

# 获取最新的 release 下载链接
LATEST_RELEASE_URL=$(curl -s "https://api.github.com/repos/$GITHUB_REPO/releases/latest" | grep "browser_download_url" | grep "$PLATFORM.tar.gz" | cut -d '"' -f 4)

if [ -z "$LATEST_RELEASE_URL" ]; then
  echo "Error: Failed to fetch the latest release URL for platform $PLATFORM."
  exit 1
fi

# 创建临时目录
echo "Creating temporary directory..."
mkdir -p $TMP_DIR

# 下载最新的 tar.gz 压缩包
echo "Downloading $SERVICE_NAME tar.gz..."
wget -O $TMP_DIR/$SERVICE_NAME.tar.gz $LATEST_RELEASE_URL

# 解压 tar.gz 压缩包
echo "Extracting $SERVICE_NAME binary..."
tar -xzf $TMP_DIR/$SERVICE_NAME.tar.gz -C $TMP_DIR

# 移动二进制文件到目标目录
BIN_NAME="$SERVICE_NAME-$PLATFORM"
if [ -f "$TMP_DIR/$BIN_NAME" ]; then
  mv $TMP_DIR/$BIN_NAME $BIN_DIR/$SERVICE_NAME
  chmod +x $BIN_DIR/$SERVICE_NAME
else
  echo "Error: $BIN_NAME binary not found in the tar.gz archive."
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
AssertFileIsExecutable=$BIN_DIR/$SERVICE_NAME

[Service]
User=root
Group=root
ProtectProc=invisible
# 配置环境变量
#Environment="TTS_PORT=8901" "TTS_AUTH_TOKEN=TestToken"
Environment="TTS_PORT=8901"
ExecStart=$BIN_DIR/$SERVICE_NAME
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
