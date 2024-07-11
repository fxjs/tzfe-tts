/**
 * tzfe-tts 语音转译服务
 * @ENV 环境变量：TTS_PORT-启动端口、TTS_AUTH_TOKEN-鉴权token
 * @BY FX
 */

import { serve } from 'https://deno.land/std/http/server.ts';
import { EdgeSpeechTTS } from 'https://esm.sh/@lobehub/tts@1';

const TTS_PORT = Deno.env.get('TTS_PORT');
const PORT = Number(TTS_PORT) || 8901;
const TTS_AUTH_TOKEN = Deno.env.get('TTS_AUTH_TOKEN');
const VOICES_URL =
  'https://speech.platform.bing.com/consumer/speech/synthesize/readaloud/voices/list?trustedclienttoken=6A5AA1D4EAFF4E9FB37E23D68491D6F4';

async function fetchVoiceList() {
  const response = await fetch(VOICES_URL);
  const voices = await response.json();
  return voices.reduce(
    (acc: Record<string, { model: string; name: string; friendlyName: string; locale: string }[]>, voice: any) => {
      const { ShortName: model, ShortName: name, FriendlyName: friendlyName, Locale: locale } = voice;
      if (!acc[locale]) acc[locale] = [];
      acc[locale].push({ model, name, friendlyName, locale });
      return acc;
    },
    {}
  );
}

async function synthesizeSpeech(model: string, voice: string, text: string) {
  const voiceName = model;
  const params = Object.fromEntries(voice.split('|').map((p) => p.split(':') as [string, string]));
  const rate = Number(params['rate'] || 0);
  const pitch = Number(params['pitch'] || 0);

  const tts = new EdgeSpeechTTS({ locale: 'zh-CN' });

  const payload = {
    input: text,
    options: {
      rate: rate,
      pitch: pitch,
      voice: voiceName,
    },
  };
  const response = await tts.create(payload);
  const mp3Buffer = new Uint8Array(await response.arrayBuffer());

  console.log(`Successfully synthesized speech, returning audio/mpeg response`);
  return new Response(mp3Buffer, {
    headers: { 'Content-Type': 'audio/mpeg' },
  });
}

function unauthorized(req: Request) {
  const authHeader = req.headers.get('Authorization');
  return TTS_AUTH_TOKEN && authHeader !== `Bearer ${TTS_AUTH_TOKEN}`;
}

function validateContentType(req: Request, expected: string) {
  const contentType = req.headers.get('Content-Type');
  if (contentType !== expected) {
    console.log(`Invalid Content-Type ${contentType}, expected ${expected}`);
    return new Response('Bad Request', { status: 400 });
  }
}

async function handleDebugRequest(req: Request) {
  const url = new URL(req.url);
  const voice = url.searchParams.get('voice') || '';
  const model = url.searchParams.get('model') || '';
  const text = url.searchParams.get('text') || '';

  console.log(`Debug request with model=${model}, voice=${voice}, text=${text}`);

  if (!voice || !model || !text) {
    console.log('Missing required parameters');
    return new Response('Bad Request', { status: 400 });
  }

  // return synthesizeSpeech(model, voice, text);
  // Add CORS headers
  return synthesizeSpeech(model, voice, text).then((response) => {
    response.headers.set('Access-Control-Allow-Origin', '*'); // Or specify a particular origin
    response.headers.set('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    return response;
  });
}

async function handleSynthesisRequest(req: Request) {
  if (req.method === 'OPTIONS') {
    // Respond to preflight request
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*', // Specify the allowed origin(s)
        'Access-Control-Allow-Methods': 'POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      },
    });
  }

  if (req.method !== 'POST') {
    console.log(`Invalid method ${req.method}, expected POST`);
    return new Response('Method Not Allowed', { status: 405 });
  }

  if (unauthorized(req)) {
    console.log('Unauthorized request');
    return new Response('Unauthorized', { status: 401 });
  }

  const invalidContentType = validateContentType(req, 'application/json');
  if (invalidContentType) return invalidContentType;

  const { model, input, voice } = await req.json();
  console.log(`Synthesis request with model=${model}, input=${input}, voice=${voice}`);

  // return synthesizeSpeech(model, voice, input);
  // Add CORS headers
  return synthesizeSpeech(model, voice, input).then((response) => {
    response.headers.set('Access-Control-Allow-Origin', '*'); // Or specify a particular origin
    response.headers.set('Access-Control-Allow-Methods', 'POST,OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    return response;
  });
}

