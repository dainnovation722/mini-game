// ゲームの設定
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const GRAVITY = 0.6;
const JUMP_FORCE = -12;
const PLAYER_SPEED = 4;

// ゲーム状態
let gameState = {
    isPlaying: false,
    life: 3,
    score: 0,
    coinCount: 0,
    player: null,
    platforms: [],
    enemies: [],
    coins: [],
    goal: null,
    keys: {},
    animationId: null,
    camera: { x: 0 },
    currentStage: 1,
    maxStage: 3
};

// プレイヤークラス
class Player {
    constructor() {
        this.width = 40;
        this.height = 40;
        this.x = 100;
        this.y = canvas.height - 150;
        this.vx = 0;
        this.vy = 0;
        this.jumping = false;
        this.isInvincible = false;
        
        // 画像を読み込む
        this.image = new Image();
        this.image.src = 'ore.png';
        this.imageLoaded = false;
        this.image.onload = () => {
            this.imageLoaded = true;
        };
    }

    draw() {
        const drawX = this.x - gameState.camera.x;
        
        // 無敵時間中は点滅
        if (this.isInvincible && Math.floor(Date.now() / 100) % 2 === 0) {
            ctx.globalAlpha = 0.3;
        }

        // 画像が読み込まれていれば画像を描画、そうでなければデフォルトの四角
        if (this.imageLoaded) {
            ctx.drawImage(this.image, drawX, this.y, this.width, this.height);
        } else {
            // 画像読み込み中の代替表示
            ctx.fillStyle = '#3498db';
            ctx.fillRect(drawX, this.y, this.width, this.height);
        }

        ctx.globalAlpha = 1;
    }

    update() {
        // 左右移動
        this.vx = 0;
        if (gameState.keys['ArrowLeft'] || gameState.keys['a']) {
            this.vx = -PLAYER_SPEED;
        }
        if (gameState.keys['ArrowRight'] || gameState.keys['d']) {
            this.vx = PLAYER_SPEED;
        }

        // ジャンプ
        if ((gameState.keys['ArrowUp'] || gameState.keys[' '] || gameState.keys['w']) && !this.jumping) {
            this.vy = JUMP_FORCE;
            this.jumping = true;
        }

        // 重力
        this.vy += GRAVITY;

        // 移動
        this.x += this.vx;
        this.y += this.vy;

        // 地面との衝突
        gameState.platforms.forEach(platform => {
            if (this.checkCollision(platform)) {
                if (this.vy > 0 && this.y + this.height - this.vy <= platform.y) {
                    this.y = platform.y - this.height;
                    this.vy = 0;
                    this.jumping = false;
                }
            }
        });

        // 画面下に落ちた
        if (this.y > canvas.height) {
            takeDamage();
        }

        // カメラ追従
        gameState.camera.x = Math.max(0, this.x - canvas.width / 3);
    }

    checkCollision(obj) {
        return this.x < obj.x + obj.width &&
               this.x + this.width > obj.x &&
               this.y < obj.y + obj.height &&
               this.y + this.height > obj.y;
    }

    respawn() {
        this.x = 100;
        this.y = canvas.height - 150;
        this.vx = 0;
        this.vy = 0;
        this.jumping = false;
    }
}

// プラットフォームクラス
class Platform {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }

    draw() {
        const drawX = this.x - gameState.camera.x;
        ctx.fillStyle = '#8b4513';
        ctx.fillRect(drawX, this.y, this.width, this.height);
        
        // レンガ模様
        ctx.strokeStyle = '#654321';
        ctx.lineWidth = 2;
        for (let i = 0; i < this.width; i += 30) {
            ctx.strokeRect(drawX + i, this.y, 30, this.height);
        }
    }
}

// 敵クラス
class Enemy {
    constructor(x, y, speed = 1.5) {
        this.width = 30;
        this.height = 30;
        this.x = x;
        this.y = y;
        this.vx = -speed;
        this.alive = true;
    }

