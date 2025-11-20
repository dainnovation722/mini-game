// ゲームの設定
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// ゲーム状態
let gameState = {
    isPlaying: false,
    life: 3,
    score: 0,
    bestScore: 0,
    isInvincible: false,
    player: null,
    balls: [],
    keys: {},
    animationId: null,
    startTime: null,
    lastBallSpawnTime: null,
    targetX: null,
    targetY: null
};

// プレイヤークラス
class Player {
    constructor() {
        this.x = canvas.width / 2;
        this.y = canvas.height / 2;
        this.radius = 20;
        this.speed = 5;
        this.color = '#00f2fe';
        
        // 画像を読み込む
        this.image = new Image();
        this.image.src = 'ore2.png';
        this.imageLoaded = false;
        this.image.onload = () => {
            this.imageLoaded = true;
        };
    }

    draw() {
        // 無敵時間中は点滅
        if (gameState.isInvincible && Math.floor(Date.now() / 100) % 2 === 0) {
            ctx.globalAlpha = 0.3;
        }
        
        // 円形のクリッピングパスを作成
        ctx.save();
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        
        // 画像が読み込まれていれば画像を描画、そうでなければデフォルトの円
        if (this.imageLoaded) {
            ctx.drawImage(this.image, this.x - this.radius, this.y - this.radius, this.radius * 2, this.radius * 2);
        } else {
            // 画像読み込み中の代替表示
            ctx.fillStyle = '#3498db';
            ctx.fill();
        }
        
        ctx.restore();
        
        // 輪郭
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.globalAlpha = 1;
    }

    move() {
        // マウス/タッチ追従モードの場合
        if (gameState.targetX !== null && gameState.targetY !== null) {
            const dx = gameState.targetX - this.x;
            const dy = gameState.targetY - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // ターゲットに近づく（即座に移動）
            if (distance > 3) {
                const moveSpeed = Math.min(this.speed * 2, distance);
                this.x += (dx / distance) * moveSpeed;
                this.y += (dy / distance) * moveSpeed;
            } else {
                // 非常に近い場合は直接移動
                this.x = gameState.targetX;
                this.y = gameState.targetY;
            }
        }
        
        // 矢印キーまたはWASDで移動
        if (gameState.keys['ArrowUp'] || gameState.keys['w']) {
            this.y = Math.max(this.radius, this.y - this.speed);
            gameState.targetX = null;
            gameState.targetY = null;
        }
        if (gameState.keys['ArrowDown'] || gameState.keys['s']) {
            this.y = Math.min(canvas.height - this.radius, this.y + this.speed);
            gameState.targetX = null;
            gameState.targetY = null;
        }
        if (gameState.keys['ArrowLeft'] || gameState.keys['a']) {
            this.x = Math.max(this.radius, this.x - this.speed);
            gameState.targetX = null;
            gameState.targetY = null;
        }
        if (gameState.keys['ArrowRight'] || gameState.keys['d']) {
            this.x = Math.min(canvas.width - this.radius, this.x + this.speed);
            gameState.targetX = null;
            gameState.targetY = null;
        }
        
        // 画面端に収める
        this.x = Math.max(this.radius, Math.min(canvas.width - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(canvas.height - this.radius, this.y));
    }
}

// ボールクラス
class Ball {
    constructor() {
        // ランダムな色（黄色以外）
        const colors = [
            '#ff6b6b', // 赤
            '#ee5a6f', // ピンク
            '#4dabf7', // 青
            '#339af0', // 濃い青
            '#51cf66', // 緑
            '#94d82d', // 黄緑
            '#9775fa', // 紫
            '#f783ac', // ローズ
            '#ff922b', // オレンジ
            '#20c997', // ティール
            '#f06595', // マゼンタ
            '#748ffc'  // インディゴ
        ];
        this.color = colors[Math.floor(Math.random() * colors.length)];
        
        // サイズをランダムに決定（小・中・大）
        const sizeType = Math.random();
        if (sizeType < 0.5) {
            // 小さいボール（速い）
            this.radius = 10 + Math.random() * 5;
            this.speed = 3 + Math.random() * 2;
        } else if (sizeType < 0.8) {
            // 中くらいのボール
            this.radius = 15 + Math.random() * 5;
            this.speed = 2 + Math.random() * 1.5;
        } else {
            // 大きいボール（遅い）
            this.radius = 20 + Math.random() * 10;
            this.speed = 1 + Math.random() * 1;
        }

        // 画面端からスポーン
        const edge = Math.floor(Math.random() * 4);
        switch(edge) {
            case 0: // 上
                this.x = Math.random() * canvas.width;
                this.y = -this.radius;
                break;
            case 1: // 右
                this.x = canvas.width + this.radius;
                this.y = Math.random() * canvas.height;
                break;
            case 2: // 下
                this.x = Math.random() * canvas.width;
                this.y = canvas.height + this.radius;
                break;
            case 3: // 左
                this.x = -this.radius;
                this.y = Math.random() * canvas.height;
                break;
        }

        // ランダムな方向
        const angle = Math.random() * Math.PI * 2;
        this.vx = Math.cos(angle) * this.speed;
        this.vy = Math.sin(angle) * this.speed;
    }

