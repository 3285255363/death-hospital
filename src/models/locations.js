const fs = require('fs');
const path = require('path');

const SAVE_FILE = path.join(__dirname, '../data/locations.json');
const BACKUP_FILE = path.join(__dirname, '../data/locations.backup.json');
let saveTimeout = null;
const SAVE_DELAY = 1000; // 1秒延迟

let locations = {
    "start": {
        name: "医院大厅",
        description: "你站在一家破旧的医院大厅里。空气中弥漫着消毒水的气味，但似乎还混杂着一些说不清道不明的味道。大厅的灯光忽明忽暗，墙上挂着一些已经褪色的医疗海报。",
        options: {
            "look_reception": {
                text: "查看前台",
                result: "你走向前台，发现桌上散落着一些病历本。",
                healthChange: 0,
                nextLocation: "reception"
            },
            "look_elevator": {
                text: "查看电梯",
                result: "你走向电梯，发现电梯似乎还能使用。",
                healthChange: 0,
                nextLocation: "elevator"
            }
        }
    },
    "reception": {
        name: "前台",
        description: "前台桌上散落着一些病历本，上面记录着一些病人的信息。你注意到有些病人的名字被涂改过，有些记录则完全被撕掉了。",
        options: {
            "check_records": {
                text: "查看病历本",
                result: "你翻开病历本，发现一些令人不安的记录。",
                healthChange: -1,
                nextLocation: "reception"
            },
            "back_to_hall": {
                text: "返回大厅",
                result: "你决定返回大厅。",
                healthChange: 0,
                nextLocation: "start"
            }
        }
    },
    "elevator": {
        name: "电梯",
        description: "电梯看起来有些老旧，但似乎还能使用。按钮上的数字有些模糊，但依稀可以辨认。",
        options: {
            "second_floor": {
                text: "按2楼",
                result: "电梯开始上升，发出吱呀吱呀的声音。",
                healthChange: 0,
                nextLocation: "second_floor"
            },
            "third_floor": {
                text: "按3楼",
                result: "电梯开始上升，发出吱呀吱呀的声音。",
                healthChange: 0,
                nextLocation: "third_floor"
            },
            "back_to_hall": {
                text: "返回大厅",
                result: "你决定返回大厅。",
                healthChange: 0,
                nextLocation: "start"
            }
        }
    },
    "second_floor": {
        name: "二楼走廊",
        description: "二楼的走廊比大厅更加昏暗。墙上挂着一些病人的照片，但他们的表情都显得异常痛苦。",
        options: {
            "check_room": {
                text: "查看病房",
                result: "你推开一间病房的门，发现里面空无一人，但床单上似乎还有余温。",
                healthChange: -1,
                nextLocation: "second_floor"
            },
            "back_to_elevator": {
                text: "返回电梯",
                result: "你决定返回电梯。",
                healthChange: 0,
                nextLocation: "elevator"
            }
        }
    },
    "third_floor": {
        name: "三楼走廊",
        description: "三楼的走廊比二楼更加阴森。墙上挂着一些医生的照片，但他们的表情都显得异常诡异。",
        options: {
            "check_surgery": {
                text: "查看手术室",
                result: "你推开手术室的门，发现里面有一些奇怪的器械。",
                healthChange: -2,
                nextLocation: "third_floor"
            },
            "back_to_elevator": {
                text: "返回电梯",
                result: "你决定返回电梯。",
                healthChange: 0,
                nextLocation: "elevator"
            }
        }
    }
};

function saveLocations() {
    // 清除之前的定时器
    if (saveTimeout) {
        clearTimeout(saveTimeout);
    }

    // 设置新的定时器
    saveTimeout = setTimeout(() => {
        const filePath = SAVE_FILE;
        const backupPath = BACKUP_FILE;
        
        try {
            // 如果文件已存在，先创建备份
            if (fs.existsSync(filePath)) {
                fs.copyFileSync(filePath, backupPath);
            }
            
            // 保存新数据
            fs.writeFileSync(filePath, JSON.stringify(locations, null, 2));
            console.log('场景数据已保存');
        } catch (error) {
            console.error('保存场景数据错误:', error);
            // 如果保存失败且备份存在，恢复备份
            if (fs.existsSync(backupPath)) {
                fs.copyFileSync(backupPath, filePath);
            }
            throw new Error('保存场景数据失败');
        }
    }, SAVE_DELAY);
}

