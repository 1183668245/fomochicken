const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const { Web3 } = require('web3'); // Corrected: Web3 should be capitalized
const cron = require('node-cron');
require('dotenv').config();
const lotteryLogic = require('./lotteryLogic'); // 引入抽奖逻辑模块

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());

// --- 环境变量 --- (从 .env 文件读取)
const BSC_RPC_URL = process.env.RPC_URL;
const TOKEN_ADDRESS = process.env.TOKEN_ADDRESS;
const TARGET_ADDRESS = process.env.TARGET_ADDRESS; // 用户需要转账到的地址 (奖池地址)
const MIN_PARTICIPATION_AMOUNT = parseFloat(process.env.MIN_PARTICIPATION_AMOUNT || '10'); // 最小参与金额，默认为10
const TOKEN_DECIMALS = parseInt(process.env.TOKEN_DECIMALS || '18'); // 代币的小数位数

if (!BSC_RPC_URL || !TOKEN_ADDRESS || !TARGET_ADDRESS) {
    console.error('Missing required environment variables: RPC_URL, TOKEN_ADDRESS, TARGET_ADDRESS');
    process.exit(1);
}

const web3 = new Web3(BSC_RPC_URL);

// --- 代币ABI (仅需Transfer事件) ---
const TOKEN_ABI = [
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "address",
                "name": "from",
                "type": "address"
            },
            {
                "indexed": true,
                "internalType": "address",
                "name": "to",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "value",
                "type": "uint256"
            }
        ],
        "name": "Transfer",
        "type": "event"
    }
];

const tokenContract = new web3.eth.Contract(TOKEN_ABI, TOKEN_ADDRESS);

// --- 数据库初始化与连接 ---
const db = new sqlite3.Database('./lottery.db', (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        initDb();
    }
});

async function initDb() {
    db.serialize(() => {
        // lottery_rounds: 存储每一轮抽奖的信息
        db.run(`CREATE TABLE IF NOT EXISTS lottery_rounds (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            round_number INTEGER NOT NULL UNIQUE,
            start_time TEXT NOT NULL,    -- ISO 8601 format (YYYY-MM-DDTHH:MM:SS.SSSZ)
            end_time TEXT NOT NULL,      -- ISO 8601 format
            base_pool_amount REAL DEFAULT 0, -- 初始奖池金额 (例如, 项目方注入)
            carry_over_amount REAL DEFAULT 0, -- 从上一轮结转的金额
            total_pool_amount REAL DEFAULT 0, -- 当前总奖池 (base + carry_over + new_participations)
            status TEXT NOT NULL CHECK(status IN ('PENDING', 'COMPLETED', 'CANCELLED')) DEFAULT 'PENDING',
            winner_type TEXT,            -- 'GOLDEN_PHOENIX', 'DIAMOND_CHICKEN', 'STRUGGLING_CHICKEN', 'CZ_CHICKEN'
            winner_address TEXT,         -- 中奖者地址 (GP: 单个地址, DC: 逗号分隔的多个地址)
            winning_amount REAL,         -- 中奖金额 (GP: 总奖池, DC: 每人20%)
            cz_chicken_payout_address TEXT, -- CZ鸡的收款地址
            cz_chicken_payout_amount REAL,  -- CZ鸡的支付金额 (即当前轮总奖池)
            next_round_carry_over_amount REAL DEFAULT 0, -- 为下一轮结转的金额
            draw_time TEXT,              -- 实际开奖时间 (ISO 8601 format)
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )`);

        // participations: 存储用户的参与记录
        db.run(`CREATE TABLE IF NOT EXISTS participations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            round_id INTEGER NOT NULL,
            user_address TEXT NOT NULL,
            transaction_hash TEXT UNIQUE, -- 参与的交易哈希，确保唯一性
            amount REAL NOT NULL,         -- 用户参与的金额
            is_valid INTEGER DEFAULT 0,   -- 是否为有效参与 (例如, 金额是否满足最低要求) 0: false, 1: true
            is_winner INTEGER DEFAULT 0,  -- 是否中奖 0: false, 1: true
            participation_time TEXT DEFAULT CURRENT_TIMESTAMP, -- ISO 8601 format
            FOREIGN KEY (round_id) REFERENCES lottery_rounds(id)
        )`);

        // 创建触发器自动更新 updated_at 时间戳
        db.run(`
            CREATE TRIGGER IF NOT EXISTS update_lottery_rounds_updated_at
            AFTER UPDATE ON lottery_rounds
            FOR EACH ROW
            BEGIN
                UPDATE lottery_rounds SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
            END;
        `);
        console.log('Database tables checked/created.');
        ensureFirstRound(); // 确保至少有一个抽奖轮次
    });
}