async function handleDemoRequest(req: Request) {
  const groupedVoiceList = await fetchVoiceList();
  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><link rel="icon" href="data:image/ico;base64,aWNv"><title>合成语音调试</title><link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;700&display=swap" rel="stylesheet"><style>:root{--primary-color:#6c8bd6;--primary-light:#a2b3e3;--primary-dark:#3d5b8f;--secondary-color:#f08080;--text-color:#333;--text-secondary:#777;--bg-color:#fff}body{font-family:'Noto Sans SC','Arial',sans-serif;color:var(--text-color);margin:0;padding:0;display:flex;justify-content:center;background-color:#fafafa;background-image:linear-gradient(135deg,#f5f7fa 0%,#c3cfe2 100%);position:relative;overflow:hidden}body::before{content:"";position:absolute;top:0;left:0;right:0;bottom:0;background:repeating-radial-gradient(circle at 50% 50%,rgba(255,255,255,0.8) 0%,rgba(255,255,255,0.8) 2%,transparent 2%,transparent 4%,rgba(255,255,255,0.8) 4%,rgba(255,255,255,0.8) 6%,transparent 6%,transparent 8%,rgba(255,255,255,0.8) 8%,rgba(255,255,255,0.8) 10%,transparent 10%),repeating-linear-gradient(45deg,#D4F4FF 0%,#D4F4FF 5%,#E6F9FF 5%,#E6F9FF 10%,#F0FAFF 10%,#F0FAFF 15%,#E6F9FF 15%,#E6F9FF 20%,#D4F4FF 20%,#D4F4FF 25%);background-blend-mode:multiply;opacity:0.8;z-index:-1;animation:glitch 15s infinite}.container{display:flex;max-width:1200px;width:100%;margin:40px;background:#fff;border-radius:12px;position:relative;background-color:rgba(255,255,255,0.8);z-index:1}@keyframes glitch{0%{background-position:0 0,0 0;filter:hue-rotate(0deg)}50%{background-position:10px 10px,-10px 10px;filter:hue-rotate(360deg)}100%{background-position:0 0,0 0;filter:hue-rotate(0deg)}}.input-area,.output-area{padding:30px;width:50%}.input-area{border-right:1px solid #E0E0E0}h1{font-size:36px;color:var(--primary-color);margin-bottom:30px}.filter-section{margin-bottom:30px}.filter-section label{display:block;font-size:16px;color:var(--text-secondary);margin-bottom:10px}.filter-section input{font-size:16px;padding:10px 15px;border:2px solid var(--primary-light);border-radius:8px;outline:none;transition:border-color .3s,box-shadow .3s;width:100%;box-sizing:border-box}.filter-section input:focus{border-color:var(--primary-color);box-shadow:0 0 0 2px var(--primary-light)}.slider-container{margin-bottom:30px}.slider-container label{display:block;font-size:16px;color:var(--text-secondary);margin-bottom:10px}.slider{-webkit-appearance:none;width:100%;height:10px;border-radius:5px;background:linear-gradient(to right,var(--secondary-color) 0%,var(--primary-color) 50%,var(--primary-light) 100%);box-shadow:inset 0 1px 2px rgba(0,0,0,0.1),0 1px rgba(255,255,255,0.1);outline:none;opacity:0.7;-webkit-transition:.2s;transition:opacity .2s;margin-bottom:10px}.slider:hover{opacity:1}.slider::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:20px;height:20px;border-radius:50%;background:#fff;border:2px solid var(--primary-color);cursor:pointer}.slider::-moz-range-thumb{width:20px;height:20px;border-radius:50%;background:#fff;border:2px solid var(--primary-color);cursor:pointer}.slider-value{font-size:14px;color:var(--text-secondary)}.textarea-container{margin-bottom:30px}.textarea-container label{display:block;font-size:18px;margin-bottom:10px}.textarea-container textarea{width:100%;padding:10px;font-size:16px;border:2px solid var(--primary-light);border-radius:8px;outline:none;resize:vertical;transition:border-color .3s,box-shadow .3s;box-sizing:border-box;height:200px}.textarea-container textarea:focus{border-color:var(--primary-color);box-shadow:0 0 0 2px var(--primary-light)}.voice-group{margin-bottom:20px;border:2px solid var(--primary-light);border-radius:12px;overflow:hidden;cursor:move;background:#fff}.voice-header{padding:15px 20px;font-size:18px;background:var(--primary-light);color:#fff;cursor:pointer;display:flex;justify-content:space-between;align-items:center}.voice-header:hover{background:var(--primary-color)}.voice-buttons{padding:20px;display:none;gap:12px;flex-wrap:wrap}.voice-button{background:var(--secondary-color);color:#fff;border:none;padding:10px 20px;border-radius:50px;cursor:pointer;transition:filter .3s}.voice-button:hover{filter:brightness(0.9)}.chevron{transition:transform .3s}.voice-group.open .voice-buttons{display:flex}.voice-group.open .chevron{transform:rotate(180deg)}.dragging{opacity:0.5}</style></head><body><div class="container"><small style="position: absolute;bottom: -35px;color: #999;font-family: none;left: 50%;transform: translateX(-50%);">@BY FX </small><div class="input-area"><h1>输入文本</h1><div class="filter-section"><label for="keywords">Speaker筛选:</label><input type="text" id="keywords" value="CN-"></div><div class="slider-container"><label for="rate">语速:</label><input type="range" min="-1" max="1" step="0.1" value="0" class="slider" id="rate"><div class="slider-value" id="rateValue">0</div><label for="pitch">音调:</label><input type="range" min="-1" max="1" step="0.1" value="0" class="slider" id="pitch"><div class="slider-value" id="pitchValue">0</div></div><div class="textarea-container"><label for="inputText">输入文本:</label><textarea id="inputText">本辖区发生新的警情，请及时处置。</textarea></div></div><div class="output-area"><h1>选择语音</h1><div id="voices"></div></div></div><script>const voiceList = ${JSON.stringify(groupedVoiceList)};let audio=null;function filterVoices(){const keywords=document.getElementById('keywords').value.split(',').map(k=>k.trim().toLowerCase());const voicesDiv=document.getElementById('voices');voicesDiv.innerHTML='';const filteredVoices={};for(const[locale,voices]of Object.entries(voiceList)){const filtered=voices.filter(({name,friendlyName})=>keywords.some(keyword=>name.toLowerCase().includes(keyword)||friendlyName.toLowerCase().includes(keyword)));if(filtered.length>0){filteredVoices[locale]=filtered}}for(const[locale,voices]of Object.entries(filteredVoices)){const group=document.createElement('div');group.className='voice-group';group.draggable=true;const header=document.createElement('div');header.className='voice-header';header.textContent=locale.toUpperCase();const chevron=document.createElement('span');chevron.className='chevron';chevron.innerHTML='&#9660;';header.appendChild(chevron);const buttonsContainer=document.createElement('div');buttonsContainer.className='voice-buttons';voices.forEach(({model,name})=>{const button=document.createElement('button');button.className='voice-button';button.textContent=name;button.onclick=()=>synthesize(model);buttonsContainer.appendChild(button)});header.onclick=()=>{group.classList.toggle('open')};group.appendChild(header);group.appendChild(buttonsContainer);voicesDiv.appendChild(group)}addDragDropListeners()}function synthesize(model){const text=document.getElementById('inputText').value||'Hello world';const rate=document.getElementById('rate').value||'-0.1';const pitch=document.getElementById('pitch').value||'0.1';const voice=\`rate:\${rate}|pitch:\${pitch}\`;if(audio){audio.pause();audio.currentTime=0}fetch('./v1/audio/speech',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model,input:text,voice})}).then(response=>response.blob()).then(blob=>{const audioUrl=URL.createObjectURL(blob);audio=new Audio(audioUrl);audio.play()})}function addDragDropListeners(){const voicesDiv=document.getElementById('voices');let draggedItem=null;voicesDiv.addEventListener('dragstart',e=>{draggedItem=e.target;e.target.classList.add('dragging')});voicesDiv.addEventListener('dragend',e=>{e.target.classList.remove('dragging');draggedItem=null});voicesDiv.addEventListener('dragover',e=>{e.preventDefault();const afterElement=getDragAfterElement(voicesDiv,e.clientY);if(afterElement==null){voicesDiv.appendChild(draggedItem)}else{voicesDiv.insertBefore(draggedItem,afterElement)}})}function getDragAfterElement(container,y){const draggableElements=[...container.querySelectorAll('.voice-group:not(.dragging)')];return draggableElements.reduce((closest,child)=>{const box=child.getBoundingClientRect();const offset=y-box.top-box.height/2;if(offset<0&&offset>closest.offset){return{offset:offset,element:child}}else{return closest}},{offset:Number.NEGATIVE_INFINITY}).element}filterVoices();document.getElementById('keywords').addEventListener('input',filterVoices);const rateSlider=document.getElementById('rate');const rateValue=document.getElementById('rateValue');rateSlider.oninput=function(){rateValue.innerHTML=this.value};const pitchSlider=document.getElementById('pitch');const pitchValue=document.getElementById('pitchValue');pitchSlider.oninput=function(){pitchValue.innerHTML=this.value}</script></body></html>`;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html' },
  });
}

serve(
  async (req: any) => {
    try {
      const url = new URL(req.url);

      if (url.pathname === '/') {
        return handleDemoRequest(req);
      }

      // if (url.pathname === '/tts') {
      //   return handleDebugRequest(req);
      // }

      if (url.pathname !== '/v1/audio/speech') {
        console.log(`Unhandled path ${url.pathname}`);
        return new Response('Not Found', { status: 404 });
      }

      return handleSynthesisRequest(req);
    } catch (err: any) {
      console.error(`Error processing request: ${err.message}`);
      return new Response(`Internal Server Error\n${err.message}`, {
        status: 500,
      });
    }
  },
  {
    port: PORT,
    onListen(info: any) {
      const obj = Object.assign({}, info);
      console.log('PRESET ENV::');
      console.log(' TTS_PORT', TTS_PORT);
      console.log(' TTS_AUTH_TOKEN', TTS_AUTH_TOKEN);
      console.log('Server started::', obj);
      console.log(':)');
      console.log('');
    },
  }
);
