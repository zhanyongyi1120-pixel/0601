let creatures = [];
let missiles = [];
let explosions = [];
let score = 0;
let lastSpawnTime = 0;

// 計時器相關變數
let gameDuration = 30; // 遊戲總長度 (秒)
let timeRemaining = gameDuration;
let gameOver = false;

const palette = [
  '#f94144', '#f3722c', '#f8961e', '#f9844a', '#f9c74f', 
  '#90be6d', '#43aa8b', '#4d908e', '#577590', '#277da1'
];

function setup() {
  createCanvas(windowWidth, windowHeight);
  
  // 初始產生 10 個物件
  for (let i = 0; i < 10; i++) {
    creatures.push(new Creature());
  }
}

function draw() {
  background(240);

  // 1. 處理倒數計時邏輯 (若遊戲尚未結束)
  if (!gameOver) {
    // frameCount / 60 接近秒數，也可以用 millis() 計算
    // 這裡我們用 30 秒扣掉已經過去的時間
    timeRemaining = gameDuration - (millis() / 1000);
    
    if (timeRemaining <= 0) {
      timeRemaining = 0;
      gameOver = true;
    }
  }

  // 2. 處理並繪製爆炸特效 (放在底層)
  for (let i = explosions.length - 1; i >= 0; i--) {
    explosions[i].update();
    explosions[i].display();
    if (explosions[i].isFinished()) {
      explosions.splice(i, 1);
    }
  }

  // 3. 處理物件之間的彈性碰撞
  for (let i = 0; i < creatures.length; i++) {
    for (let j = i + 1; j < creatures.length; j++) {
      creatures[i].checkCollision(creatures[j]);
    }
  }

  // 4. 更新並繪製生物 (若遊戲結束則停止更新位置)
  for (let c of creatures) {
    if (!gameOver) c.update();
    c.display();
  }

  // 5. 更新並繪製飛彈，以及處理飛彈與生物的碰撞
  for (let i = missiles.length - 1; i >= 0; i--) {
    let m = missiles[i];
    if (!gameOver) m.update();
    m.display();

    // 檢查飛彈是否擊中任何生物
    for (let j = creatures.length - 1; j >= 0; j--) {
      let c = creatures[j];
      if (dist(m.x, m.y, c.x, c.y) < c.r) {
        explosions.push(new Explosion(c.x, c.y, c.color));
        score += 10;
        creatures.splice(j, 1);
        missiles.splice(i, 1);
        break; 
      }
    }
  }

  // 6. 每 5 秒鐘產生一個新物件 (隨時間越生越小)
  if (!gameOver && millis() - lastSpawnTime > 5000) {
    creatures.push(new Creature());
    lastSpawnTime = millis();
  }

  // 7. 繪製中央的瞄準箭頭 (砲台)
  drawTurret();

  // 8. 繪製UI介面 (計時器與分數)
  drawUI();

  // 9. 顯示遊戲結束畫面
  if (gameOver) {
    drawGameOverScreen();
  }
}

