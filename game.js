const canvas = document.getElementById('gameCanvas');
const fuelBar = document.getElementById('fuel-bar');
const ctx = canvas.getContext('2d');
const walletDisplay = document.getElementById('walletDisplay'); // <== додай цей елемент

const mapWidth = 29; // Краще непарне число для лабіринту (21x21)
const mapHeight = 21; // Краще непарне число для лабіринту (21x21)
const tileSize = 30;
const maxHouses = 40;
const settings = {
  weatherEnabled: false,
  economyCoefficient: 1,
  enemyCount: 0
}

const pizzaObject = {name:'pizza', symbol:'🍕'};

let gameRunning = false;
let weatherType = null; // 'rain', 'fog', etc.
let map = [];
let houses = [];
let deliveryHouses = [];
let fuelStations = [];
let coinAnimations = []; // монетки в польоті
let rainParticles = [];
let pizzeria = { x: 0, y: 0 }; // координати піцерії
let car = {x:1, y:1, fuel:100, maxCargo:5, cargo:[]};
const maxDeliveries = 5;
let wallet = 0;
let walletPosition = {x: canvas.width, y: canvas.height/2}; // позиція гаманця
const initialFuel = 100;
fuelBar.max = initialFuel*settings.economyCoefficient;
let gasPrice = 0.5;

let enemyCars = [];

function updateWalletDisplay() {
  walletDisplay.textContent = `Гаманець: ${wallet} ₴`;
}


function addMoney(amount) {
  wallet+=amount;
}
function deductMoney(amount) {
  wallet-=amount;
}

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
  const el = document.getElementById('messageArea');
  el.textContent = text;
  el.style.display = 'block';
  setTimeout(() => {
    el.style.display = 'none';
  }, duration);
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

function chooseDeliveryHouse() {
  let copy = [...houses];
  shuffle(copy);
  return copy[Math.round(Math.random() * copy.length)];
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

function updateFuelBar() {
  if(!fuelBar) return;
  fuelBar.value = car.fuel;

  // Optional: змінити колір при низькому рівні
  const value =  fuelBar.value / fuelBar.max;
  fuelBar.style.setProperty('--fuel-color', value < 0.3 ? 'red' : 'limegreen');
}
let lastEnemyMove=0;
function update() {
  clearCanvas();
  drawMap();
  drawHouses();
  drawFuelStations();
  drawCar();
  drawCoinAnimations();
  drawEnemyCars();

  if (settings.weatherEnabled && weatherType === 'rain') {
    drawRain();
  } else if (settings.weatherEnabled && weatherType === 'fog') {
    drawFog(); // тепер буде лише один шар туману
  }

  updateFuelBar();
  updateWalletDisplay();
  if(lastEnemyMove > 100) {
    lastEnemyMove = 0;
    moveEnemyCars();
  } else {
    lastEnemyMove++;
  }
  checkCollisionWithEnemies();

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
    addMoney(10 * settings.economyCoefficient);
    car.cargo.pop();
    spawnCoin(house.x, house.y);
    document.getElementById('coinSound').play(); // <== звук монетки
    showMessage('🍕 Доставка виконана!', 2000);
    // Вібрація на 50 мс, якщо підтримується
    if (navigator.vibrate) {
      navigator.vibrate(500);
    }
  }
}

function checkPizzeria() {
  return Math.abs(pizzeria.x - car.x) <= 1 && Math.abs(pizzeria.y - car.y) <= 1;
}

function checkFuelStation() {
  for(let f of fuelStations) {
    if(car.x === f.x && car.y === f.y) {
      let fuelToRefill = initialFuel * settings.economyCoefficient - car.fuel;
      const moneyToPay = fuelToRefill * gasPrice;
      if(moneyToPay > wallet) {
        fuelToRefill = wallet * gasPrice;
        deductMoney(wallet);
        showMessage('⛽ Заправка на всі гроші!!!', 2000);
      } else {
        showMessage('⛽ Заправка повна!', 2000);
      }
      car.fuel += fuelToRefill;
      deductMoney(fuelToRefill * gasPrice);

    }
  }
}