    draw() {
        if (!this.alive) return;
        
        const drawX = this.x - gameState.camera.x;
        
        // 敵の体（茶色）
        ctx.fillStyle = '#8b4513';
        ctx.fillRect(drawX, this.y, this.width, this.height);

        // 目
        ctx.fillStyle = '#fff';
        ctx.fillRect(drawX + 5, this.y + 8, 8, 8);
        ctx.fillRect(drawX + 17, this.y + 8, 8, 8);

        // 瞳
        ctx.fillStyle = '#000';
        ctx.fillRect(drawX + 8, this.y + 11, 3, 3);
        ctx.fillRect(drawX + 20, this.y + 11, 3, 3);

        // 口
        ctx.fillStyle = '#000';
        ctx.fillRect(drawX + 10, this.y + 20, 10, 3);
    }

    update() {
        if (!this.alive) return;

        this.x += this.vx;

        // プラットフォームの端で反転
        let onPlatform = false;
        gameState.platforms.forEach(platform => {
            if (this.y + this.height >= platform.y && this.y + this.height <= platform.y + 10) {
                if (this.x + this.width < platform.x || this.x > platform.x + platform.width) {
                    this.vx *= -1;
                }
                onPlatform = true;
            }
        });
    }
}

// コインクラス
class Coin {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 20;
        this.height = 20;
        this.collected = false;
    }

    draw() {
        if (this.collected) return;

        const drawX = this.x - gameState.camera.x;
        
        ctx.fillStyle = '#f1c40f';
        ctx.beginPath();
        ctx.arc(drawX + 10, this.y + 10, 10, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#f39c12';
        ctx.beginPath();
        ctx.arc(drawX + 10, this.y + 10, 6, 0, Math.PI * 2);
        ctx.fill();
    }
}

// ゴールクラス
class Goal {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 40;
        this.height = 80;
    }

    draw() {
        const drawX = this.x - gameState.camera.x;
        
        // ポール
        ctx.fillStyle = '#000';
        ctx.fillRect(drawX + 18, this.y, 4, this.height);

        // 旗
        ctx.fillStyle = '#27ae60';
        ctx.beginPath();
        ctx.moveTo(drawX + 22, this.y + 10);
        ctx.lineTo(drawX + 22, this.y + 40);
        ctx.lineTo(drawX + 50, this.y + 25);
        ctx.closePath();
        ctx.fill();
    }
}

