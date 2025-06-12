const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
//const fuelDisplay = document.getElementById("fuelDisplay");
const walletDisplay = document.getElementById("walletDisplay"); // <== додай цей елемент

const mapWidth = 29; // Краще непарне число для лабіринту (21x21)
const mapHeight = 21; // Краще непарне число для лабіринту (21x21)
const tileSize = 30;
const maxHouses = 40;
const settings = {
  weatherEnabled: false,
  economyCoefficient: 1
}
let weatherType = null; // "rain", "fog", etc.
let map = [];
let houses = [];
let deliveryHouses = [];
let fuelStations = [];
let coinAnimations = []; // монетки в польоті\
let rainParticles = [];
let pizzeria = { x: 0, y: 0 }; // координати піцерії
let car = {x:1, y:1, fuel:100};
const maxDeliveries = 5;
let wallet = 0;
let walletPosition = {x: canvas.width, y: canvas.height/2}; // позиція гаманця
const initialFuel = 100;

function updateWalletDisplay() {
  walletDisplay.textContent = `Гаманець: ${wallet} ₴`;
}

/*function drawWallet() {
  ctx.fillStyle = "gold";
  ctx.beginPath();
  ctx.arc(walletPosition.x, walletPosition.y, 15, 0, Math.PI*2);
  ctx.fill();
  ctx.fillStyle = "black";
  ctx.font = "16px sans-serif";
  ctx.fillText(`💰 ${wallet}`, walletPosition.x + 20, walletPosition.y + 5);
}*/

function findNearest(position, objectType) {
  if(map[position.y][position.x-1] >= objectType) {
    return {x: position.x-1, y: position.y};
  } else if(map[position.y][position.x+1] >= objectType) {
    return {x: position.x+1, y: position.y};
  } else if(map[position.y-1][position.x] >= objectType) {
    return {x: position.x, y: position.y-1};
  } else if(map[position.y+1][position.x] >= objectType) {
    return {x: position.x, y: position.y+1};
  }
  return null;
}

function findNearestExact(position, objectType) {
  if(map[position.y][position.x-1] === objectType) {
    return {x: position.x-1, y: position.y};
  } else if(map[position.y][position.x+1] === objectType) {
    return {x: position.x+1, y: position.y};
  } else if(map[position.y-1][position.x] === objectType) {
    return {x: position.x, y: position.y-1};
  } else if(map[position.y+1][position.x] === objectType) {
    return {x: position.x, y: position.y+1};
  }
  return null;
}

function spawnCoin(tileX, tileY) {
  const startX = tileX * tileSize + tileSize / 2;
  const startY = tileY * tileSize + tileSize / 2;
  const dx = walletPosition.x - startX;
  const dy = walletPosition.y - startY;
  const dist = Math.sqrt(dx*dx + dy*dy);
  const speed = 3;
  const vx = (dx / dist) * speed;
  const vy = (dy / dist) * speed;

  coinAnimations.push({x: startX, y: startY, vx, vy, life: 120});
  coinAnimations.push({x: startX, y: startY, vx, vy, life: 120});
}

