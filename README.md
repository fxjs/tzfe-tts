# tzfe-tts

#### 文本转语音服务（支持跨域、鉴权）


### 环境装备
[安装 deno](https://docs.deno.com/runtime/manual/)、[pnpm](https://pnpm.io/installation)

### 启动
```shell
pnpm start
```

### 编译
```shell
pnpm compile:linux
#pnpm compile:macos
#pnpm compile:windows
pnpm compile:linux
# 运行二进制包
./tzfe-tts
```
[参考编译文档](https://docs.deno.com/runtime/manual/tools/compiler/)


### 环境变量
```text
TTS_PORT 启动端口默认 8901

TTS_AUTH_TOKEN 鉴权token （如设置为TestToken，调用接口时需在headers里添加Authorization字段）
```


### 部署（以 Arch、Debian 为例）
##### 方式1. 注册 service 服务
```shell
sudo sh ./install.sh

# 查看服务状态
systemctl status tzfe-tts

# 查看日志
tail -F /var/log/tzfe-tts/tzfe-tts.log
```

##### 方式2. Docker镜像
~_~

### 卸载
```shell
sudo sh ./uninstall.sh
```

### 调用
```js
fetch('http://0.0.0.0:8901/v1/audio/speech', {
  method: 'POST',
  // headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + 'TestToken' },
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'zh-CN-shaanxi-XiaoniNeural',
    input: '网关异常，请及时处理。',
    voice: 'rate:0|pitch:0'
  })
})
  .then((response) => response.blob())
  .then((blob) => {
    const audioUrl = URL.createObjectURL(blob);
    const audio = new Audio(audioUrl);
    audio.play();
  });
```