async function ensureFirstRound() {
    const currentRound = await lotteryLogic.getCurrentRound(db);
    if (!currentRound) {
        console.log('No PENDING round found. Initializing the first round...');
        // 假设第一轮从当前时间的下一个整点开始，持续1小时，基础奖池为100000
        await lotteryLogic.createNewRound(db, 1, 0); 
    } else {
        console.log(`Current PENDING round: ${currentRound.round_number}`);
    }
}

// --- 核心逻辑：监听代币转账 --- (Placeholder - to be implemented)
async function listenToTransfers() {
    try {
        console.log('Checking network connection...');
        const networkId = await web3.eth.net.getId();
        console.log('Connected to network ID:', networkId);
        
        console.log('Verifying token contract...');
        const code = await web3.eth.getCode(TOKEN_ADDRESS);
        if (code === '0x') {
            throw new Error('Token contract not found at the specified address');
        }
        console.log('Token contract verified at', TOKEN_ADDRESS);
        
        console.log(`Listening for Transfer events on token ${TOKEN_ADDRESS} to target ${TARGET_ADDRESS}...`);
        
        // 在数据库中保存最后处理的区块号
        const saveLastProcessedBlock = async (blockNumber) => {
            try {
                await new Promise((resolve, reject) => {
                    db.run(
                        `INSERT OR REPLACE INTO system_state (key, value) VALUES (?, ?)`,
                        ['last_processed_block', blockNumber.toString()],
                        function(err) {
                            if (err) reject(err);
                            else resolve();
                        }
                    );
                });
            } catch (error) {
                console.error('Error saving last processed block:', error);
            }
        };
        
        const getLastProcessedBlock = async () => {
            try {
                return await new Promise((resolve, reject) => {
                    db.get(
                        `SELECT value FROM system_state WHERE key = ?`,
                        ['last_processed_block'],
                        (err, row) => {
                            if (err) reject(err);
                            else resolve(row ? parseInt(row.value) : null);
                        }
                    );
                });
            } catch (error) {
                console.error('Error getting last processed block:', error);
                return null;
            }
        };
        
        // 修改初始化逻辑
        const currentBlock = Number(await web3.eth.getBlockNumber());
        const savedLastBlock = await getLastProcessedBlock();
        let lastProcessedBlock = savedLastBlock || (currentBlock - 200);
        console.log('Starting from block:', lastProcessedBlock, '(current block:', currentBlock, ')');
        
        // 使用轮询方式监听事件
        // 修改现有的轮询间隔和扫描范围
        const pollInterval = 5000; // 改为5秒轮询一次，减少RPC压力
        const maxRetries = 3; // 减少重试次数
        
        setInterval(async () => {
            let retryCount = 0;
            
            while (retryCount < maxRetries) {
                try {
                    const currentBlock = await web3.eth.getBlockNumber();
                    const currentBlockNum = Number(currentBlock);
                    
                    if (currentBlockNum > lastProcessedBlock) {
                        // 增加每次扫描的区块数，因为有深度扫描作为保障
                        const maxBlocksPerScan = 50; // 从10增加到50
                        const blocksToScan = Math.min(currentBlockNum - lastProcessedBlock, maxBlocksPerScan);
                        const toBlock = lastProcessedBlock + blocksToScan;
                        
                        console.log(`Regular scan: blocks ${lastProcessedBlock + 1} to ${toBlock}`);
                        
                        // 获取Transfer事件
                        const events = await tokenContract.getPastEvents('Transfer', {
                            filter: {
                                to: TARGET_ADDRESS
                            },
                            fromBlock: lastProcessedBlock + 1,
                            toBlock: toBlock
                        });
                        
                        console.log(`Regular scan found ${events.length} transfer events`);
                        
                        for (const event of events) {
                            await processTransferEvent(event);
                        }
                        
                        lastProcessedBlock = toBlock;
                        await saveLastProcessedBlock(lastProcessedBlock);
                    }
                    
                    break;
                    
                } catch (error) {
                    retryCount++;
                    console.error(`Error in regular polling (attempt ${retryCount}/${maxRetries}):`, error.message);
                    
                    if (retryCount >= maxRetries) {
                        console.error('Max retries reached for regular polling');
                    } else {
                        const waitTime = 2000 * retryCount; // 线性退避
                        await new Promise(resolve => setTimeout(resolve, waitTime));
                    }
                }
            }
        }, pollInterval);
        
        console.log('Successfully set up Transfer event polling');
        
    } catch (error) {
        console.error('Error setting up Transfer event polling:', error.message);
        console.log('Will retry in 30 seconds...');
        setTimeout(listenToTransfers, 30000);
    }
}

