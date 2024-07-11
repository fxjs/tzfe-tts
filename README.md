# tzfe-tts

#### 文本转语音服务（支持跨域、鉴权）

### 环境装备
[安装 deno](https://docs.deno.com/runtime/manual/)、pnpm

### 启动
> pnpm start


### 编译包
> pnpm compile
> 
> ./tzfe-tts # 运行
> 
[参考编译文档](https://docs.deno.com/runtime/manual/tools/compiler/)


### 部署生产
nohub - todo

### 环境变量

> TTS_PORT 启动端口默认 8901
> 
> TTS_AUTH_TOKEN 鉴权token


### 使用
```js
fetch('http://localhost:8901/v1/audio/speech', {
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