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
app.get('/', cacheMiddleware(60000), (req, res) => {
    const state = gameState.getState();
    console.log('主页游戏状态:', state);
    res.render('index', { 
        gameStarted: state.gameStarted && state.playerName && state.playerName.length > 0,
        message: null,
        error: null
    });
});

// 开始新游戏页面
app.get('/start', (req, res) => {
    res.render('start');
});

// 处理开始新游戏的表单提交
app.post('/start', async (req, res) => {
    try {
        const locations = await locations.getAllLocations();
        const startLocation = locations.find(loc => loc.isStart);
        if (!startLocation) {
            throw new Error('找不到起始位置');
        }

        const gameState = new gameState({
            currentLocation: startLocation._id,
            visitedLocations: [startLocation._id],
            inventory: []
        });

        await gameState.save();
        res.redirect(`/game/${gameState._id}`);
    } catch (error) {
        console.error('开始游戏时出错:', error);
        res.status(500).send('开始游戏时出错');
    }
});

// 游戏页面路由
app.get('/game/:gameId', async (req, res) => {
    try {
        const [gameState, locations] = await Promise.all([
            gameState.findById(req.params.gameId),
            locations.getAllLocations()
        ]);

        if (!gameState) {
            return res.status(404).send('游戏未找到');
        }

        const currentLocation = locations.find(
            loc => loc._id.toString() === gameState.currentLocation.toString()
        );

        if (!currentLocation) {
            return res.status(404).send('当前位置未找到');
        }

        res.render('game', {
            gameState,
            location: currentLocation,
            message: res.locals.message
        });
    } catch (error) {
        console.error('加载游戏页面时出错:', error);
        res.status(500).send('加载游戏页面时出错');
    }
});

// 添加预加载 API 路由
app.get('/api/location-data', async (req, res) => {
    try {
        const choice = req.query.choice;
        const state = gameState.getState();
        const currentLocation = locations.getLocation(state.currentLocation);
        
        if (!currentLocation || !currentLocation.options || !currentLocation.options[choice]) {
            return res.status(404).json({ error: '选项未找到' });
        }

        const nextLocationId = currentLocation.options[choice].nextLocation;
        const nextLocation = locations.getLocation(nextLocationId);

        if (!nextLocation) {
            return res.status(404).json({ error: '下一个位置未找到' });
        }

        // 只返回必要的数据
        res.json({
            location: {
                name: nextLocation.name,
                description: nextLocation.description,
                options: nextLocation.options
            },
            gameState: {
                health: state.health
            }
        });
    } catch (error) {
        console.error('获取位置数据时出错:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

// 修改选择路由以支持 JSON 响应
app.post('/choice', express.json(), async (req, res) => {
    try {
        const choice = req.body.choice;
        const state = gameState.getState();
        
        if (!state.gameStarted) {
            return res.status(400).json({ error: '游戏未开始' });
        }

        if (!choice) {
            return res.status(400).json({ error: '未提供选择' });
        }

        const result = gameState.makeChoice(choice);
        
        if (req.headers.accept?.includes('application/json')) {
            // 如果客户端请求 JSON 响应
            const currentLocation = locations.getLocation(state.currentLocation);
            res.json({
                location: {
                    name: currentLocation.name,
                    description: currentLocation.description,
                    options: currentLocation.options
                },
                gameState: {
                    health: state.health
                }
            });
        } else {
            // 保持向后兼容的重定向响应
            res.redirect('/game');
        }
    } catch (error) {
        console.error('处理选择时出错:', error);
        res.status(500).json({ error: '服务器错误' });
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

// 编辑选项
app.post('/dev/option/edit', checkDevPassword, (req, res) => {
    try {
        const { locationId, optionId, text, result, healthChange, nextLocation } = req.body;
        locations.editOption(locationId, optionId, text, result, healthChange, nextLocation);
        res.redirect('/dev?password=0526&message=选项编辑成功');
    } catch (error) {
        res.redirect(`/dev?password=0526&error=${encodeURIComponent(error.message)}`);
    }
});

// 删除选项
app.post('/dev/option/delete', checkDevPassword, (req, res) => {
    try {
        const { locationId, optionId } = req.body;
        locations.deleteOption(locationId, optionId);
        res.redirect('/dev?password=0526&message=选项删除成功');
    } catch (error) {
        res.redirect(`/dev?password=0526&error=${encodeURIComponent(error.message)}`);
    }
});

// 添加保存路由
app.post('/dev/save', (req, res) => {
    const { password } = req.body;
    if (password !== '0526') {
        return res.status(401).json({ success: false, error: '密码错误' });
    }

    try {
        locations.saveLocations();
        res.json({ success: true });
    } catch (error) {
        console.error('保存失败:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 返回主菜单
app.post('/return-to-menu', (req, res) => {
    res.redirect('/');
});

// 继续游戏
app.get('/continue', (req, res) => {
    const state = gameState.getState();
    if (!state.gameStarted || !state.playerName) {
        return res.redirect('/');
    }
    res.redirect('/game');
});

// 错误处理中间件
app.use((err, req, res, next) => {
    console.error('服务器错误:', err);
    res.status(500).send('服务器发生错误');
});

module.exports = app; 