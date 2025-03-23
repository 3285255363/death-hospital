const express = require('express');
const path = require('path');
const gameState = require('../models/gameState');
const locations = require('../models/locations');

const app = express();

// 添加缓存中间件
const cache = new Map();
const cacheMiddleware = (duration) => {
    return (req, res, next) => {
        const key = req.originalUrl;
        const cachedResponse = cache.get(key);

        if (cachedResponse && Date.now() - cachedResponse.timestamp < duration) {
            return res.send(cachedResponse.content);
        }

        res.sendResponse = res.send;
        res.send = (body) => {
            cache.set(key, {
                content: body,
                timestamp: Date.now()
            });
            res.sendResponse(body);
        };
        next();
    };
};

// 设置模板引擎
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// 设置静态文件目录
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// 开发者页面密码验证中间件
const checkDevPassword = (req, res, next) => {
    const password = req.method === 'GET' ? req.query.password : req.body.password;
    if (password === '0526') {
        next();
    } else {
        res.redirect('/dev/login?error=1');
    }
};

// 消息处理中间件
app.use((req, res, next) => {
    res.locals.message = '';
    res.locals.error = '';
    next();
});

// 开发者页面登录路由
app.get('/dev/login', (req, res) => {
    const error = req.query.error === '1';
    res.render('dev-login', { error });
});

// 主页
app.get('/', (req, res) => {
    const state = gameState.getState();
    // 检查游戏状态是否有效
    if (!state.gameStarted || !state.playerName || state.playerName.length === 0) {
        gameState.resetGame(); // 如果状态无效，重置游戏
    }
    res.render('index', {
        gameStarted: state.gameStarted && state.playerName && state.playerName.length > 0
    });
});

// 开始新游戏页面
app.get('/start', (req, res) => {
    res.render('start');
});

// 处理开始游戏表单
app.post('/start', (req, res) => {
    const playerName = req.body.playerName?.trim();
    if (!playerName) {
        return res.render('start', { error: '请输入玩家名称' });
    }
    gameState.startGame(playerName);
    res.redirect('/game');
});

// 游戏页面路由
app.get('/game', (req, res) => {
    const state = gameState.getState();
    if (!state.gameStarted || !state.playerName || state.playerName.length === 0) {
        return res.redirect('/start');
    }
    
    // 获取当前位置信息
    const currentLocation = locations.getLocation(state.currentLocation);
    if (!currentLocation) {
        console.error('找不到当前位置:', state.currentLocation);
        gameState.resetGame();
        return res.redirect('/start');
    }

    res.render('game', {
        message: res.locals.message,
        gameState: state,
        currentLocation: currentLocation
    });
});

// 处理选择
app.post('/choice', express.json(), (req, res) => {
    try {
        const choice = req.body.choice;
        if (!choice) {
            return res.status(400).json({ error: '未提供选择' });
        }
        
        const state = gameState.getState();
        const currentLocation = locations.getLocation(state.currentLocation);
        
        // 检查选择是否有效
        if (!currentLocation.options || !currentLocation.options[choice]) {
            return res.status(400).json({ error: '无效的选择' });
        }
        
        gameState.makeChoice(choice);
        const newState = gameState.getState();
        const newLocation = locations.getLocation(newState.currentLocation);
        
        res.json({
            success: true,
            message: '选择已处理',
            gameState: newState,
            currentLocation: newLocation
        });
    } catch (error) {
        console.error('处理选择时出错:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

// 返回菜单路由
app.post('/return-to-menu', (req, res) => {
    try {
        gameState.reset();
        res.json({ success: true });
    } catch (error) {
        console.error('返回菜单失败:', error);
        res.status(500).json({ success: false, error: '返回菜单失败' });
    }
});

// 重置游戏
app.post('/reset', (req, res) => {
    gameState.resetGame();
    res.redirect('/');
});

// 开发者页面路由
app.get('/dev', checkDevPassword, (req, res) => {
    const allLocations = locations.getAllLocations();
    const locationsList = Object.entries(allLocations).map(([id, location]) => ({
        id,
        name: location.name || '',
        description: location.description || '',
        options: location.options || {}
    }));
    
    res.render('dev', { 
        gameState: gameState.getState(),
        locations: locationsList,
        message: req.query.message || '',
        error: req.query.error || ''
    });
});

// 开发者页面刷新路由
app.get('/dev/refresh', checkDevPassword, (req, res) => {
    const allLocations = locations.getAllLocations();
    const locationsList = Object.entries(allLocations).map(([id, location]) => ({
        id,
        name: location.name || '',
        description: location.description || '',
        options: location.options || {}
    }));
    
    res.render('dev', { 
        gameState: gameState.getState(),
        locations: locationsList,
        message: '',
        error: ''
    });
});

// 添加新场景
app.post('/dev/location/add', checkDevPassword, (req, res) => {
    try {
        const { id, name, description } = req.body;
        locations.addLocation(id, name, description);
        res.redirect('/dev?password=0526&message=场景添加成功');
    } catch (error) {
        res.redirect(`/dev?password=0526&error=${encodeURIComponent(error.message)}`);
    }
});

// 编辑场景
app.post('/dev/location/edit', checkDevPassword, (req, res) => {
    try {
        const { id, name, description } = req.body;
        locations.editLocation(id, name, description);
        res.redirect('/dev?password=0526&message=场景编辑成功');
    } catch (error) {
        res.redirect(`/dev?password=0526&error=${encodeURIComponent(error.message)}`);
    }
});

// 删除场景
app.post('/dev/location/delete', checkDevPassword, (req, res) => {
    try {
        const { id } = req.body;
        locations.deleteLocation(id);
        res.redirect('/dev?password=0526&message=场景删除成功');
    } catch (error) {
        res.redirect(`/dev?password=0526&error=${encodeURIComponent(error.message)}`);
    }
});

// 添加选项
app.post('/dev/option/add', checkDevPassword, (req, res) => {
    try {
        const { locationId, optionId, text, result, healthChange, nextLocation } = req.body;
        locations.addOption(locationId, optionId, text, result, healthChange, nextLocation);
        res.redirect('/dev?password=0526&message=选项添加成功');
    } catch (error) {
        res.redirect(`/dev?password=0526&error=${encodeURIComponent(error.message)}`);
    }
});

// 错误处理中间件
app.use((err, req, res, next) => {
    console.error('服务器错误:', err);
    res.status(500).send('服务器发生错误');
});

// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`服务器已启动！`);
    console.log(`本地访问地址: http://localhost:${PORT}`);
    console.log(`局域网访问地址: http://${getLocalIP()}:${PORT}`);
});

// 获取本地IP地址
function getLocalIP() {
    const { networkInterfaces } = require('os');
    const nets = networkInterfaces();
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            if (net.family === 'IPv4' && !net.internal) {
                return net.address;
            }
        }
    }
    return 'localhost';
}

module.exports = app;