    draw() {
        // グラデーション効果（明るい中心から暗い外側へ）
        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
        gradient.addColorStop(0.4, this.color);
        gradient.addColorStop(1, this.color + '99'); // 透明度を加える
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // モダンな光沢効果
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;

        // 画面端で跳ね返る
        if (this.x - this.radius <= 0 || this.x + this.radius >= canvas.width) {
            this.vx *= -1;
            this.x = Math.max(this.radius, Math.min(canvas.width - this.radius, this.x));
        }
        if (this.y - this.radius <= 0 || this.y + this.radius >= canvas.height) {
            this.vy *= -1;
            this.y = Math.max(this.radius, Math.min(canvas.height - this.radius, this.y));
        }
    }
}

// 衝突判定
function checkCollision(player, ball) {
    const dx = player.x - ball.x;
    const dy = player.y - ball.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < player.radius + ball.radius;
}

// ダメージ処理
function takeDamage() {
    if (gameState.isInvincible) return;

    gameState.life--;
    updateLifeDisplay();
    
    if (gameState.life <= 0) {
        gameOver();
        return;
    }

    // 無敵時間を設定（0.8秒）
    gameState.isInvincible = true;
    setTimeout(() => {
        gameState.isInvincible = false;
    }, 800);
}

// ゲーム開始
function startGame() {
    // 初期化
    gameState.isPlaying = true;
    gameState.life = 3;
    gameState.score = 0;
    gameState.isInvincible = false;
    gameState.balls = [];
    gameState.startTime = Date.now();
    gameState.lastBallSpawnTime = Date.now();

    // ベストスコアをロード
    const saved = localStorage.getItem('dodgeBestScore');
    if (saved) {
        gameState.bestScore = parseInt(saved);
    }

    // プレイヤーを生成
    gameState.player = new Player();

    // 最初のボールを1個生成
    gameState.balls.push(new Ball());

    // スタート画面を非表示
    document.getElementById('startScreen').style.display = 'none';
    document.getElementById('gameOverScreen').style.display = 'none';

    updateLifeDisplay();

    // ゲームループ開始
    gameLoop();
}

// ゲームループ
function gameLoop() {
    if (!gameState.isPlaying) return;

    // 画面クリア（黄色背景）
    ctx.fillStyle = '#ffd93d';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // スコア更新（生存時間）
    gameState.score = Math.floor((Date.now() - gameState.startTime) / 1000);

    // ゲーム情報をキャンバス内に描画
    drawGameInfo();

    // 3秒ごとにボールを増やす
    if (Date.now() - gameState.lastBallSpawnTime >= 3000) {
        gameState.balls.push(new Ball());
        gameState.lastBallSpawnTime = Date.now();
    }

    // プレイヤーの移動と描画
    gameState.player.move();
    gameState.player.draw();

    // ボールの更新と描画
    gameState.balls.forEach(ball => {
        ball.update();
        ball.draw();

        // 衝突判定
        if (checkCollision(gameState.player, ball)) {
            takeDamage();
        }
    });

    // 次のフレームをリクエスト
    gameState.animationId = requestAnimationFrame(gameLoop);
}

// ライフ表示更新
function updateLifeDisplay() {
    const hearts = '❤️'.repeat(gameState.life) + '🖤'.repeat(3 - gameState.life);
    document.getElementById('lifeDisplay').textContent = hearts;
}

// ゲームオーバー
function gameOver() {
    gameState.isPlaying = false;
    cancelAnimationFrame(gameState.animationId);

    // ベストスコア更新
    if (gameState.score > gameState.bestScore) {
        gameState.bestScore = gameState.score;
        localStorage.setItem('dodgeBestScore', gameState.bestScore);
    }

    // 評価メッセージ
    let evaluation = '';
    if (gameState.score <= 15) {
        evaluation = 'もう少し頑張ろう！';
    } else if (gameState.score <= 30) {
        evaluation = 'なかなかやるね！';
    } else if (gameState.score <= 60) {
        evaluation = 'すごい！上級者だ！';
    } else {
        evaluation = '神プレイヤー！';
    }

    // ゲームオーバー画面を表示
    document.getElementById('finalScore').textContent = gameState.score;
    document.getElementById('evaluation').textContent = evaluation;
    document.getElementById('gameOverScreen').style.display = 'flex';
}

// ゲーム情報描画（キャンバス内）
function drawGameInfo() {
    // モダンな透明背景パネル（左上）
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
    ctx.shadowBlur = 10;
    roundRect(ctx, 15, 15, 200, 85, 15);
    ctx.shadowBlur = 0;
    
    // ライフ表示
    ctx.fillStyle = '#2d3436';
    ctx.font = 'bold 16px "Segoe UI", Arial, sans-serif';
    ctx.fillText('LIFE', 30, 40);
    
    const hearts = '❤️'.repeat(gameState.life) + '🤍'.repeat(3 - gameState.life);
    ctx.font = '22px Arial';
    ctx.fillText(hearts, 30, 68);
    
    // 生存時間
    ctx.fillStyle = '#2d3436';
    ctx.font = 'bold 16px "Segoe UI", Arial, sans-serif';
    ctx.fillText('TIME', 140, 40);
    ctx.font = 'bold 28px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#e74c3c';
    ctx.fillText(gameState.score, 145, 72);
    
    // 最高記録（右上）- モダンな透明背景
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.shadowBlur = 10;
    roundRect(ctx, canvas.width - 220, 15, 205, 55, 15);
    ctx.shadowBlur = 0;
    
    ctx.fillStyle = '#2d3436';
    ctx.font = 'bold 14px "Segoe UI", Arial, sans-serif';
    ctx.fillText('BEST SCORE', canvas.width - 200, 38);
    ctx.font = 'bold 24px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#27ae60';
    ctx.fillText(gameState.bestScore, canvas.width - 200, 62);
}

// 角丸四角形を描画する関数
function roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();
}