// ステージ作成
function createStage() {
    if (gameState.currentStage === 1) {
        // ステージ1: 初心者向け
        gameState.platforms = [
            new Platform(0, canvas.height - 50, 2000, 50),
            new Platform(300, canvas.height - 150, 150, 30),
            new Platform(500, canvas.height - 200, 120, 30),
            new Platform(700, canvas.height - 150, 150, 30),
            new Platform(950, canvas.height - 250, 100, 30),
            new Platform(1150, canvas.height - 200, 150, 30),
            new Platform(1400, canvas.height - 150, 200, 30),
        ];

        gameState.enemies = [
            new Enemy(400, canvas.height - 180),
            new Enemy(750, canvas.height - 180),
            new Enemy(1200, canvas.height - 230),
        ];

        gameState.coins = [
            new Coin(350, canvas.height - 200),
            new Coin(380, canvas.height - 200),
            new Coin(550, canvas.height - 250),
            new Coin(1000, canvas.height - 300),
            new Coin(1450, canvas.height - 200),
            new Coin(1500, canvas.height - 200),
        ];

        gameState.goal = new Goal(1700, canvas.height - 130);
    } 
    else if (gameState.currentStage === 2) {
        // ステージ2: 中級者向け - 穴が増える、敵が多い
        gameState.platforms = [
            new Platform(0, canvas.height - 50, 400, 50),
            new Platform(550, canvas.height - 50, 400, 50),
            new Platform(1100, canvas.height - 50, 500, 50),
            new Platform(1750, canvas.height - 50, 500, 50),
            
            new Platform(250, canvas.height - 180, 100, 30),
            new Platform(450, canvas.height - 220, 80, 30),
            new Platform(650, canvas.height - 180, 120, 30),
            new Platform(850, canvas.height - 250, 100, 30),
            new Platform(1050, canvas.height - 200, 100, 30),
            new Platform(1300, canvas.height - 280, 120, 30),
            new Platform(1500, canvas.height - 200, 100, 30),
            new Platform(1700, canvas.height - 250, 100, 30),
            new Platform(1900, canvas.height - 180, 150, 30),
        ];

        gameState.enemies = [
            new Enemy(100, canvas.height - 80),
            new Enemy(300, canvas.height - 210),
            new Enemy(700, canvas.height - 210),
            new Enemy(900, canvas.height - 280),
            new Enemy(1150, canvas.height - 80),
            new Enemy(1550, canvas.height - 230),
            new Enemy(1950, canvas.height - 210),
        ];

        gameState.coins = [
            new Coin(300, canvas.height - 230),
            new Coin(500, canvas.height - 270),
            new Coin(700, canvas.height - 230),
            new Coin(900, canvas.height - 300),
            new Coin(1100, canvas.height - 250),
            new Coin(1350, canvas.height - 330),
            new Coin(1550, canvas.height - 250),
            new Coin(1750, canvas.height - 300),
            new Coin(1950, canvas.height - 230),
            new Coin(2000, canvas.height - 230),
        ];

        gameState.goal = new Goal(2150, canvas.height - 130);
    }
    else if (gameState.currentStage === 3) {
        // ステージ3: 上級者向け - 複雑な地形、敵が速い
        gameState.platforms = [
            new Platform(0, canvas.height - 50, 300, 50),
            new Platform(450, canvas.height - 50, 300, 50),
            new Platform(900, canvas.height - 50, 300, 50),
            new Platform(1350, canvas.height - 50, 300, 50),
            new Platform(1800, canvas.height - 50, 300, 50),
            new Platform(2250, canvas.height - 50, 400, 50),
            
            new Platform(200, canvas.height - 200, 80, 30),
            new Platform(350, canvas.height - 270, 80, 30),
            new Platform(500, canvas.height - 200, 80, 30),
            new Platform(650, canvas.height - 280, 80, 30),
            new Platform(800, canvas.height - 200, 80, 30),
            new Platform(950, canvas.height - 300, 80, 30),
            new Platform(1100, canvas.height - 220, 80, 30),
            new Platform(1250, canvas.height - 300, 80, 30),
            new Platform(1400, canvas.height - 200, 80, 30),
            new Platform(1550, canvas.height - 280, 80, 30),
            new Platform(1700, canvas.height - 200, 80, 30),
            new Platform(1850, canvas.height - 290, 80, 30),
            new Platform(2000, canvas.height - 200, 80, 30),
            new Platform(2150, canvas.height - 270, 80, 30),
            new Platform(2350, canvas.height - 200, 120, 30),
        ];

        gameState.enemies = [
            new Enemy(50, canvas.height - 80, 2.5),
            new Enemy(250, canvas.height - 230, 2.5),
            new Enemy(550, canvas.height - 230, 2.5),
            new Enemy(700, canvas.height - 310, 2.5),
            new Enemy(850, canvas.height - 230, 2.5),
            new Enemy(1000, canvas.height - 330, 2.5),
            new Enemy(1150, canvas.height - 250, 2.5),
            new Enemy(1300, canvas.height - 330, 2.5),
            new Enemy(1450, canvas.height - 230, 2.5),
            new Enemy(1600, canvas.height - 310, 2.5),
            new Enemy(1750, canvas.height - 230, 2.5),
            new Enemy(1900, canvas.height - 320, 2.5),
            new Enemy(2050, canvas.height - 230, 2.5),
        ];

        gameState.coins = [
            new Coin(250, canvas.height - 250),
            new Coin(400, canvas.height - 320),
            new Coin(550, canvas.height - 250),
            new Coin(700, canvas.height - 330),
            new Coin(850, canvas.height - 250),
            new Coin(1000, canvas.height - 350),
            new Coin(1150, canvas.height - 270),
            new Coin(1300, canvas.height - 350),
            new Coin(1450, canvas.height - 250),
            new Coin(1600, canvas.height - 330),
            new Coin(1750, canvas.height - 250),
            new Coin(1900, canvas.height - 340),
            new Coin(2050, canvas.height - 250),
            new Coin(2200, canvas.height - 320),
            new Coin(2400, canvas.height - 250),
        ];

        gameState.goal = new Goal(2550, canvas.height - 130);
    }
}

