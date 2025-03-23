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
    res.render('index', { 
        message: null,
        error: null
    });
});

// 开始新游戏
app.post('/start', (req, res) => {
    res.redirect('/game');
});

// 游戏页面路由
app.get('/game', (req, res) => {
    res.render('game', {
        message: res.locals.message
    });
});

// 处理选择
app.post('/choice', express.json(), (req, res) => {
    try {
        const choice = req.body.choice;
        if (!choice) {
            return res.status(400).json({ error: '未提供选择' });
        }

        // 这里添加选择处理逻辑
        res.json({
            success: true,
            message: '选择已处理'
        });
    } catch (error) {
        console.error('处理选择时出错:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

// 重置游戏
app.post('/reset', (req, res) => {
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