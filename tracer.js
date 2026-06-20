// tracer.js
(function() {
  const canvas = document.getElementById('tracerCanvas');
  const ctx = canvas.getContext('2d');

  // ----- state -----
  let currentTraces = [];           // array of { strokes: [ {x,y}, ... ], color }
  let animationFrame = null;
  let isAnimating = false;
  let animationProgress = 0;
  let animationStartTime = 0;
  const ANIMATION_DURATION = 1200;

  // drawing settings
  const STROKE_WIDTH = 6;
  const STROKE_COLOR = '#1e293b';
  const TRAIL_COLOR = '#3b82f6';

  // ----- helpers -----
  function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  function drawTraces(progress = 1) {
    clearCanvas();

    if (!currentTraces.length) {
      ctx.save();
      ctx.strokeStyle = '#e9edf2';
      ctx.lineWidth = 0.5;
      for (let i = 0; i < canvas.width; i += 40) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();
      }
      for (let i = 0; i < canvas.height; i += 40) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(canvas.width, i);
        ctx.stroke();
      }
      ctx.restore();
      return;
    }

    let totalPoints = 0;
    const strokeLengths = currentTraces.map(trace => trace.strokes.length);
    const cumulativeLengths = [];
    strokeLengths.forEach((len, idx) => {
      totalPoints += len;
      cumulativeLengths.push(totalPoints);
    });

    const totalPointsToDraw = Math.floor(progress * totalPoints);
    let drawnCount = 0;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (let tIdx = 0; tIdx < currentTraces.length; tIdx++) {
      const trace = currentTraces[tIdx];
      const strokes = trace.strokes;
      const color = trace.color || STROKE_COLOR;

      if (strokes.length < 2) continue;

      let pointsToTake = 0;
      const start = (tIdx === 0) ? 0 : cumulativeLengths[tIdx - 1];
      const end = cumulativeLengths[tIdx];
      const segmentLen = end - start;

      if (totalPointsToDraw <= start) {
        continue;
      } else if (totalPointsToDraw >= end) {
        pointsToTake = strokes.length;
      } else {
        const offset = totalPointsToDraw - start;
        pointsToTake = Math.min(strokes.length, Math.floor(offset));
      }

      if (pointsToTake < 2) {
        if (pointsToTake === 1) {
          const p = strokes[0];
          ctx.beginPath();
          ctx.arc(p.x, p.y, STROKE_WIDTH/2.8, 0, Math.PI * 2);
          ctx.fillStyle = color;
          ctx.fill();
        }
        continue;
      }

      ctx.beginPath();
      ctx.moveTo(strokes[0].x, strokes[0].y);
      for (let i = 1; i < pointsToTake; i++) {
        ctx.lineTo(strokes[i].x, strokes[i].y);
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = STROKE_WIDTH;
      ctx.stroke();
    }

    if (progress < 1 && progress > 0.02) {
      ctx.save();
      ctx.globalAlpha = 0.1;
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = STROKE_WIDTH * 0.6;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (const trace of currentTraces) {
        const strokes = trace.strokes;
        if (strokes.length < 2) continue;
        ctx.beginPath();
        ctx.moveTo(strokes[0].x, strokes[0].y);
        for (let i = 1; i < strokes.length; i++) {
          ctx.lineTo(strokes[i].x, strokes[i].y);
        }
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  // ----- generate letter/word trace -----
  function generateTraceFromText(text) {
    if (!text || text.length === 0) return [];

    const traces = [];
    const words = text.split(' ');
    let xOffset = 40;
    const yBase = 150;
    const letterWidth = 50;
    const gap = 30;
    const maxWidth = canvas.width - 60;

    let totalWidth = 0;
    for (let w of words) {
      totalWidth += w.length * letterWidth + (w.length > 0 ? (w.length-1) * 10 : 0);
    }
    totalWidth += (words.length - 1) * gap;
    let scale = 1;
    if (totalWidth > maxWidth) {
      scale = maxWidth / totalWidth;
    }

    const letterPaths = {
      'a': [[30,10],[22,30],[30,50],[40,30],[30,10],[30,50],[45,30],[30,30]],
      'b': [[20,10],[20,50],[20,20],[35,20],[40,30],[35,45],[20,50]],
      'c': [[40,20],[25,20],[20,30],[25,45],[40,45]],
      'd': [[45,10],[45,50],[45,20],[30,20],[25,30],[30,45],[45,50]],
      'e': [[40,15],[22,15],[20,30],[38,30],[25,30],[22,45],[40,45]],
      'f': [[25,10],[25,40],[40,40],[25,40],[25,25],[15,25]],
      'g': [[40,20],[30,20],[25,30],[30,45],[45,45],[40,30],[30,30],[30,55],[40,60]],
      'h': [[20,10],[20,50],[20,30],[35,30],[35,50],[35,30]],
      'i': [[25,10],[25,20],[25,35],[25,25],[25,15]],
      'j': [[30,10],[30,20],[30,40],[25,50],[35,55]],
      'k': [[20,10],[20,50],[20,30],[40,20],[20,30],[40,40]],
      'l': [[20,10],[20,50]],
      'm': [[20,50],[20,10],[30,30],[40,10],[40,50]],
      'n': [[20,50],[20,10],[35,10],[35,50]],
      'o': [[30,20],[20,30],[25,45],[40,45],[45,30],[30,20]],
      'p': [[25,10],[25,50],[25,25],[40,25],[45,35],[40,45],[25,50]],
      'q': [[35,15],[25,20],[20,35],[30,50],[45,40],[35,15],[35,55],[45,60]],
      'r': [[20,10],[20,50],[20,25],[35,25],[45,15],[35,40]],
      's': [[40,15],[25,15],[20,25],[35,30],[25,40],[20,50],[40,50]],
      't': [[15,20],[35,20],[25,20],[25,10],[25,45]],
      'u': [[20,10],[20,40],[30,50],[45,40],[45,10]],
      'v': [[20,10],[30,45],[40,10]],
      'w': [[15,10],[25,40],[35,20],[45,40],[55,10]],
      'x': [[20,10],[40,40],[30,25],[20,40],[40,10]],
      'y': [[20,10],[30,35],[30,55],[40,35],[20,10]],
      'z': [[20,10],[40,10],[20,40],[40,40]],
      'A': [[25,50],[30,10],[45,50],[35,30],[20,30]],
      'B': [[20,10],[20,50],[35,20],[35,40],[20,50]],
      'C': [[40,15],[25,15],[20,30],[25,45],[40,45]],
      'D': [[20,10],[20,50],[40,30],[20,10]],
      'E': [[20,10],[40,10],[20,10],[20,30],[35,30],[20,30],[20,50],[40,50]],
      'F': [[20,10],[40,10],[20,10],[20,30],[35,30],[20,30]],
      'G': [[40,15],[25,15],[20,30],[25,45],[40,45],[40,30],[30,30]],
      'H': [[20,10],[20,50],[20,30],[40,30],[40,10],[40,50]],
      'I': [[25,10],[35,10],[30,10],[30,50],[25,50],[35,50]],
      'J': [[35,10],[35,40],[30,50],[20,45]],
      'K': [[20,10],[20,50],[20,30],[40,10],[20,30],[40,40]],
      'L': [[20,10],[20,50],[40,50]],
      'M': [[15,10],[15,50],[30,30],[45,50],[45,10]],
      'N': [[20,10],[20,50],[45,10],[45,50]],
      'O': [[30,20],[20,30],[25,50],[45,50],[50,30],[30,20]],
      'P': [[20,10],[20,50],[20,20],[40,20],[45,30],[40,45],[20,50]],
      'Q': [[30,20],[20,30],[25,50],[45,50],[50,30],[30,20],[45,55]],
      'R': [[20,10],[20,50],[20,25],[40,25],[45,30],[40,45],[20,50],[35,50]],
      'S': [[40,15],[25,15],[20,25],[35,30],[25,40],[20,50],[40,50]],
      'T': [[15,10],[35,10],[25,10],[25,50]],
      'U': [[20,10],[20,45],[30,55],[45,45],[45,10]],
      'V': [[15,10],[30,50],[45,10]],
      'W': [[10,10],[25,45],[35,20],[45,45],[60,10]],
      'X': [[20,10],[45,50],[32,30],[20,50],[45,10]],
      'Y': [[15,10],[30,35],[30,55],[30,35],[45,10]],
      'Z': [[20,10],[40,10],[20,40],[40,40]],
      ' ': [],
      '0': [[30,20],[20,30],[25,50],[45,50],[50,30],[30,20]],
      '1': [[25,15],[30,10],[30,50]],
      '2': [[20,15],[35,15],[20,35],[40,35],[20,50],[40,50]],
      '3': [[20,15],[40,15],[25,30],[40,30],[25,45],[40,45]],
      '4': [[25,10],[25,35],[45,35],[45,10],[45,50]],
      '5': [[35,15],[20,15],[20,30],[40,30],[40,50],[20,50]],
      '6': [[40,15],[25,15],[20,30],[25,50],[45,45],[40,30],[20,30]],
      '7': [[20,15],[40,15],[30,50]],
      '8': [[30,20],[20,25],[25,40],[40,40],[45,25],[30,20],[30,50]],
      '9': [[30,20],[40,20],[45,35],[40,50],[20,45],[25,30],[45,30]],
    };

    function getPathForChar(char) {
      const upper = char.toUpperCase();
      if (letterPaths[upper]) return letterPaths[upper];
      return [[10,10],[20,20],[10,20],[20,10]];
    }

    let currentX = xOffset;
    for (let wIdx = 0; wIdx < words.length; wIdx++) {
      const word = words[wIdx];
      for (let chIdx = 0; chIdx < word.length; chIdx++) {
        const ch = word[chIdx];
        let rawPath = getPathForChar(ch);
        if (rawPath.length === 0) {
          currentX += letterWidth * 0.4;
          continue;
        }

        const scaledPath = rawPath.map(([x, y]) => {
          const sx = (x - 10) * 0.9 * scale + currentX;
          const sy = (y - 10) * 0.9 * scale + yBase - 20;
          return { x: sx, y: sy };
        });

        if (scaledPath.length > 1) {
          currentTraces.push({
            strokes: scaledPath,
            color: STROKE_COLOR
          });
        }

        const letterWidthScaled = letterWidth * 0.9 * scale + 8;
        currentX += letterWidthScaled;
      }
      if (wIdx < words.length - 1) currentX += gap * scale;
    }

    return currentTraces;
  }

  // ----- animation loop -----
  function animateTrace() {
    if (!isAnimating) return;

    const elapsed = performance.now() - animationStartTime;
    let progress = Math.min(elapsed / ANIMATION_DURATION, 1);
    const eased = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
    drawTraces(eased);

    if (progress < 1) {
      animationFrame = requestAnimationFrame(animateTrace);
      document.getElementById('statusLabel').innerText = `⏳ tracing ${Math.round(progress * 100)}%`;
    } else {
      isAnimating = false;
      drawTraces(1);
      document.getElementById('statusLabel').innerText = '✅ trace complete';
      animationFrame = null;
    }
  }

  // ----- public actions -----
  function startTrace(text) {
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
      animationFrame = null;
    }
    isAnimating = false;

    currentTraces = [];
    const rawText = text || document.getElementById('wordInput').value || 'trace';
    currentTraces = generateTraceFromText(rawText);

    if (currentTraces.length === 0) {
      clearCanvas();
      document.getElementById('statusLabel').innerText = '⏺ no traces (empty text)';
      return;
    }

    isAnimating = true;
    animationStartTime = performance.now();
    document.getElementById('statusLabel').innerText = '▶ animating...';
    animateTrace();
  }

  function clearTrace() {
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
      animationFrame = null;
    }
    isAnimating = false;
    currentTraces = [];
    drawTraces(1);
    document.getElementById('statusLabel').innerText = '⏺ cleared';
  }

  // ----- setup UI -----
  document.getElementById('traceBtn').addEventListener('click', () => {
    const input = document.getElementById('wordInput');
    startTrace(input.value);
  });

  document.getElementById('clearBtn').addEventListener('click', clearTrace);

  document.getElementById('wordInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      startTrace(e.target.value);
    }
  });

  window.addEventListener('load', () => {
    document.getElementById('wordInput').value = 'trace';
    startTrace('trace');
  });

  // ----- mouse/touch draw -----
  let isDrawing = false;
  let drawPoints = [];

  function startDraw(e) {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    if (x < 0 || x > canvas.width || y < 0 || y > canvas.height) return;

    isDrawing = true;
    drawPoints = [{ x, y }];
  }

  function draw(e) {
    e.preventDefault();
    if (!isDrawing) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;
    if (x < 0 || x > canvas.width || y < 0 || y > canvas.height) return;

    drawPoints.push({ x, y });

    if (isAnimating) {
      if (animationFrame) cancelAnimationFrame(animationFrame);
      isAnimating = false;
    }

    drawTraces(1);
    if (drawPoints.length > 1) {
      ctx.save();
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(drawPoints[0].x, drawPoints[0].y);
      for (let i = 1; i < drawPoints.length; i++) {
        ctx.lineTo(drawPoints[i].x, drawPoints[i].y);
      }
      ctx.stroke();
      ctx.restore();
    }
  }

  function endDraw(e) {
    if (!isDrawing) return;
    isDrawing = false;
    if (drawPoints.length > 1) {
      currentTraces.push({
        strokes: drawPoints.slice(),
        color: '#2563eb'
      });
      drawPoints = [];
      drawTraces(1);
      document.getElementById('statusLabel').innerText = '✏️ freehand added';
    } else {
      drawPoints = [];
    }
  }

  canvas.addEventListener('mousedown', startDraw);
  canvas.addEventListener('mousemove', draw);
  canvas.addEventListener('mouseup', endDraw);
  canvas.addEventListener('mouseleave', endDraw);
  canvas.addEventListener('touchstart', startDraw, { passive: false });
  canvas.addEventListener('touchmove', draw, { passive: false });
  canvas.addEventListener('touchend', endDraw);
  canvas.addEventListener('touchcancel', endDraw);
})();