function showMessage(text, duration = 2000) {
  const el = document.getElementById("messageArea");
  el.textContent = text;
  el.style.display = "block";
  setTimeout(() => {
    el.style.display = "none";
  }, duration);
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


function createCityGrid() {
map = [];
for(let y=0; y<mapHeight; y++) {
  let row = [];
  for(let x=0; x<mapWidth; x++) {
    // Вулиці кожні 4 клітинки (0,4,8,12,16,20)
    if (y % 4 === 0 || x % 4 === 0) {
      row.push(0); // дорога
    } else {
      let r = Math.random();
      if (r < 0.2) {
        row.push(2); // дерево
      } else if (r < 0.3) {
        row.push(3); // кущ
      } else {
        row.push(1); // трава
      }
    }
  }
  map.push(row);
}
}

function shuffle(array) {
  for(let i = array.length -1; i>0; i--) {
    const j = Math.floor(Math.random() * (i+1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}



// Вибір випадкових будинків
function getHousePositions() {
  let positions = [];
  for(let y=1; y<mapHeight-1; y++) {
    for(let x=1; x<mapWidth-1; x++) {
      if(map[y][x] === 1) { // City block
       // поруч має бути 1 (квартал), щоб будинок не стояв на дорозі
        if(map[y][x+1] === 0 || map[y][x-1] === 0 || map[y+1][x] === 0 || map[y-1][x] === 0) {
          positions.push({x,y});
        }
      }
    }
  }
  return positions;
}

function placeHouses() {
  houses = [];
  let candidates = getHousePositions();
  shuffle(candidates);
  for(let i=0; i<maxHouses && i<candidates.length; i++) {
    houses.push({...candidates[i], delivered: false});
  }
}

function chooseDeliveryHouses() {
  deliveryHouses = [];
  let copy = [...houses];
  shuffle(copy);
  for(let i= 0; i<maxDeliveries && i<copy.length; i++) {
    deliveryHouses.push(copy[i]);
  }
}

function placeFuelStations() {
  fuelStations = [];
  let roads = getRoadPositions();
  shuffle(roads);
  for(let i=0; i<3 && i<roads.length; i++) {
    fuelStations.push(roads[i]);
  }
}

// Розстановка заправок (3)
function getRoadPositions() {
  let positions = [];
  for(let y=0; y<mapHeight; y++) {
    for(let x=0; x<mapWidth; x++) {
      if(map[y][x] === 0) positions.push({x,y});
    }
  }
  return positions;
}

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

      if (tile === 1) {
        ctx.fillStyle = "darkgreen"; // трава
        ctx.fillRect(x * tileSize + 5, y * tileSize + 5, tileSize - 5, tileSize - 5);
      } else if (tile === 2) {
        ctx.fillStyle = "green"; // дерево
        ctx.fillRect(x * tileSize + 5, y * tileSize + 5, tileSize - 5, tileSize - 5);
      } else if (tile === 3) {
        ctx.fillStyle = "#567d46"; // кущ
        ctx.fillRect(x * tileSize + 5, y * tileSize + 5, tileSize - 5, tileSize - 5);
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
  /*ctx.beginPath();
  ctx.arc(car.x*tileSize + tileSize/2, car.y*tileSize + tileSize/2, tileSize/3, 0, Math.PI*2);
  ctx.fill();*/
}

function updateFuelBar() {
  const fuelBar = document.getElementById("fuel-bar");
  if(!fuelBar) return;
  fuelBar.value = car.fuel;
  fuelBar.max = initialFuel*settings.economyCoefficient;

  // Optional: змінити колір при низькому рівні
  const value =  fuelBar.value / fuelBar.max;
  fuelBar.style.setProperty('--fuel-color', value < 0.3 ? 'red' : 'limegreen');
}

function clearCanvas() {
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function update() {
  clearCanvas();
  drawMap();
  drawHouses();
  drawFuelStations();
  drawCar();
  drawCoinAnimations();

  if (settings.weatherEnabled && weatherType === "rain") {
    drawRain();
  } else if (settings.weatherEnabled && weatherType === "fog") {
    drawFog(); // тепер буде лише один шар туману
  }

  updateFuelBar();
  updateWalletDisplay();
  //drawWallet();
}


function findHouseNearby(car) {
  const deliveryCandidates = deliveryHouses.filter(h => !h.delivered &&
    ((Math.abs(car.x-h.x) <= 1 && car.y-h.y===0) || (Math.abs(car.y-h.y) <= 1 && car.x-h.x === 0)));
  if(deliveryCandidates.length > 0) {
    return deliveryCandidates[0];
  } else {
    return null;
  }
}

function checkDelivery() {
  let house = findHouseNearby(car);
  if(house != null) {
    house.delivered = true;
    wallet += 10 * settings.economyCoefficient;
    spawnCoin(house.x, house.y);
    document.getElementById("coinSound").play(); // <== звук монетки
    showMessage("🍕 Доставка виконана!", 2000);
    // Вібрація на 50 мс, якщо підтримується
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
  }
}

function checkFuelStation() {
  for(let f of fuelStations) {
    if(car.x === f.x && car.y === f.y) {
      car.fuel = initialFuel * settings.economyCoefficient;
      showMessage("⛽ Заправка повна!", 2000);
    }
  }
}

document.addEventListener("keydown", e => {
  if(car.fuel <= 0) return;

  if (settings.weatherEnabled) {
    let slipCoefficient = 0;
    switch (weatherType) {
      case "rain":
        slipCoefficient = 0.1;
        break;
      case "fog":
        slipCoefficient = 0;
        break;
      case "ice":
        slipCoefficient = 0.3;
        break;
    }
    if (Math.random() < slipCoefficient) return; // шанс що авто не рухнеться (ковзко)
  }

  let newX = car.x;
  let newY = car.y;

  if(e.key === "ArrowUp") newY--;
  else if(e.key === "ArrowDown") newY++;
  else if(e.key === "ArrowLeft") newX--;
  else if(e.key === "ArrowRight") newX++;

  if(newX >= 0 && newY >= 0 && newX < mapWidth && newY < mapHeight && map[newY][newX] === 0) {
    car.x = newX;
    car.y = newY;
    car.fuel--;
    checkDelivery();
    checkFuelStation();
  }
  update();
});

document.querySelectorAll('#mobile-controls button').forEach(button => {
  const triggerKeydown = () => {
    const key = button.dataset.key;
    const event = new KeyboardEvent('keydown', { key, bubbles: true });
    document.dispatchEvent(event);

    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
  };

  button.addEventListener('touchstart', e => {
    e.preventDefault(); // блокує подвійне спрацювання
    triggerKeydown();
  });

  button.addEventListener('mousedown', e => {
    e.preventDefault(); // додатково блокує фокус
    triggerKeydown();
  });
});

function getRandomCoords(startingPoint, deviation) {
  return  {x:Math.round(Math.random()*deviation + startingPoint.x),y: Math.round(Math.random()*deviation + startingPoint.y)};
}
// Ініціалізація гри
function init() {
  createCityGrid();
  let roads = getRoadPositions();
  let mapCenter = roads[Math.floor(roads.length / 2)]; // десь у центрі
  let pizzeriaCoords = null;
  while(!pizzeriaCoords) {
    let roadCoords = findNearestExact(getRandomCoords(mapCenter, 3), 0);
    if(roadCoords == null) {
      continue;
    }
    car.x = roadCoords.x;
    car.y = roadCoords.y;
    pizzeriaCoords = findNearest(roadCoords, 1);
  }

  pizzeria.x = pizzeriaCoords.x;
  pizzeria.y = pizzeriaCoords.y;
  map[pizzeria.y][pizzeriaCoords.x] = 5;
  placeHouses();

  chooseDeliveryHouses();
  placeFuelStations();
  update();
}

function gameLoop() {
  update(); // оновлюємо графіку
  requestAnimationFrame(gameLoop); // викликаємо наступний кадр
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

function updateWeatherIndicator() {
  const el = document.getElementById("weather-indicator");
  let emoji = "☀️";
  let label = "Sunny";

  switch (weatherType) {
    case "rain":
      emoji = "🌧️";
      label = "Rain";
      break;
    case "ice":
      emoji = "❄️";
      label = "Snow";
      break;
    case "fog":
      emoji = "🌫️";
      label = "Fog";
      break;
  }

  el.textContent = `${emoji} ${label}`;
}

function startGame() {
  const difficulty = document.getElementById("difficulty").value;
  rainParticles = [];
  settings.weatherEnabled = false;
  weatherType = null;
  wallet = 0;
  if(difficulty === 'easy') {
    settings.economyCoefficient = 2;
  } else if (difficulty === 'normal') {
    settings.economyCoefficient = 1;
  } else if (difficulty === "hard") {
    settings.economyCoefficient = 0.5;
    settings.weatherEnabled = true;
    const types = ["rain", "fog", "ice"];
    weatherType = types[Math.floor(Math.random() * types.length)];
    initRain();
  }

  updateWeatherIndicator();
  car.fuel = initialFuel * settings.economyCoefficient;
  init(); // запускає гру

}

init();
gameLoop();