function addPizza() {
  for(let index= car.cargo.length; index < car.maxCargo; index++) {
    car.cargo.push(pizzaObject);
    deliveryHouses.push(chooseDeliveryHouse());
  }
}


function doLoad() {
  checkFuelStation();



  if(checkPizzeria()) {
    document.getElementById('carHorn').play();
    addPizza();
    console.log(car.cargo);
  }
}

function doUnload() {
  checkDelivery();
  console.log(car.cargo);
}


document.addEventListener('keydown', e => {

  if(car.fuel <= 0 || !gameRunning) return;

  if (settings.weatherEnabled) {
    let slipCoefficient = 0;
    switch (weatherType) {
      case 'rain':
        slipCoefficient = 0.1;
        break;
      case 'fog':
        slipCoefficient = 0;
        break;
      case 'ice':
        slipCoefficient = 0.3;
        break;
    }
    if (Math.random() < slipCoefficient) return; // шанс що авто не рухнеться (ковзко)
  }

  let newX = car.x;
  let newY = car.y;

  if(e.key === 'ArrowUp') newY--;
  else if(e.key === 'ArrowDown') newY++;
  else if(e.key === 'ArrowLeft') newX--;
  else if(e.key === 'ArrowRight') newX++;
  else if(e.key === 'U' || e.key === 'u') doUnload();
  else if(e.key === 'L' || e.key === 'l') doLoad();

  if(newX >= 0 && newY >= 0 && newX < mapWidth && newY < mapHeight && map[newY][newX] === 0) {
    car.x = newX;
    car.y = newY;
    car.fuel--;
  }
  update();
});


function checkCollisionWithEnemies() {
  for (let e of enemyCars) {
    if (e.x === car.x && e.y === car.y) {
      showMessage('💥 Аварія! Гра закінчена!');
      // Можна заблокувати керування:
      gameRunning = false;
      return true;
    }
  }
  return false;
}


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

  placeFuelStations();

  spawnEnemyCars();

  update();
}

function gameLoop() {
  if(!gameRunning) {
    return;
  }
  update(); // оновлюємо графіку
  requestAnimationFrame(gameLoop); // викликаємо наступний кадр
}

function updateWeatherIndicator() {
  const el = document.getElementById('weather-indicator');
  let emoji = '☀️';
  let label = 'Sunny';

  switch (weatherType) {
    case 'rain':
      emoji = '🌧️';
      label = 'Rain';
      break;
    case 'ice':
      emoji = '❄️';
      label = 'Snow';
      break;
    case 'fog':
      emoji = '🌫️';
      label = 'Fog';
      break;
  }

  el.textContent = `${emoji} ${label}`;
}

function startGame() {
  document.getElementById("startButton").classList.remove("blinking");
  const difficulty = document.getElementById('difficulty').value;
  rainParticles = [];
  settings.weatherEnabled = false;
  settings.enemyCount = 0;
  weatherType = null;
  wallet = 0; //todo change to real wallet
  if(difficulty === 'easy') {
    settings.economyCoefficient = 2;
  } else if (difficulty === 'normal') {
    settings.economyCoefficient = 1;
    settings.enemyCount = 1;
  } else if (difficulty === 'hard') {
    settings.economyCoefficient = 0.5;
    settings.weatherEnabled = true;
    settings.enemyCount = 2;
    const types = ['rain', 'fog', 'ice'];
    weatherType = types[Math.floor(Math.random() * types.length)];
    initRain();
  }

  updateWeatherIndicator();
  car.fuel = initialFuel * settings.economyCoefficient;
  fuelBar.max = initialFuel*settings.economyCoefficient;
  init(); // запускає гру
  deliveryHouses = [];
  car.cargo = [];
  addPizza();

  gameRunning = true;
  gameLoop();

}

init();