// ダメージ処理
function takeDamage() {
    if (gameState.player.isInvincible) return;

    gameState.life--;
    updateLifeDisplay();

    if (gameState.life <= 0) {
        gameOver();
        return;
    }

    gameState.player.isInvincible = true;
    setTimeout(() => {
        gameState.player.isInvincible = false;
    }, 2000);
}

// ゲーム開始
function startGame(continueGame = false) {
    gameState.isPlaying = true;
    
    if (!continueGame) {
        // 新規ゲーム
        gameState.life = 3;
        gameState.score = 0;
        gameState.coinCount = 0;
        gameState.currentStage = 1;
    }
    
    gameState.camera.x = 0;

    gameState.player = new Player();
    createStage();

    document.getElementById('startScreen').style.display = 'none';
    document.getElementById('gameOverScreen').style.display = 'none';
    document.getElementById('clearScreen').style.display = 'none';

    updateLifeDisplay();
    updateScoreDisplay();
    updateStageDisplay();

    gameLoop();
}

// ゲームループ
function gameLoop() {
    if (!gameState.isPlaying) return;

    // 画面クリア
    ctx.fillStyle = '#5dade2';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 雲を描画
    drawClouds();

    // プレイヤー更新
    gameState.player.update();

    // 敵の更新と衝突判定
    gameState.enemies.forEach(enemy => {
        enemy.update();
        
        if (enemy.alive && gameState.player.checkCollision(enemy)) {
            // 踏みつけ判定
            if (gameState.player.vy > 0 && gameState.player.y + gameState.player.height - gameState.player.vy <= enemy.y + 10) {
                enemy.alive = false;
                gameState.player.vy = JUMP_FORCE / 2;
                gameState.score += 100;
                updateScoreDisplay();
            } else {
                takeDamage();
            }
        }
    });

    // コインの衝突判定
    gameState.coins.forEach(coin => {
        if (!coin.collected && gameState.player.checkCollision(coin)) {
            coin.collected = true;
            gameState.coinCount++;
            gameState.score += 50;
            updateScoreDisplay();
            updateCoinDisplay();
        }
    });

    // ゴール判定
    if (gameState.player.checkCollision(gameState.goal)) {
        gameClear();
        return;
    }

    // 描画
    gameState.platforms.forEach(p => p.draw());
    gameState.enemies.forEach(e => e.draw());
    gameState.coins.forEach(c => c.draw());
    gameState.goal.draw();
    gameState.player.draw();

    gameState.animationId = requestAnimationFrame(gameLoop);
}

// 雲の描画
function drawClouds() {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    const clouds = [
        { x: 100, y: 50 },
        { x: 400, y: 80 },
        { x: 700, y: 60 },
        { x: 1000, y: 70 },
    ];

    clouds.forEach(cloud => {
        const drawX = cloud.x - gameState.camera.x * 0.5;
        ctx.beginPath();
        ctx.arc(drawX, cloud.y, 20, 0, Math.PI * 2);
        ctx.arc(drawX + 25, cloud.y, 25, 0, Math.PI * 2);
        ctx.arc(drawX + 50, cloud.y, 20, 0, Math.PI * 2);
        ctx.fill();
    });
}

// 表示更新
function updateLifeDisplay() {
    const hearts = '❤️'.repeat(gameState.life) + '🖤'.repeat(3 - gameState.life);
    document.getElementById('lifeDisplay').textContent = hearts;
}

function updateScoreDisplay() {
    document.getElementById('scoreDisplay').textContent = `Stage ${gameState.currentStage} - ${gameState.score}`;
}

function updateCoinDisplay() {
    document.getElementById('coinDisplay').textContent = gameState.coinCount;
}

function updateStageDisplay() {
    const scoreDisplay = document.getElementById('scoreDisplay');
    scoreDisplay.textContent = `Stage ${gameState.currentStage} - ${gameState.score}`;
}

