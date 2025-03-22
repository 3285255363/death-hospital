const fs = require('fs');
const path = require('path');
const locations = require('./locations');

const SAVE_FILE = path.join(__dirname, '../data/gameState.json');
let saveTimeout = null;
const SAVE_DELAY = 1000; // 1秒延迟

class GameState {
    constructor() {
        this.state = {
            gameStarted: false,
            playerName: '',
            currentLocation: 'start',
            health: 3,
            inventory: [],
            visitedLocations: new Set()
        };
        this.loadState();
    }

    // 获取当前状态
    getState() {
        return this.state;
    }

    // 重置游戏
    resetGame() {
        this.state = {
            gameStarted: false,
            playerName: '',
            currentLocation: 'start',
            health: 3,
            inventory: [],
            visitedLocations: new Set()
        };
        this.saveState();
        console.log('游戏已重置:', this.state);  // 添加日志
    }

    // 开始新游戏
    startGame(playerName) {
        this.state.playerName = playerName;
        this.state.gameStarted = true;
        this.state.currentLocation = 'start';
        this.state.health = 6;
        this.state.inventory = [];
        this.state.visitedLocations = new Set();
        this.saveState();
    }

    // 保存状态
    saveState() {
        // 清除之前的定时器
        if (saveTimeout) {
            clearTimeout(saveTimeout);
        }

        // 设置新的定时器
        saveTimeout = setTimeout(() => {
            const saveData = {
                ...this.state,
                visitedLocations: Array.from(this.state.visitedLocations)
            };
            try {
                fs.writeFileSync(SAVE_FILE, JSON.stringify(saveData, null, 2));
                console.log('游戏状态已保存');
            } catch (error) {
                console.error('保存游戏状态错误:', error);
            }
        }, SAVE_DELAY);
    }

    // 加载状态
    loadState() {
        try {
            if (fs.existsSync(SAVE_FILE)) {
                const data = JSON.parse(fs.readFileSync(SAVE_FILE, 'utf8'));
                this.state = {
                    ...data,
                    visitedLocations: new Set(data.visitedLocations)
                };
            }
        } catch (error) {
            console.error('加载游戏状态错误:', error);
        }
    }

    // 做出选择
    makeChoice(choice) {
        const currentLocation = this.state.currentLocation;
        const location = locations.getLocation(currentLocation);
        
        if (!location || !location.options || !location.options[choice]) {
            console.error('无效的选择:', { currentLocation, choice });
            return;
        }

        const option = location.options[choice];
        console.log('选择的选项:', option);  // 添加日志
        
        // 更新生命值
        if (option.healthChange) {
            this.state.health += option.healthChange;
            // 确保生命值不会小于0
            this.state.health = Math.max(0, this.state.health);
            console.log('更新后的生命值:', this.state.health);  // 添加日志
        }

        // 更新物品栏
        if (option.addItem) {
            this.state.inventory.push(option.addItem);
        }
        if (option.removeItem) {
            this.state.inventory = this.state.inventory.filter(item => item !== option.removeItem);
        }

        // 更新位置
        if (option.nextLocation) {
            this.state.currentLocation = option.nextLocation;
            console.log('更新后的位置:', this.state.currentLocation);  // 添加日志
        }

        // 记录访问过的位置
        this.state.visitedLocations.add(currentLocation);

        this.saveState();
    }
}

module.exports = new GameState(); 