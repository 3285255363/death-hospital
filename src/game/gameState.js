class GameState {
    constructor() {
        this.player = {
            name: '',
            health: 6,  // 6颗心
            inventory: [],
            location: 'start'
        };
        this.gameStarted = false;
    }

    startGame(playerName) {
        this.player.name = playerName;
        this.gameStarted = true;
        return this.getCurrentLocation();
    }

    getCurrentLocation() {
        const locations = {
            start: {
                description: '你醒来发现自己在一个陌生的房间里。房间里有一扇门和一扇窗。',
                options: [
                    { text: '查看门', next: 'door' },
                    { text: '查看窗', next: 'window' }
                ]
            },
            door: {
                description: '这是一扇普通的木门，看起来可以打开。',
                options: [
                    { text: '打开门', next: 'hallway' },
                    { text: '返回', next: 'start' }
                ]
            },
            window: {
                description: '透过窗户，你看到外面是一个陌生的城市。',
                options: [
                    { text: '仔细观察', next: 'window_detail' },
                    { text: '返回', next: 'start' }
                ]
            },
            hallway: {
                description: '你来到了一个走廊，走廊两边各有一扇门。',
                options: [
                    { text: '打开左边的门', next: 'left_room' },
                    { text: '打开右边的门', next: 'right_room' },
                    { text: '返回', next: 'door' }
                ]
            },
            left_room: {
                description: '你进入了一个充满危险的房间。',
                options: [
                    { text: '探索房间', next: 'left_room', action: 'damage' },
                    { text: '返回', next: 'hallway' }
                ]
            },
            right_room: {
                description: '你发现了一个医疗包。',
                options: [
                    { text: '使用医疗包', next: 'right_room', action: 'heal' },
                    { text: '返回', next: 'hallway' }
                ]
            }
        };

        return locations[this.player.location] || locations.start;
    }

    makeChoice(choice) {
        const currentLocation = this.getCurrentLocation();
        const selectedOption = currentLocation.options.find(opt => opt.text === choice);
        
        if (selectedOption) {
            if (selectedOption.action === 'damage') {
                this.player.health = Math.max(0, this.player.health - 1);  // 失去一颗心
            } else if (selectedOption.action === 'heal') {
                this.player.health = Math.min(6, this.player.health + 1);  // 恢复一颗心
            }
            this.player.location = selectedOption.next;
            return this.getCurrentLocation();
        }
        
        return currentLocation;
    }

    resetGame() {
        this.player = {
            name: '',
            health: 6,  // 重置为6颗心
            inventory: [],
            location: 'start'
        };
        this.gameStarted = false;
    }
}

module.exports = GameState; 