// ゲームオーバー
function gameOver() {
    gameState.isPlaying = false;
    cancelAnimationFrame(gameState.animationId);

    document.getElementById('finalScore').textContent = gameState.score;
    document.getElementById('finalCoins').textContent = gameState.coinCount;
    document.getElementById('gameOverScreen').style.display = 'flex';
}

// ゲームクリア
function gameClear() {
    gameState.isPlaying = false;
    cancelAnimationFrame(gameState.animationId);

    // 次のステージがある場合
    if (gameState.currentStage < gameState.maxStage) {
        gameState.currentStage++;
        
        // ボーナス得点
        gameState.score += 500;
        
        // 次のステージへ
        setTimeout(() => {
            startGame(true); // 継続フラグをtrue
        }, 2000);
        
        // 一時的にクリアメッセージ表示
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 40px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`ステージ${gameState.currentStage - 1}クリア！`, canvas.width / 2, canvas.height / 2 - 20);
        ctx.font = '24px Arial';
        ctx.fillText(`次のステージへ...`, canvas.width / 2, canvas.height / 2 + 30);
    } else {
        // 全ステージクリア
        document.getElementById('clearScore').textContent = gameState.score;
        document.getElementById('clearCoins').textContent = gameState.coinCount;
        document.getElementById('clearScreen').style.display = 'flex';
        
        // 全クリメッセージ
        const evalText = document.getElementById('clearScreen').querySelector('.evaluation');
        if (evalText) {
            evalText.remove();
        }
        const resultDiv = document.getElementById('clearScreen').querySelector('.result');
        const allClearMsg = document.createElement('p');
        allClearMsg.style.fontSize = '28px';
        allClearMsg.style.color = '#f1c40f';
        allClearMsg.style.fontWeight = 'bold';
        allClearMsg.textContent = '🎊 全ステージクリア！ 🎊';
        resultDiv.appendChild(allClearMsg);
    }
}

// リスタート
function restartGame() {
    startGame();
}

// キー入力
document.addEventListener('keydown', (e) => {
    gameState.keys[e.key] = true;
    
    if (e.key === ' ' && !gameState.isPlaying) {
        e.preventDefault();
        const startScreen = document.getElementById('startScreen');
        if (startScreen.style.display !== 'none') {
            startGame();
        }
    }
});

document.addEventListener('keyup', (e) => {
    gameState.keys[e.key] = false;
});

// モバイル用ボタン
document.getElementById('btnLeft').addEventListener('touchstart', (e) => {
    e.preventDefault();
    gameState.keys['ArrowLeft'] = true;
});

document.getElementById('btnLeft').addEventListener('touchend', (e) => {
    e.preventDefault();
    gameState.keys['ArrowLeft'] = false;
});

document.getElementById('btnRight').addEventListener('touchstart', (e) => {
    e.preventDefault();
    gameState.keys['ArrowRight'] = true;
});

document.getElementById('btnRight').addEventListener('touchend', (e) => {
    e.preventDefault();
    gameState.keys['ArrowRight'] = false;
});

document.getElementById('btnJump').addEventListener('touchstart', (e) => {
    e.preventDefault();
    gameState.keys[' '] = true;
});

document.getElementById('btnJump').addEventListener('touchend', (e) => {
    e.preventDefault();
    gameState.keys[' '] = false;
});

// マウスクリックでもボタン操作
['btnLeft', 'btnRight', 'btnJump'].forEach(id => {
    const btn = document.getElementById(id);
    btn.addEventListener('mousedown', () => {
        if (id === 'btnLeft') gameState.keys['ArrowLeft'] = true;
        if (id === 'btnRight') gameState.keys['ArrowRight'] = true;
        if (id === 'btnJump') gameState.keys[' '] = true;
    });
    btn.addEventListener('mouseup', () => {
        if (id === 'btnLeft') gameState.keys['ArrowLeft'] = false;
        if (id === 'btnRight') gameState.keys['ArrowRight'] = false;
        if (id === 'btnJump') gameState.keys[' '] = false;
    });
});