// リスタート
function restartGame() {
    startGame();
}

// キー入力処理
document.addEventListener('keydown', (e) => {
    gameState.keys[e.key] = true;
    
    // スペースキーでスタート
    if (e.key === ' ' && !gameState.isPlaying) {
        const startScreen = document.getElementById('startScreen');
        const gameOverScreen = document.getElementById('gameOverScreen');
        
        if (startScreen.style.display !== 'none') {
            startGame();
        } else if (gameOverScreen.style.display !== 'none') {
            restartGame();
        }
    }
});

document.addEventListener('keyup', (e) => {
    gameState.keys[e.key] = false;
});

// マウス/タッチ操作
function getCanvasPosition(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    let clientX, clientY;
    
    if (e.touches) {
        // タッチイベント
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else {
        // マウスイベント
        clientX = e.clientX;
        clientY = e.clientY;
    }
    
    return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY
    };
}

// マウス移動
canvas.addEventListener('mousemove', (e) => {
    if (!gameState.isPlaying) return;
    const pos = getCanvasPosition(e);
    gameState.targetX = pos.x;
    gameState.targetY = pos.y;
});

// マウスクリック
canvas.addEventListener('mousedown', (e) => {
    if (!gameState.isPlaying) return;
    const pos = getCanvasPosition(e);
    gameState.targetX = pos.x;
    gameState.targetY = pos.y;
});

// タッチ操作
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (!gameState.isPlaying) return;
    const pos = getCanvasPosition(e);
    gameState.targetX = pos.x;
    gameState.targetY = pos.y;
});

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (!gameState.isPlaying) return;
    const pos = getCanvasPosition(e);
    gameState.targetX = pos.x;
    gameState.targetY = pos.y;
});

canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
});

// 初期表示
window.addEventListener('load', () => {
    const saved = localStorage.getItem('dodgeBestScore');
    if (saved) {
        gameState.bestScore = parseInt(saved);
    }
});
