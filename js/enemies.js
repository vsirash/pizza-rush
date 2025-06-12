function moveEnemyCars() {
  for (let car of enemyCars) {
    let possibleMoves = [];
    const directions = [
      { x: 0, y: -1 },
      { x: 0, y: 1 },
      { x: -1, y: 0 },
      { x: 1, y: 0 }
    ];

    for (let d of directions) {
      let nx = car.x + d.x;
      let ny = car.y + d.y;
      if (nx >= 0 && ny >= 0 && nx < mapWidth && ny < mapHeight && map[ny][nx] === 0) {
        possibleMoves.push({ x: nx, y: ny });
      }
    }

    if (possibleMoves.length > 0) {
      let move = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
      car.x = move.x;
      car.y = move.y;
    }
  }
}


function spawnEnemyCars() {
  enemyCars = [];
  let roads = getRoadPositions();
  shuffle(roads);
  for (let i = 0; i < settings.enemyCount && i < roads.length; i++) {
    enemyCars.push({ x: roads[i].x, y: roads[i].y });
  }
}
