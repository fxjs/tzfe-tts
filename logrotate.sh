#!/bin/bash

# 日志轮换
touch /etc/logrotate.d/tzfe-tts


#/var/log/tzfe-tts/tzfe-tts.log {
#    size 200M
#    rotate 10
#    compress
#    delaycompress
#    notifempty
#    create 0640 root root
#    sharedscripts
#    postrotate
#        systemctl reload tzfe-tts.service > /dev/null 2>&1 || true
#    endscript
#}


echo 'done'