#!/bin/bash

# 日志轮转配置文件
CONFIG_FILE="/etc/logrotate.d/tzfe-tts"

cat <<EOL > $CONFIG_FILE
/var/log/tzfe-tts/tzfe-tts.log {
    size 200M
    rotate 10
    compress
    delaycompress
    notifempty
    create 0640 root root
    sharedscripts
    postrotate
        systemctl reload tzfe-tts.service > /dev/null 2>&1 || true
    endscript
}
EOL

echo 'done'