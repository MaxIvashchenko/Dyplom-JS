'use strict';

// Реализовать базовые классы игры: Vector, Actor и Level.
class Vector {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }
  
  plus(vector) {
    if (!(vector instanceof Vector)) {
      throw new Error ('только вектор типа Vector');
    }
    const newX = this.x + vector.x;
    const newY = this.y + vector.y;
    return new Vector(newX, newY);
  }

  times (multiplier = 1) {
    const newX = this.x * multiplier;
    const newY = this.y * multiplier;
    return new Vector(newX, newY);
  }
}


class Actor{
  constructor(pos = new Vector(0, 0), size = new Vector(1, 1), speed = new Vector(0, 0)) {
    if([pos, size, speed].some((vector) => !(vector instanceof Vector))){
      throw new Error ('только объекты типа Vector');
    }
    this.pos = pos;
    this.size = size;
    this.speed = speed;
  }
  act() {}

  get left() {
    return this.pos.x;
  }
  get top() {
    return this.pos.y;
  }
  get right() {
    return this.pos.x + this.size.x;
  }
  get bottom() {
    return this.pos.y + this.size.y;
  }

  get type() {
    return 'actor';
  }

  isIntersect(actor) {
  if(!(actor instanceof Actor)){
    throw new Error ('только объекты типа Actor');
  }
  if (actor === this) {
    return false;
  }

  return this.right > actor.left &&
          this.left < actor.right &&
          this.bottom > actor.top && 
          this.top < actor.bottom;
  }
}

class Level{
  constructor(grid = [], actors = []) {
    this.grid = grid.slice();
    this.actors = actors.slice();
    this.player = actors.find((elType) => elType.type === 'player');
    this.height = this.grid.length;
    this.width = Math.max(0, ...this.grid.map(cell => cell.length));
    this.status = null;
    this.finishDelay = 1;
  }
  isFinished() {
  return this.status !== 0 && this.finishDelay < 0;
  }
  actorAt(actor) {
    if(actor === undefined || !(actor instanceof Actor)) {
      throw new Error ('значение не может быть пустым и можно передать только объекты типа Actor');
    }
    return this.actors.find((thisActor) => actor.isIntersect(thisActor)); // правильно ли?
  }
  obstacleAt(objToMove, objSize) {
    if (!(objToMove instanceof Vector) || !(objSize instanceof Vector)) {
      throw new Error ('только объекты типа Vector');
    }
    const ceilBorder = objToMove.y; 
    const rightBorder = objToMove.x + objSize.x; 
    const floorBorder = objToMove.y + objSize.y;
    const leftBorder = objToMove.x; 
    
    if (ceilBorder < 0 || leftBorder < 0 || rightBorder > this.width) {
      return 'wall';
    }
    if (floorBorder > this.height) {
      return 'lava';
    }
    for (let y = Math.floor(ceilBorder); y < Math.ceil(floorBorder); y++) {
      for (let x = Math.floor(leftBorder); x < Math.ceil(rightBorder); x++) {
        const fieldType = this.grid[y][x];
        if (fieldType) {
          return fieldType;
        }
      }
    }
  }
  removeActor(actor) {
    const result = this.actors.findIndex((thisActor) => actor === thisActor);
    if (result !== -1) {
      this.actors.splice(result, 1);
    }
  }
  noMoreActors(actoType) {
    return !(this.actors.find((actor) => actor.type === actoType));
  }
  playerTouched(objType, actorTouch) {
    if (typeof objType !== 'string') {
      throw new Error  ('в параметре должен быть тип строка');
    }
    if (objType === 'lava' || objType === 'fireball') {
      this.status = 'lost';
    }
    if (this.status !== null) {
      return false;
    }
    if (objType === 'coin' && actorTouch.type === 'coin') {
      this.removeActor(actorTouch);
      if (this.noMoreActors('coin')) {
        this.status = 'won';
      } 
    }
  }
}

class LevelParser {
  constructor(dictionaryMoveObj = {}) {
    this.dictonary = Object.assign({}, dictionaryMoveObj);
  }
  actorFromSymbol(actorSymbol){
    return this.dictonary[actorSymbol];
  }
  obstacleFromSymbol(obstacleSymbol) {
    switch (obstacleSymbol) {
      case 'x':
        return 'wall';
      case '!':
        return 'lava';
    }
  }
  createGrid(arrayString){
    return arrayString.map((row) => row.split('')
                        .map(cell => this.obstacleFromSymbol(cell)));
  }
  createActors(arrayString) {
    const actors = [];
    arrayString.forEach((row, rowIndex) => {
      row.split('').forEach((cell, cellIndex) => {
        const actorClass = this.actorFromSymbol(cell);
        if (typeof actorClass === 'function') {
          const actor = new actorClass(new Vector(cellIndex, rowIndex));
          if (actor instanceof Actor) {
            actors.push(actor);
          }
        }
      });
    });
    return actors;
  }
  parse(arrayString){
    return new Level(this.createGrid(arrayString), this.createActors(arrayString));
  }
}

class Fireball extends Actor {
  constructor(pos = new Vector(0, 0), speed = new Vector(0, 0)) {
    super(pos, new Vector(1, 1), speed);
  }
  get type() {
    return 'fireball';
  }
  getNextPosition(time = 1) {
    return this.pos.plus(this.speed.times(time))
  }
  handleObstacle() {
    this.speed = this.speed.times(-1);
  }
  act(time, level) {
    const newPos = this.getNextPosition(time);
    if (level.obstacleAt(newPos, this.size)) {
      this.handleObstacle();
    } else {
      this.pos = newPos;
    }
  }
}

class HorizontalFireball extends Fireball {
  constructor(pos = new Vector(0, 0)) {
    super(pos, new Vector(2, 0));
  }
}

class VerticalFireball extends Fireball {
  constructor(pos = new Vector(0, 0)) {
    super(pos, new Vector(0, 2));
  }
}


class FireRain extends Fireball {
  constructor(pos = new Vector(0, 0)) {
    super(pos, new Vector(0, 3));
    this.starPos = pos;
  }
  handleObstacle() {
    this.pos = this.starPos;
  }
}


class Coin extends Actor {
  constructor(pos = new Vector(0, 0)) {
    super(pos.plus(new Vector(0.2, 0.1)), new Vector(0.6, 0.6), new Vector(0, 0));
    this.springSpeed = 8;
    this.springDist = 0.07;
    this.spring = Math.random(Math.PI * 2, 0);
    this.startPos = this.pos;
  }
  get type() {
    return 'coin';
  }
  updateSpring(time = 1) {
    this.spring = this.spring + this.springSpeed * time;
  }
  getSpringVector() {
    return new Vector(0, this.springDist * Math.sin(this.spring));
  }
  getNextPosition(time = 1) {
    this.updateSpring(time);
    return this.startPos.plus(this.getSpringVector());
  }
  act(time = 1) {
    this.pos = this.getNextPosition(time);
  }
}



class Player extends Actor {
  constructor(pos = new Vector(0, 0)) {
    super(pos.plus(new Vector(0, -0.5)), new Vector(0.8, 1.5), new Vector(0, 0));
  }
  get type() {
    return 'player';
  }
}


const actors = {
      '@': Player,
      'v': FireRain,
      'o': Coin,
      '=': HorizontalFireball,
      '|': VerticalFireball
    };
const parser = new LevelParser(actors);


loadLevels().then(prom => {
  runGame(JSON.parse(prom), parser, DOMDisplay).then(() => console.log('Вы выиграли!'));
});
