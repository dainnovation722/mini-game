// ゲームの状態管理
let gameState = {
    age: 0,           // 月齢（0歳0ヶ月からスタート）
    hunger: 100,      // 満腹度 (0-100)
    happiness: 100,   // ご機嫌度 (0-100)
    energy: 100,      // 体力 (0-100)
    stage: 0,         // 成長段階 (0:赤ちゃん, 1:幼児, 2:子供, 3:少年少女, 4:大人)
    cleanliness: 100, // 清潔さ
    isGameOver: false
};

// 成長段階の定義
const growthStages = [
    {
        minAge: 0,
        maxAge: 35,
        emoji: '👶',
        stageName: '赤ちゃん',
        messages: [
            'バブー！ももちゃんはお腹が空いたみたい！',
            'バブバブ～♪',
            'んぎゃー！かまって欲しいみたい！',
            'すやすや...気持ちよさそう...'
        ]
    },
    {
        minAge: 36,
        maxAge: 71,
        emoji: '👧',
        stageName: '幼児',
        messages: [
            'ごはん、おいしい！',
            'あそんで、あそんで～！',
            'もも、げんきだよ！',
            'ねむい...zzZ'
        ]
    },
    {
        minAge: 72,
        maxAge: 143,
        emoji: '🧒',
        stageName: '子供',
        messages: [
            'お腹すいた～！',
            '一緒に遊ぼう！楽しいね！',
            '今日も元気いっぱいだよ！',
            'もうちょっと遊びたいなぁ'
        ]
    },
    {
        minAge: 144,
        maxAge: 215,
        emoji: '👩',
        stageName: '少女',
        messages: [
            'お腹空いた...何か作ってくれる？',
            'たまには遊ぶのもいいよね♪',
            '最近、将来のこと考えるんだ',
            '部屋が汚いと落ち着かないよね'
        ]
    },
    {
        minAge: 216,
        maxAge: 999,
        emoji: '👩‍💼',
        stageName: '大人',
        messages: [
            'しっかり食べないとね',
            'たまにはリフレッシュも大事だよね',
            '自分の道を歩んでいくね！',
            'ここまで育ててくれてありがとう！'
        ]
    }
];

// ゲーム初期化
function initGame() {
    // 保存データがあればロード
    const savedGame = localStorage.getItem('momoGameSave');
    if (savedGame) {
        gameState = JSON.parse(savedGame);
        updateDisplay();
        showMessage('おかえり！ももちゃんが待ってたよ！');
    } else {
        showMessage('ももちゃんが生まれました！大切に育ててね！');
    }
    
    // 自動セーブ開始
    setInterval(autoSave, 30000); // 30秒ごとに自動保存
    
    // ゲームループ開始
    gameLoop();
}

// ゲームループ（時間経過処理）
function gameLoop() {
    setInterval(() => {
        if (gameState.isGameOver) return;
        
        // 時間経過による変化
        gameState.age += 1; // 1ヶ月経過
        gameState.hunger = Math.max(0, gameState.hunger - 2);
        gameState.happiness = Math.max(0, gameState.happiness - 1);
        gameState.energy = Math.max(0, gameState.energy - 0.5);
        gameState.cleanliness = Math.max(0, gameState.cleanliness - 1);
        
        // 成長段階の更新
        updateGrowthStage();
        
        // 危機的状態のチェック
        checkCriticalStatus();
        
        // 表示更新
        updateDisplay();
        
        // ランダムメッセージ
        if (Math.random() < 0.1) {
            showRandomMessage();
        }
        
    }, 3000); // 3秒ごとに更新（1ヶ月経過）
}

// 成長段階の更新
function updateGrowthStage() {
    for (let i = 0; i < growthStages.length; i++) {
        const stage = growthStages[i];
        if (gameState.age >= stage.minAge && gameState.age <= stage.maxAge) {
            if (gameState.stage !== i) {
                gameState.stage = i;
                showMessage(`🎉 ももちゃんが${stage.stageName}になりました！ 🎉`);
                
                // 大人になったらエンディング
                if (i === growthStages.length - 1) {
                    setTimeout(() => {
                        showMessage('おめでとう！ももちゃんは立派な大人になりました！育成完了です！🎊');
                        gameState.isGameOver = true;
                    }, 2000);
                }
            }
            break;
        }
    }
}

// ごはんをあげる
function feedMomo() {
    if (gameState.isGameOver) return;
    
    if (gameState.hunger >= 90) {
        showMessage('まだお腹いっぱいみたい！');
        return;
    }
    
    gameState.hunger = Math.min(100, gameState.hunger + 30);
    gameState.happiness = Math.min(100, gameState.happiness + 5);
    updateDisplay();
    
    const stage = growthStages[gameState.stage];
    const messages = [
        'もぐもぐ...おいしい！',
        'ごはん、ありがとう！',
        'いただきます～！'
    ];
    showMessage(messages[Math.floor(Math.random() * messages.length)]);
}