// 點擊滑鼠：發射飛彈 + 產生新物件
function mousePressed() {
  if (gameOver) return; // 遊戲結束就不能再射擊

  // 產生飛彈 (從畫布正中央，朝向滑鼠發射)
  let angle = atan2(mouseY - height / 2, mouseX - width / 2);
  missiles.push(new Missile(width / 2, height / 2, angle));
  
  // 點擊時也會額外產生一個新物件 (同樣受時間越晚越小的規則影響)
  creatures.push(new Creature());
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

// === 繪製中央砲台 ===
function drawTurret() {
  push();
  translate(width / 2, height / 2);
  
  let angle = atan2(mouseY - height / 2, mouseX - width / 2);
  rotate(angle);
  
  stroke(50);
  strokeWeight(6);
  line(0, 0, 40, 0);
  line(40, 0, 25, -10);
  line(40, 0, 25, 10);
  
  fill(100);
  noStroke();
  circle(0, 0, 30);
  pop();
}

// === 繪製 UI 介面 (分數與計時器) ===
function drawUI() {
  push();
  fill(50);
  textSize(28);
  textStyle(BOLD);
  
  // 右上角：分數
  textAlign(RIGHT, TOP);
  text("Score: " + score, width - 30, 30);
  
  // 左上角：倒數計時
  textAlign(LEFT, TOP);
  if (timeRemaining < 10) {
    fill(235, 64, 52); // 剩不到 10 秒變紅色提示
  }
  text("Time: " + nf(timeRemaining, 1, 1) + "s", 30, 30);
  pop();
}

// === 繪製遊戲結束畫面 ===
function drawGameOverScreen() {
  push();
  // 半透明黑底
  fill(0, 0, 0, 150);
  rect(0, 0, width, height);
  
  // 文字顯示
  textAlign(CENTER, CENTER);
  fill(255);
  textSize(64);
  textStyle(BOLD);
  text("GAME OVER", width / 2, height / 2 - 40);
  
  textSize(32);
  fill(255, 215, 0); // 金色
  text("Final Score: " + score, width / 2, height / 2 + 30);
  pop();
}

// ==========================================
// 類別：飛彈 (Missile) - 支援牆壁反彈
// ==========================================
class Missile {
  constructor(x, y, angle) {
    this.x = x;
    this.y = y;
    let speed = 11; 
    this.vx = cos(angle) * speed;
    this.vy = sin(angle) * speed;
    this.r = 6; // 飛彈半徑
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;

    // 牆壁反彈邏輯 (左右壁)
    if (this.x < this.r) {
      this.x = this.r;
      this.vx *= -1;
    } else if (this.x > width - this.r) {
      this.x = width - this.r;
      this.vx *= -1;
    }

    // 牆壁反彈邏輯 (上下壁)
    if (this.y < this.r) {
      this.y = this.r;
      this.vy *= -1;
    } else if (this.y > height - this.r) {
      this.y = height - this.r;
      this.vy *= -1;
    }
  }

  display() {
    push();
    fill(255, 50, 50);
    noStroke();
    circle(this.x, this.y, this.r * 2);
    
    stroke(255, 50, 50, 120);
    strokeWeight(4);
    line(this.x, this.y, this.x - this.vx * 1.5, this.y - this.vy * 1.5);
    pop();
  }
}

// ==========================================
// 類別：爆炸特效 (Explosion)
// ==========================================
class Explosion {
  constructor(x, y, c) {
    this.x = x;
    this.y = y;
    this.color = c;
    this.radius = 10;
    this.alpha = 255;
  }

  update() {
    this.radius += 8; 
    this.alpha -= 15; 
  }

  display() {
    push();
    noFill();
    stroke(red(this.color), green(this.color), blue(this.color), this.alpha);
    strokeWeight(4);
    circle(this.x, this.y, this.radius);
    pop();
  }

  isFinished() {
    return this.alpha <= 0;
  }
}

// ==========================================
// 類別：星狀生物 (Creature) - 體型隨時間遞減
// ==========================================
class Creature {
  constructor() {
    // 依據時間比例 (1 到 0) 決定縮放率
    // 剛開始時 ratio 接近 1，時間快結束時 ratio 接近 0
    let timeRatio = max(0, timeRemaining / gameDuration);
    
    // 初始大小區間：基礎隨機大小隨時間萎縮
    // 遊戲剛開始：半徑 45~85；到最後一秒：半徑可能縮小到 15~35
    let minSize = map(timeRatio, 1, 0, 45, 15);
    let maxSize = map(timeRatio, 1, 0, 85, 35);
    this.r = random(minSize, maxSize);
    
    do {
      this.x = random(this.r, width - this.r);
      this.y = random(this.r, height - this.r);
    } while (dist(this.x, this.y, width/2, height/2) < 150);
    
    this.vx = random(-3, 3);
    this.vy = random(-3, 3);
    
    this.color = color(random(palette));
    this.numPoints = floor(random(6, 10));
  }

  checkCollision(other) {
    let d = dist(this.x, this.y, other.x, other.y);
    let minDist = this.r + other.r;
    
    if (d < minDist) {
      let angle = atan2(this.y - other.y, this.x - other.x);
      let overlap = minDist - d;
      let pushX = cos(angle) * overlap * 0.5;
      let pushY = sin(angle) * overlap * 0.5;
      
      this.x += pushX;
      this.y += pushY;
      other.x -= pushX;
      other.y -= pushY;

      let tempVx = this.vx;
      let tempVy = this.vy;
      this.vx = other.vx;
      this.vy = other.vy;
      other.vx = tempVx;
      other.vy = tempVy;
    }
  }

  update() {
    let dMouse = dist(mouseX, mouseY, this.x, this.y);
    let repelRadius = this.r + 50; 
    if (dMouse < repelRadius) {
      let angle = atan2(this.y - mouseY, this.x - mouseX);
      let force = map(dMouse, 0, repelRadius, 2, 0); 
      this.vx += cos(angle) * force;
      this.vy += sin(angle) * force;
    }

    let speed = sqrt(this.vx * this.vx + this.vy * this.vy);
    let maxSpeed = 6;
    if (speed > maxSpeed) {
      this.vx = (this.vx / speed) * maxSpeed;
      this.vy = (this.vy / speed) * maxSpeed;
    }

    this.x += this.vx;
    this.y += this.vy;

    if (this.x < this.r) { this.x = this.r; this.vx *= -1; }
    else if (this.x > width - this.r) { this.x = width - this.r; this.vx *= -1; }
    
    if (this.y < this.r) { this.y = this.r; this.vy *= -1; }
    else if (this.y > height - this.r) { this.y = height - this.r; this.vy *= -1; }
  }

  display() {
    push();
    translate(this.x, this.y);

    let dMouse = dist(mouseX, mouseY, this.x, this.y);
    let isHovered = dMouse < this.r + 30;

    fill(this.color);
    noStroke();

    if (isHovered) {
      circle(0, 0, this.r * 2);
    } else {
      beginShape();
      let pts = this.numPoints * 2;
      for (let i = 0; i < pts + 3; i++) {
        let angle = map(i % pts, 0, pts, 0, TWO_PI);
        let rad = (i % 2 === 0) ? this.r : this.r * 0.6; 
        let px = cos(angle) * rad;
        let py = sin(angle) * rad;
        curveVertex(px, py);
      }
      endShape();
    }

    // 五官
    let eyeOffsetX = this.r * 0.35;
    let eyeOffsetY = -this.r * 0.15;
    let eyeRadius = this.r * 0.45;
    let pupilRadius = eyeRadius * 0.4;
    let maxEyeDist = (eyeRadius - pupilRadius) / 2;

    fill(255);
    circle(-eyeOffsetX, eyeOffsetY, eyeRadius);
    circle(eyeOffsetX, eyeOffsetY, eyeRadius);

    fill(0);
    let angleL = atan2(mouseY - (this.y + eyeOffsetY), mouseX - (this.x - eyeOffsetX));
    let plX = -eyeOffsetX + cos(angleL) * maxEyeDist;
    let plY = eyeOffsetY + sin(angleL) * maxEyeDist;
    circle(plX, plY, pupilRadius);

    let angleR = atan2(mouseY - (this.y + eyeOffsetY), mouseX - (this.x + eyeOffsetX));
    let prX = eyeOffsetX + cos(angleR) * maxEyeDist;
    let prY = eyeOffsetY + sin(angleR) * maxEyeDist;
    circle(prX, prY, pupilRadius);

    noFill();
    stroke(0);
    strokeWeight(this.r * 0.05);
    arc(0, this.r * 0.15, this.r * 0.7, this.r * 0.7, 0, PI);

    pop();
  }
}