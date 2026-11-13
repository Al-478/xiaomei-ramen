// 仅用于开发预览：让同一微信运行包绘制到浏览器画布，不进入发布目录。
(() => {
  const canvas = document.getElementById('game');
  const callbacks = new Map();
  const pointers = new Map();
  const imagePaths = [];
  const texts = new Map();
  const drawn = [];
  const context = canvas.getContext('2d');
  const nativeText = context.fillText.bind(context), nativeTransform = context.setTransform.bind(context);
  const nativeFill = context.fillRect.bind(context);
  const nativeDraw=context.drawImage.bind(context);
  context.drawImage=(image,...args)=>{
    if(typeof image.src==='string' && drawn.length<128) drawn.push({path:image.src,x:args[args.length-4],y:args[args.length-3],w:args[args.length-2],h:args[args.length-1]});
    nativeDraw(image,...args);
  };
  context.fillRect = (x,y,w,h) => {
    if(x===0&&y===0&&w===canvas.width&&h===canvas.height&&context.fillStyle==='#542039') {texts.clear();drawn.length=0;}
    nativeFill(x,y,w,h);
  };
  context.fillText = (value, x, y, ...rest) => {
    if (texts.size >= 64 && !texts.has(`${x},${y}`)) texts.clear();
    texts.set(`${x},${y}`, String(value)); nativeText(value, x, y, ...rest);
  };
  context.setTransform = (...args) => {
    nativeTransform(...args);
  };
  const frames = new Set();
  const frameTimes = []; let previousFrame = null;
  const audios = new Set();
  let audioCreates = 0, audioPlays = 0;
  let canvasCreates = 0;
  const nativeRequest = window.requestAnimationFrame.bind(window);
  const nativeCancel = window.cancelAnimationFrame.bind(window);
  window.requestAnimationFrame = callback => {
    let id;
    id = nativeRequest(time => {
      frames.delete(id); if(previousFrame!==null){frameTimes.push(time-previousFrame);if(frameTimes.length>300)frameTimes.shift();}
      previousFrame=time; callback(time);
    });
    frames.add(id); return id;
  };
  window.cancelAnimationFrame = id => { frames.delete(id); nativeCancel(id); };
  const on = (name, callback) => {
    const set = callbacks.get(name) ?? new Set(); set.add(callback); callbacks.set(name, set);
  };
  const off = (name, callback) => callbacks.get(name)?.delete(callback);
  const emit = (name, event) => [...(callbacks.get(name) ?? [])].forEach(callback => callback(event));
  // 开发时复现微信横屏安全区，正式包不包含这些预览参数。
  const insets = (new URLSearchParams(location.search).get('safeInsets') ?? '0,0,0,0').split(',').map(Number);
  const info = () => ({ windowWidth: innerWidth, windowHeight: innerHeight, pixelRatio: devicePixelRatio,
    safeArea: { left: insets[0], top: insets[1], right: innerWidth-insets[2], bottom: innerHeight-insets[3] } });
  let failures = Number(new URLSearchParams(location.search).get('failures') ?? 0);
  const api = {
    createCanvas: () => canvasCreates++ === 0 ? canvas : document.createElement('canvas'),
    createOffscreenCanvas: options => {const layer=document.createElement('canvas');layer.width=options.width;layer.height=options.height;return layer;},
    createImage: () => {
      const image = new Image();
      const descriptor = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
      Object.defineProperty(image, 'src', {
        get: () => descriptor.get.call(image),
        set: value => {
          imagePaths.push(value);
          if (failures > 0) { failures--; queueMicrotask(() => image.onerror?.(new Event('error'))); }
          else descriptor.set.call(image, value);
        },
      });
      return image;
    },
    getWindowInfo: info, getSystemInfoSync: info,
    getStorageSync: key => JSON.parse(localStorage.getItem(key) ?? 'null'),
    setStorageSync: (key, value) => localStorage.setItem(key, JSON.stringify(value)),
    vibrateShort: () => {},
    createInnerAudioContext: () => {
      const element = new Audio(); audios.add(element); audioCreates++;
      const ended = new Set(), failed = new Set();
      element.addEventListener('ended',()=>ended.forEach(fn=>fn()));
      element.addEventListener('error',()=>failed.forEach(fn=>fn()));
      return {
        get src(){return element.getAttribute('src')??'';},set src(value){element.src=value;},
        get loop(){return element.loop;},set loop(value){element.loop=value;},
        get volume(){return element.volume;},set volume(value){element.volume=value;},
        play(){audioPlays++; element.play().catch(error=>{if(error.name!=='AbortError')failed.forEach(fn=>fn());});},
        pause(){element.pause();},stop(){element.pause();element.currentTime=0;},
        destroy(){element.pause();element.removeAttribute('src');element.load();ended.clear();failed.clear();audios.delete(element);},
        onEnded(fn){ended.add(fn);},offEnded(fn){ended.delete(fn);},onError(fn){failed.add(fn);},offError(fn){failed.delete(fn);},
      };
    },
  };
  for (const name of ['TouchStart', 'TouchMove', 'TouchEnd', 'TouchCancel', 'WindowResize', 'Hide', 'Show']) {
    api['on' + name] = callback => on(name, callback);
    api['off' + name] = callback => off(name, callback);
  }
  window.wx = api;
  for (const [type, phase] of [['pointerdown', 'TouchStart'], ['pointermove', 'TouchMove'], ['pointerup', 'TouchEnd'], ['pointercancel', 'TouchCancel']]) {
    canvas.addEventListener(type, event => {
      const touch = { identifier: event.pointerId, clientX: event.clientX, clientY: event.clientY };
      if (type === 'pointerdown') { canvas.setPointerCapture(event.pointerId); pointers.set(event.pointerId, touch); }
      else if (!pointers.has(event.pointerId)) return;
      else if (type === 'pointermove') pointers.set(event.pointerId, touch);
      else pointers.delete(event.pointerId);
      emit(phase, { touches: [...pointers.values()], changedTouches: [touch] });
    });
  }
  window.addEventListener('resize', () => emit('WindowResize'));
  document.addEventListener('visibilitychange', () => { pointers.clear(); emit(document.hidden ? 'Hide' : 'Show'); });
  // 自动验证入口只位于开发适配器，正式游戏运行包不包含此对象。
  window.__preview = {
    imagePaths, emit,drawn:()=>[...drawn],
    textAt: (x, y) => texts.get(`${x},${y}`) ?? '',
    listeners: () => [...callbacks.values()].reduce((n, set) => n + set.size, 0),
    frames: () => frames.size,
    audioCount: () => audios.size,
    audioStats: () => ({created:audioCreates,plays:audioPlays,playing:[...audios].filter(audio=>!audio.paused).length}),
    audioDecoded: () => [...audios].filter(audio=>audio.src).map(audio=>({duration:audio.duration,ready:audio.readyState,error:audio.error?.code??0})),
    performance: () => ({frameTimes:[...frameTimes],canvasWidth:canvas.width,canvasHeight:canvas.height,canvasCreates}),
  };
})();
