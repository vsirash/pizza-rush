
function clearCanvas() {
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawEnemyCars() {
  for (let car of enemyCars) {
    ctx.font = "24px sans-serif";
    ctx.fillText("🚕", car.x * tileSize, car.y * tileSize + 20);
  }
}

function drawMap() {
  for (let y = 0; y < mapHeight; y++) {
    for (let x = 0; x < mapWidth; x++) {
      let tile = map[y][x];

      // Малюємо фон дороги або трави
      if (tile === 0) {
        ctx.fillStyle = "black"; // дорога
        if(weatherType === "rain") {
          ctx.fillStyle = "#064d89"; // дорога
        } else if (weatherType === "ice") {
          ctx.fillStyle = "#c0e7eb";
        }
      } else {
        ctx.fillStyle = "green"; // трава
      }
      ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);

      // Якщо дорога — малюємо переривчасту розмітку
      // Якщо дорога — малюємо переривчасту розмітку
      if (tile === 0) {
        ctx.strokeStyle = "white";
        ctx.lineWidth = 2;
        ctx.beginPath();

        // Горизонтальна розмітка
        if ((x > 0 && map[y][x - 1] === 0) && (x < mapWidth - 1 && map[y][x + 1] === 0)) {
          for (let i = 0; i < tileSize; i += 16) {
            ctx.moveTo(x * tileSize + i, y * tileSize + tileSize / 2);
            ctx.lineTo(x * tileSize + i + 4, y * tileSize + tileSize / 2);
          }
        }

        // Вертикальна розмітка
        if ((y > 0 && map[y - 1][x] === 0) && (y < mapHeight - 1 && map[y + 1][x] === 0)) {
          for (let i = 0; i < tileSize; i += 16) {
            ctx.moveTo(x * tileSize + tileSize / 2, y * tileSize + i);
            ctx.lineTo(x * tileSize + tileSize / 2, y * tileSize + i + 4);
          }
        }

        // Додаємо розмітку перехрестя
        let up = y > 0 && map[y - 1][x] === 0;
        let down = y < mapHeight - 1 && map[y + 1][x] === 0;
        let left = x > 0 && map[y][x - 1] === 0;
        let right = x < mapWidth - 1 && map[y][x + 1] === 0;
        let roadConnections = [up, down, left, right].filter(Boolean).length;

        if (roadConnections >= 3) {
          ctx.fillStyle = "white";
          ctx.beginPath();
          //ctx.arc(x * tileSize + tileSize / 2, y * tileSize + tileSize / 2, 4, 0, 2 * Math.PI);
          ctx.fill();
        }

        ctx.stroke();
      }
      ctx.font = "24px sans-serif";
      if (tile === 1) {
        ctx.fillStyle = "darkgreen"; // трава
        ctx.fillRect(x * tileSize + 5, y * tileSize + 5, tileSize - 5, tileSize - 5);
      } else if (tile === 2) {
        ctx.fillStyle = "green"; // дерево
        ctx.fillRect(x * tileSize + 5, y * tileSize + 5, tileSize - 5, tileSize - 5);
        ctx.fillText("🌳", x * tileSize, y * tileSize + 20);
      } else if (tile === 3) {
        ctx.fillStyle = "#567d46"; // кущ
        ctx.fillRect(x * tileSize + 5, y * tileSize + 5, tileSize - 5, tileSize - 5);
        ctx.fillText("🌲", x * tileSize, y * tileSize + 20);
      } else if (tile === 5) {
        ctx.fillStyle = "maroon";
        ctx.fillRect(pizzeria.x * tileSize + 4, pizzeria.y * tileSize + 4, tileSize - 8, tileSize - 8);
        ctx.fillStyle = "white";
        ctx.font = "12px sans-serif";
        ctx.fillText("🍕", pizzeria.x * tileSize + 8, pizzeria.y * tileSize + 22);
      }
    }
  }
}

function drawHouses() {
  houses.forEach(h => {
    let isDelivery = deliveryHouses.some(dh => dh.x === h.x && dh.y === h.y);
    if (h.delivered) {
      ctx.fillStyle = "gray"; // Доставлено
    } else if (isDelivery) {
      ctx.fillStyle = "blue"; // Ще треба доставити
    } else {
      ctx.fillStyle = "gray"; // Звичайний будинок
    }
    ctx.fillRect(h.x*tileSize+5, h.y*tileSize+5, tileSize-10, tileSize-10);
    ctx.font = "18px sans-serif";
    ctx.fillText("🏠", h.x*tileSize, h.y*tileSize+20);
  });
}

function drawFuelStations() {
  fuelStations.forEach(f => {
    ctx.fillStyle = "orange";
    ctx.font = "18px sans-serif";
    ctx.fillText("⛽",f.x*tileSize, f.y*tileSize+20);
  });
}

function drawCar() {
  ctx.fillStyle = "red";
  ctx.font = "24px sans-serif";
  ctx.fillText("🚙", car.x*tileSize, car.y*tileSize + 20);
}

function drawCoinAnimations() {
  for (let i = coinAnimations.length - 1; i >= 0; i--) {
    let c = coinAnimations[i];
    ctx.fillStyle = "gold";
    ctx.beginPath();
    ctx.arc(c.x, c.y, 6, 0, Math.PI * 2);
    ctx.fill();
    c.x += c.vx;
    c.y += c.vy;
    c.life--;
    if (c.life <= 0) coinAnimations.splice(i, 1);
  }
}
