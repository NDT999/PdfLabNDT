export async function loadImageToCanvas(source) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      resolve(canvas);
    };
    img.onerror = reject;
    if (source instanceof File) {
      img.src = URL.createObjectURL(source);
    } else {
      img.src = source;
    }
  });
}

function cloneCanvas(canvas) {
  const newCanvas = document.createElement('canvas');
  newCanvas.width = canvas.width;
  newCanvas.height = canvas.height;
  const ctx = newCanvas.getContext('2d');
  ctx.drawImage(canvas, 0, 0);
  return newCanvas;
}

export function toGrayscale(canvas) {
  const newCanvas = document.createElement('canvas');
  newCanvas.width = canvas.width;
  newCanvas.height = canvas.height;
  const ctx = newCanvas.getContext('2d');
  ctx.drawImage(canvas, 0, 0);
  const imageData = ctx.getImageData(0, 0, newCanvas.width, newCanvas.height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    data[i] = data[i + 1] = data[i + 2] = gray;
  }
  ctx.putImageData(imageData, 0, 0);
  return newCanvas;
}

function calculateOtsuThreshold(data) {
  let hist = new Array(256).fill(0);
  for (let i = 0; i < data.length; i += 4) {
    hist[Math.round(data[i])]++;
  }
  let total = data.length / 4;
  let sum = 0;
  for (let t = 0; t < 256; t++) sum += t * hist[t];
  let sumB = 0;
  let wB = 0;
  let wF = 0;
  let varMax = 0;
  let threshold = 0;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (wB === 0) continue;
    wF = total - wB;
    if (wF === 0) break;
    sumB += t * hist[t];
    let mB = sumB / wB;
    let mF = (sum - sumB) / wF;
    let varBetween = wB * wF * (mB - mF) * (mB - mF);
    if (varBetween > varMax) {
      varMax = varBetween;
      threshold = t;
    }
  }
  return threshold;
}

export function binarize(canvas, threshold = 'auto') {
  const newCanvas = toGrayscale(canvas);
  const ctx = newCanvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, newCanvas.width, newCanvas.height);
  const data = imageData.data;
  let t = threshold;
  if (threshold === 'auto') {
    t = calculateOtsuThreshold(data);
  }
  for (let i = 0; i < data.length; i += 4) {
    const val = data[i] >= t ? 255 : 0;
    data[i] = data[i + 1] = data[i + 2] = val;
  }
  ctx.putImageData(imageData, 0, 0);
  return newCanvas;
}

function getProjectionVariance(canvas, angle) {
  const rotated = rotateCanvas(canvas, angle);
  const ctx = rotated.getContext('2d', { willReadFrequently: true });
  const width = rotated.width;
  const height = rotated.height;
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  
  const projection = new Array(height).fill(0);
  for (let y = 0; y < height; y++) {
    let sum = 0;
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (data[i] < 128) sum++;
    }
    projection[y] = sum;
  }
  
  let mean = projection.reduce((a, b) => a + b, 0) / height;
  let variance = projection.reduce((a, b) => a + (b - mean) ** 2, 0) / height;
  return variance;
}

export function detectSkewAngle(canvas) {
  let workCanvas = canvas;
  if (canvas.width > 800) {
    const scale = 800 / canvas.width;
    workCanvas = document.createElement('canvas');
    workCanvas.width = 800;
    workCanvas.height = Math.round(canvas.height * scale);
    const ctx = workCanvas.getContext('2d');
    ctx.drawImage(canvas, 0, 0, workCanvas.width, workCanvas.height);
  }
  workCanvas = binarize(workCanvas, 'auto');
  
  let maxVar = -1;
  let bestAngle = 0;
  for (let angle = -15; angle <= 15; angle += 0.5) {
    const variance = getProjectionVariance(workCanvas, angle);
    if (variance > maxVar) {
      maxVar = variance;
      bestAngle = angle;
    }
  }
  return bestAngle;
}

export function deskew(canvas) {
  const angle = detectSkewAngle(canvas);
  return {
    canvas: rotateCanvas(canvas, -angle),
    angle
  };
}

export function rotateCanvas(canvas, degrees) {
  const radians = (degrees * Math.PI) / 180;
  const newCanvas = document.createElement('canvas');
  const sin = Math.abs(Math.sin(radians));
  const cos = Math.abs(Math.cos(radians));
  newCanvas.width = canvas.width * cos + canvas.height * sin;
  newCanvas.height = canvas.width * sin + canvas.height * cos;
  
  const ctx = newCanvas.getContext('2d');
  ctx.translate(newCanvas.width / 2, newCanvas.height / 2);
  ctx.rotate(radians);
  ctx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);
  return newCanvas;
}

export function detectOrientation(canvas) {
  let workCanvas = canvas;
  if (canvas.width > 800 || canvas.height > 800) {
    const scale = Math.min(800 / canvas.width, 800 / canvas.height);
    workCanvas = document.createElement('canvas');
    workCanvas.width = Math.round(canvas.width * scale);
    workCanvas.height = Math.round(canvas.height * scale);
    const ctx = workCanvas.getContext('2d');
    ctx.drawImage(canvas, 0, 0, workCanvas.width, workCanvas.height);
  }
  workCanvas = binarize(workCanvas, 'auto');
  
  let maxVar = -1;
  let bestRotation = 0;
  const angles = [0, 90, 180, 270];
  
  for (const angle of angles) {
    const variance = getProjectionVariance(workCanvas, angle);
    if (variance > maxVar) {
      maxVar = variance;
      bestRotation = angle;
    }
  }
  return bestRotation;
}

export function adjustContrastBrightness(canvas, contrast = 1.0, brightness = 0) {
  const newCanvas = cloneCanvas(canvas);
  const ctx = newCanvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, newCanvas.width, newCanvas.height);
  const data = imageData.data;
  
  for (let i = 0; i < data.length; i += 4) {
    data[i] = ((data[i] - 128) * contrast) + 128 + brightness;
    data[i+1] = ((data[i+1] - 128) * contrast) + 128 + brightness;
    data[i+2] = ((data[i+2] - 128) * contrast) + 128 + brightness;
  }
  ctx.putImageData(imageData, 0, 0);
  return newCanvas;
}

export function denoise(canvas, radius = 1) {
  if (radius < 1) return cloneCanvas(canvas);
  const newCanvas = cloneCanvas(canvas);
  const ctx = newCanvas.getContext('2d');
  ctx.filter = `blur(${radius}px)`;
  ctx.drawImage(canvas, 0, 0);
  return newCanvas;
}

export function invertColors(canvas) {
  const newCanvas = cloneCanvas(canvas);
  const ctx = newCanvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, newCanvas.width, newCanvas.height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 255 - data[i];
    data[i+1] = 255 - data[i+1];
    data[i+2] = 255 - data[i+2];
  }
  ctx.putImageData(imageData, 0, 0);
  return newCanvas;
}

export function canvasToBlob(canvas, type = 'image/png', quality = 0.92) {
  return new Promise((resolve) => {
    canvas.toBlob(resolve, type, quality);
  });
}
