function drawRain() {
  ctx.strokeStyle = "rgba(173,216,230,0.5)";
  ctx.lineWidth = 1;
  rainParticles.forEach(p => {
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + 2, p.y + p.length);
    ctx.stroke();

    p.y += p.speed;
    if (p.y > canvas.height) {
      p.y = -10;
      p.x = Math.random() * canvas.width;
    }
  });
}

function drawFog() {
  ctx.fillStyle = "rgba(200,200,200,0.9)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function initRain() {
  rainParticles = [];
  for (let i = 0; i < 100; i++) {
    rainParticles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      length: 10,
      speed: 4 + Math.random() * 2
    });
  }
}
