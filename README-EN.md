# tzfe-tts

#### Text-to-Speech Service (Supports CORS, Authentication)

### Environment Setup
Install [deno](https://docs.deno.com/runtime/manual/), [pnpm](https://pnpm.io/installation)

### Start
```shell
pnpm start
```

### Compile
```shell
pnpm compile:linux
#pnpm compile:macos
#pnpm compile:windows
pnpm compile:linux
# Run the binary package
./tzfe-tts
```
[Reference Compilation Documentation](https://docs.deno.com/runtime/manual/tools/compiler/)

### Environment Variables
```text
TTS_PORT The default startup port is 8901

TTS_AUTH_TOKEN Authentication token (if set to TestToken, the Authorization field must be added in the headers when calling the interface)
```

### Deployment (Examples for Arch, Debian)
##### Method 1. Register as a service
```shell
sudo sh ./install.sh

# Check service status
systemctl status tzfe-tts

# View logs
tail -F /var/log/tzfe-tts/tzfe-tts.log
```

##### Method 2. Docker Image
~_~

### Uninstall
```shell
sudo sh ./uninstall.sh
```

### Usage
```js
fetch('http://0.0.0.0:8901/v1/audio/speech', {
  method: 'POST',
  // headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + 'TestToken' },
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'zh-CN-shaanxi-XiaoniNeural',
    input: 'Gateway error, please handle promptly.',
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