// 在数据库初始化部分添加
db.run(`CREATE TABLE IF NOT EXISTS system_state (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

// 处理Transfer事件的函数
async function processTransferEvent(event) {
    try {
        const { from, to, value } = event.returnValues;
        const txHash = event.transactionHash;
        const blockNumber = Number(event.blockNumber);
        
        console.log(`Transfer detected: ${from} -> ${to}, Amount: ${value}, TxHash: ${txHash}`);
        
        // 检查当前轮次状态 - 修复函数调用
        const currentRound = await lotteryLogic.getCurrentRound(db);
        if (!currentRound || currentRound.status !== 'PENDING') {
            console.log('No active round, ignoring transfer');
            return;
        }
        
        // 检查轮次是否已结束
        const now = Date.now();
        const roundEndTime = new Date(currentRound.end_time).getTime();
        if (now > roundEndTime) {
            console.log('Round has ended, ignoring transfer');
            return;
        }
        
        // 验证参与金额 - 处理BigInt
        const participationAmount = web3.utils.fromWei(value.toString(), 'ether'); // 转换为字符串
        const minAmount = parseFloat(process.env.MIN_PARTICIPATION_AMOUNT || '0.01');
        
        if (parseFloat(participationAmount) < minAmount) {
            console.log(`Participation amount ${participationAmount} below minimum ${minAmount}`);
            return;
        }
        
        // 检查是否已存在该交易
        const existingTx = await new Promise((resolve, reject) => {
            db.get(
                'SELECT id FROM participations WHERE transaction_hash = ?',
                [txHash],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });
        
        if (existingTx) {
            console.log('Transaction already processed:', txHash);
            return;
        }
        
        // 插入参与记录
        // 插入参与记录
        await new Promise((resolve, reject) => {
            db.run(
                `INSERT INTO participations (round_id, user_address, amount, transaction_hash, participation_time, is_valid)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [currentRound.id, from, participationAmount, txHash, new Date().toISOString(), 1],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });
        
        // 更新总奖池金额 - 修复字段名和表名
        const newTotalPool = parseFloat(currentRound.total_pool_amount) + parseFloat(participationAmount);
        await new Promise((resolve, reject) => {
            db.run(
                'UPDATE lottery_rounds SET total_pool_amount = ? WHERE id = ?',
                [newTotalPool, currentRound.id],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
        
        console.log(`Participation recorded: ${from} contributed ${participationAmount} tokens`);
        console.log(`New total pool: ${newTotalPool}`);
        
    } catch (error) {
        console.error('Error processing transfer event:', error);
    }
}



// --- API 端点 ---
app.get('/current-round', async (req, res) => {
    try {
        const round = await lotteryLogic.getCurrentRound(db);
        if (round) {
            res.json(round);
        } else {
            res.status(404).json({ message: 'No current PENDING round found.' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error fetching current round', error: error.message });
    }
});

app.get('/last-completed-round', async (req, res) => {
    try {
        const round = await lotteryLogic.getLastCompletedRound(db);
        if (round) {
            res.json(round);
        } else {
            res.status(404).json({ message: 'No completed rounds found.' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error fetching last completed round', error: error.message });
    }
});

app.get('/participations/:roundId', (req, res) => {
    const { roundId } = req.params;
    
    // 添加缓存控制头
    res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
    });
    
    db.all("SELECT user_address, amount, participation_time, is_winner FROM participations WHERE round_id = ? AND is_valid = 1 ORDER BY participation_time DESC", [roundId], (err, rows) => {
        if (err) {
            res.status(500).json({ message: 'Error fetching participations', error: err.message });
        } else {
            res.json(rows);
        }
    });
});

app.get('/my-participations/:userAddress', (req, res) => {
    const { userAddress } = req.params;
    // 注意：userAddress 可能需要进行大小写不敏感比较，取决于BSC地址的存储方式
    // 这里我们直接比较，如果需要不敏感，可以使用 LOWER() 函数
    db.all(`SELECT p.amount, p.participation_time, p.is_winner, r.round_number, r.status as round_status, r.winner_type 
            FROM participations p 
            JOIN lottery_rounds r ON p.round_id = r.id 
            WHERE LOWER(p.user_address) = LOWER(?) AND p.is_valid = 1
            ORDER BY p.participation_time DESC`, 
            [userAddress.toLowerCase()], (err, rows) => {
        if (err) {
            res.status(500).json({ message: 'Error fetching user participations', error: err.message });
        } else {
            res.json(rows);
        }
    });
});

// 获取已完成的抽奖轮次（用于往期中奖记录）
app.get('/completed-rounds', (req, res) => {
    const limit = parseInt(req.query.limit) || 10;
    
    db.all(`SELECT round_number as round_id, winner_type, winner_address, cz_chicken_payout_address, 
                   winning_amount as total_pool_amount, cz_chicken_payout_amount, draw_time 
            FROM lottery_rounds 
            WHERE status = 'COMPLETED' 
            ORDER BY round_number DESC 
            LIMIT ?`, 
            [limit], (err, rows) => {
        if (err) {
            res.status(500).json({ message: 'Error fetching completed rounds', error: err.message });
        } else {
            res.json({ rounds: rows });
        }
    });
});

// 添加定时任务检查是否需要开奖
cron.schedule('*/1 * * * *', async () => { // 每分钟检查一次
    try {
        console.log('Checking if lottery draw is needed...');
        
        const currentRound = await lotteryLogic.getCurrentRound(db);
        if (!currentRound || currentRound.status !== 'PENDING') {
            return;
        }
        
        const now = new Date();
        const roundEndTime = new Date(currentRound.end_time);
        
        // 如果当前时间超过了轮次结束时间，进行开奖
        if (now >= roundEndTime) {
            console.log(`Round ${currentRound.round_number} has ended, conducting lottery...`);
            await lotteryLogic.conductLottery(db);
            
            // 开奖完成后，创建下一轮
            const completedRound = await lotteryLogic.getRoundById(db, currentRound.id);
            if (completedRound && completedRound.status === 'COMPLETED') {
                console.log('Creating next round...');
                await lotteryLogic.initializeNextRound(db, completedRound);
            }
        }
    } catch (error) {
        console.error('Error in lottery check cron job:', error);
    }
});

// 添加完整性检查：每30秒检查最近100个区块
setInterval(async () => {
    try {
        console.log('Running integrity check...');
        const currentBlock = await web3.eth.getBlockNumber();
        const currentBlockNum = Number(currentBlock);
        const checkFromBlock = Math.max(currentBlockNum - 100, 0);
        
        // 获取最近100个区块的所有转账事件
        const events = await tokenContract.getPastEvents('Transfer', {
            filter: {
                to: TARGET_ADDRESS
            },
            fromBlock: checkFromBlock,
            toBlock: currentBlockNum
        });
        
        console.log(`Integrity check: Found ${events.length} events in blocks ${checkFromBlock}-${currentBlockNum}`);
        
        // 检查是否有遗漏的交易
        for (const event of events) {
            const txHash = event.transactionHash;
            
            // 检查数据库中是否已存在该交易
            const existingTx = await new Promise((resolve, reject) => {
                db.get(
                    'SELECT id FROM participations WHERE transaction_hash = ?',
                    [txHash],
                    (err, row) => {
                        if (err) reject(err);
                        else resolve(row);
                    }
                );
            });
            
            if (!existingTx) {
                console.log(`Found missed transaction: ${txHash}, processing now...`);
                await processTransferEvent(event);
            }
        }
        
    } catch (error) {
        console.error('Error during integrity check:', error.message);
    }
}, 30000); // 每30秒执行一次完整性检查

async function setupEventListening() {
    try {
        console.log('Setting up Transfer event polling...');
        
        // 验证连接
        const networkId = await web3.eth.net.getId();
        console.log('Connected to network ID:', networkId);
        
        // 移除代币合约验证
        // const tokenName = await tokenContract.methods.name().call();
        // console.log('Token contract verified:', tokenName);
        console.log('Token contract address:', TOKEN_ADDRESS);
        
        // 验证目标地址
        console.log('Target address:', TARGET_ADDRESS);
        
        // 获取当前区块信息
        const currentBlock = await web3.eth.getBlockNumber();
        console.log('Current block:', currentBlock);
        
        // 其余监听逻辑...
        
    } catch (error) {
        console.error('Error setting up Transfer event polling:', error.message);
        console.log('Will retry in 10 seconds...');
        setTimeout(setupEventListening, 10000);
    }
}

// 启动事件监听
setupEventListening();

console.log('Lottery cron job scheduled - checking every minute for draws');

app.listen(PORT, () => {
    console.log(`Lottery backend server running on port ${PORT}`);
    listenToTransfers(); // 启动时开始监听转账事件
});

// 优雅关闭数据库连接
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            return console.error(err.message);
        }
        console.log('Closed the database connection.');
        process.exit(0);
    });
});