// 加载场景数据
function loadLocations() {
    const filePath = SAVE_FILE;
    const backupPath = BACKUP_FILE;
    
    try {
        if (fs.existsSync(filePath)) {
            const data = fs.readFileSync(filePath, 'utf8');
            const loadedLocations = JSON.parse(data);
            
            // 验证加载的数据
            if (typeof loadedLocations === 'object' && loadedLocations !== null) {
                locations = loadedLocations;
                // 创建新的备份
                fs.writeFileSync(backupPath, JSON.stringify(locations, null, 2));
            } else {
                throw new Error('无效的场景数据格式');
            }
        }
    } catch (error) {
        console.error('加载场景数据错误:', error);
        // 尝试从备份恢复
        if (fs.existsSync(backupPath)) {
            try {
                const backupData = fs.readFileSync(backupPath, 'utf8');
                locations = JSON.parse(backupData);
                // 恢复成功后，保存到主文件
                fs.writeFileSync(filePath, JSON.stringify(locations, null, 2));
            } catch (backupError) {
                console.error('从备份恢复失败:', backupError);
            }
        }
    }
}

// 添加新场景
function addLocation(id, name, description) {
    if (locations[id]) {
        throw new Error('场景ID已存在');
    }
    locations[id] = {
        name,
        description,
        options: {}  // 初始化为空对象
    };
    saveLocations();
    return locations[id];
}

// 编辑场景
function editLocation(id, name, description) {
    if (!locations[id]) {
        throw new Error('场景不存在');
    }
    locations[id].name = name;
    locations[id].description = description;
    if (!locations[id].options) {
        locations[id].options = {};  // 如果不存在则初始化
    }
    saveLocations();
    return locations[id];
}

// 获取所有场景
function getAllLocations() {
    // 确保每个场景都有options属性
    Object.keys(locations).forEach(id => {
        if (!locations[id].options) {
            locations[id].options = {};
        }
    });
    return locations;
}

// 添加选项
function addOption(locationId, optionId, text, result, healthChange, nextLocation) {
    if (!locations[locationId]) {
        throw new Error('场景不存在');
    }
    if (!locations[locationId].options) {
        locations[locationId].options = {};  // 如果不存在则初始化
    }
    locations[locationId].options[optionId] = {
        text,
        result,
        healthChange: parseInt(healthChange) || 0,
        nextLocation
    };
    saveLocations();
    return locations[locationId].options[optionId];
}

// 编辑选项
function editOption(locationId, optionId, text, result, healthChange, nextLocation) {
    if (!locations[locationId] || !locations[locationId].options || !locations[locationId].options[optionId]) {
        throw new Error('选项不存在');
    }
    locations[locationId].options[optionId] = {
        text,
        result,
        healthChange: parseInt(healthChange) || 0,
        nextLocation
    };
    saveLocations();
    return locations[locationId].options[optionId];
}

// 删除选项
function deleteOption(locationId, optionId) {
    if (!locations[locationId] || !locations[locationId].options || !locations[locationId].options[optionId]) {
        throw new Error('选项不存在');
    }
    delete locations[locationId].options[optionId];
    saveLocations();
}

// 删除场景
function deleteLocation(id) {
    if (!locations[id]) {
        throw new Error('场景不存在');
    }
    // 检查是否有其他场景的选项指向这个场景
    for (const locationId in locations) {
        const location = locations[locationId];
        if (location.options) {  // 添加检查
            for (const optionId in location.options) {
                if (location.options[optionId].nextLocation === id) {
                    throw new Error('该场景正在被其他场景引用，无法删除');
                }
            }
        }
    }
    delete locations[id];
    saveLocations();
}

// 初始化时加载场景数据
loadLocations();

// 获取场景
function getLocation(id) {
    return locations[id];
}

module.exports = {
    getLocation: (id) => locations[id],
    getAllLocations,
    addLocation,
    editLocation,
    deleteLocation,
    addOption,
    editOption,
    deleteOption,
    saveLocations,
    loadLocations
}; 