// 一緒に遊ぶ
function playWithMomo() {
    if (gameState.isGameOver) return;
    
    if (gameState.energy < 20) {
        showMessage('疲れてるみたい...休ませてあげよう');
        return;
    }
    
    gameState.happiness = Math.min(100, gameState.happiness + 25);
    gameState.energy = Math.max(0, gameState.energy - 15);
    gameState.hunger = Math.max(0, gameState.hunger - 5);
    updateDisplay();
    
    const messages = [
        'わーい！楽しいね！',
        'もっと遊ぼう！',
        'えへへ、うれしい！'
    ];
    showMessage(messages[Math.floor(Math.random() * messages.length)]);
}

// 寝かせる
function sleepMomo() {
    if (gameState.isGameOver) return;
    
    if (gameState.energy >= 95) {
        showMessage('まだ眠くないみたい！');
        return;
    }
    
    gameState.energy = Math.min(100, gameState.energy + 40);
    gameState.hunger = Math.max(0, gameState.hunger - 10);
    gameState.age += 2; // 寝ると時間が少し進む
    updateDisplay();
    updateGrowthStage();
    
    showMessage('すやすや...ぐっすり眠りました！');
}

// 部屋を掃除する
function cleanRoom() {
    if (gameState.isGameOver) return;
    
    if (gameState.cleanliness >= 90) {
        showMessage('お部屋はきれいだよ！');
        return;
    }
    
    gameState.cleanliness = 100;
    gameState.happiness = Math.min(100, gameState.happiness + 10);
    gameState.energy = Math.max(0, gameState.energy - 10);
    updateDisplay();
    
    showMessage('ピカピカになった！気持ちいいね！');
}

// 危機的状態のチェック
function checkCriticalStatus() {
    if (gameState.hunger <= 0) {
        showMessage('⚠️ お腹が空きすぎています！すぐにごはんをあげて！');
        gameState.happiness = Math.max(0, gameState.happiness - 5);
        gameState.energy = Math.max(0, gameState.energy - 5);
    }
    
    if (gameState.happiness <= 20) {
        showMessage('😢 ももちゃんが悲しそう...遊んであげよう！');
    }
    
    if (gameState.energy <= 20) {
        showMessage('💤 すごく疲れてるみたい...休ませてあげよう');
    }
    
    if (gameState.cleanliness <= 30) {
        showMessage('🧹 お部屋が汚れてきた...掃除しよう！');
    }
}

// ランダムメッセージ表示
function showRandomMessage() {
    const stage = growthStages[gameState.stage];
    const message = stage.messages[Math.floor(Math.random() * stage.messages.length)];
    showMessage(message);
}

// 表示更新
function updateDisplay() {
    // 年齢表示
    const years = Math.floor(gameState.age / 12);
    const months = gameState.age % 12;
    document.getElementById('ageDisplay').textContent = `${years}歳${months}ヶ月`;
    
    // キャラクター絵文字
    const stage = growthStages[gameState.stage];
    document.querySelector('.character-emoji').textContent = stage.emoji;
    
    // ステータスバー更新
    updateStatusBar('hunger', gameState.hunger);
    updateStatusBar('happiness', gameState.happiness);
    updateStatusBar('energy', gameState.energy);
}

// ステータスバー更新
function updateStatusBar(stat, value) {
    const bar = document.getElementById(stat + 'Bar');
    const valueDisplay = document.getElementById(stat + 'Value');
    
    bar.style.width = value + '%';
    valueDisplay.textContent = Math.floor(value);
    
    // 色の変更（低い時は警告色に）
    if (value < 30) {
        bar.style.opacity = '0.5';
    } else {
        bar.style.opacity = '1';
    }
}

// メッセージ表示
function showMessage(text) {
    const messageBox = document.getElementById('messageText');
    messageBox.textContent = text;
    
    // アニメーション効果
    messageBox.style.animation = 'none';
    setTimeout(() => {
        messageBox.style.animation = 'fadeIn 0.5s ease';
    }, 10);
}

// 自動保存
function autoSave() {
    if (!gameState.isGameOver) {
        localStorage.setItem('momoGameSave', JSON.stringify(gameState));
    }
}

// 手動保存
function saveGame() {
    localStorage.setItem('momoGameSave', JSON.stringify(gameState));
    showMessage('💾 ゲームを保存しました！');
}

// ゲームリセット
function resetGame() {
    if (confirm('ゲームをリセットしますか？すべての進行状況が消えます。')) {
        localStorage.removeItem('momoGameSave');
        gameState = {
            age: 0,
            hunger: 100,
            happiness: 100,
            energy: 100,
            stage: 0,
            cleanliness: 100,
            isGameOver: false
        };
        updateDisplay();
        showMessage('新しいももちゃんが生まれました！');
    }
}

// メッセージアニメーション用CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeIn {
        from {
            opacity: 0;
            transform: translateY(-10px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
`;
document.head.appendChild(style);

// ページ読み込み時にゲーム開始
window.addEventListener('load', initGame);

// ページを離れる前に自動保存
window.addEventListener('beforeunload', autoSave);