// 在现有的轮询逻辑后添加深度扫描

// 每5分钟进行深度扫描，扫描最近500个区块
cron.schedule('*/5 * * * *', async () => {
    console.log('Starting deep scan for the last 500 blocks...');
    
    try {
        const currentBlock = Number(await web3.eth.getBlockNumber());
        const fromBlock = Math.max(currentBlock - 500, 0); // 确保不会扫描负数区块
        const toBlock = currentBlock;
        
        console.log(`Deep scanning blocks ${fromBlock} to ${toBlock}`);
        
        // 分批扫描，每次50个区块，避免RPC限制
        const batchSize = 50;
        let processedEvents = 0;
        
        for (let start = fromBlock; start <= toBlock; start += batchSize) {
            const end = Math.min(start + batchSize - 1, toBlock);
            
            try {
                const events = await tokenContract.getPastEvents('Transfer', {
                    filter: {
                        to: TARGET_ADDRESS
                    },
                    fromBlock: start,
                    toBlock: end
                });
                
                console.log(`Deep scan batch ${start}-${end}: found ${events.length} events`);
                
                for (const event of events) {
                    // 检查是否已经处理过这个交易
                    const txHash = event.transactionHash;
                    const existingTx = await new Promise((resolve, reject) => {
                        db.get(
                            'SELECT id FROM participations WHERE transaction_hash = ?',
                            [txHash],
                            (err, row) => {
                                if (err) reject(err);
                                else resolve(row);
                            }
                        );
                    });
                    
                    if (!existingTx) {
                        console.log(`Processing missed transaction: ${txHash}`);
                        await processTransferEvent(event);
                        processedEvents++;
                    }
                }
                
                // 批次间短暂延迟，避免RPC压力
                await new Promise(resolve => setTimeout(resolve, 100));
                
            } catch (batchError) {
                console.error(`Error in deep scan batch ${start}-${end}:`, batchError.message);
                // 继续处理下一批，不中断整个扫描
            }
        }
        
        console.log(`Deep scan completed. Processed ${processedEvents} missed transactions.`);
        
    } catch (error) {
        console.error('Error in deep scan cron job:', error.message);
    }
});
app.use(cors({
    origin: [
        'http://localhost:3000',
        'https://fomochicken.xyz',
        'https://www.fomochicken.xyz',
        'https://1183668245.github.io'
    ],
    credentials: true
}));