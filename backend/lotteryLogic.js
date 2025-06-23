require('dotenv').config(); // 用于读取 .env 文件中的环境变量

// --- 核心抽奖逻辑 --- 
async function conductLottery(db) {
    console.log('Conducting lottery (from lotteryLogic.js)...');

    const currentRound = await getCurrentRound(db);
    if (!currentRound || currentRound.status !== 'PENDING') {
        console.log('No PENDING round found or round not in PENDING state.');
        return;
    }

    const czWalletAddress = process.env.CZ_WALLET_ADDRESS;
    if (!czWalletAddress) {
        console.error('CZ_WALLET_ADDRESS is not set in .env file.');
        //可以选择在此处停止，或者根据业务逻辑决定是否继续（例如，如果CZ鸡不是关键路径）
        //为了演示，我们继续，但CZ鸡奖项将无法正确记录地址
    }

    const participants = await getParticipantsForRound(db, currentRound.id);
    const basePoolAmount = 100000; // 固定基础奖池
    const userParticipationAmount = currentRound.total_pool_amount - basePoolAmount; // 用户参与产生的奖池
    const totalPoolAmount = currentRound.total_pool_amount;

    let winnerType = '';
    let winnerAddresses = null; // 用于存储单个或多个中奖地址（逗号分隔）
    let winningAmount = null; // 单个中奖者的奖金（GP），或每位中奖者的奖金（DC）
    let czChickenPayoutAddress = null;
    let czChickenPayoutAmount = null;
    let nextRoundCarryOverAmount = 0;

    const prizeRandom = Math.random();

    if (prizeRandom < 0.20) { // 20% Golden Phoenix
        winnerType = 'GOLDEN_PHOENIX';
        if (participants.length > 0) {
            const winnerIndex = Math.floor(Math.random() * participants.length);
            const winner = participants[winnerIndex];
            winnerAddresses = winner.user_address;
            winningAmount = totalPoolAmount;
            await markParticipantAsWinner(db, winner.id);
            nextRoundCarryOverAmount = 0; // GP获胜时不结转
            console.log(`Golden Phoenix winner: ${winnerAddresses}, wins: ${winningAmount}`);
        } else {
            console.log('Golden Phoenix: No participants, carrying over user participation amount only.');
            winnerType = 'STRUGGLING_CHICKEN';
            nextRoundCarryOverAmount = userParticipationAmount; // 只结转用户参与部分
        }
    } else if (prizeRandom < 0.70) { // 50% Diamond Chicken
        winnerType = 'DIAMOND_CHICKEN';
        if (participants.length > 0) {
            const numberOfWinners = Math.min(5, participants.length);
            const individualPrize = totalPoolAmount / numberOfWinners; // 平摊本轮奖池
            winningAmount = individualPrize;
            let awardedAmount = 0;
            
            const shuffledParticipants = [...participants].sort(() => 0.5 - Math.random());
            const actualWinners = [];

            for (let i = 0; i < numberOfWinners; i++) {
                const winner = shuffledParticipants[i];
                actualWinners.push(winner.user_address);
                await markParticipantAsWinner(db, winner.id);
                awardedAmount += individualPrize;
            }
            winnerAddresses = actualWinners.join(',');
            
            // 钻石鸡平摊全部奖池，无结转
            nextRoundCarryOverAmount = 0;
            
            console.log(`Diamond Chicken winners: ${winnerAddresses}, each wins: ${individualPrize}. Total awarded: ${awardedAmount}. No carry over.`);
        } else {
            console.log('Diamond Chicken: No participants, carrying over user participation amount only.');
            nextRoundCarryOverAmount = userParticipationAmount; // 只结转用户参与部分
        }
    } else if (prizeRandom < 0.95) { // 25% Struggling Chicken
        winnerType = 'STRUGGLING_CHICKEN';
        nextRoundCarryOverAmount = userParticipationAmount; // 只结转用户参与部分，基础奖池不结转
        console.log('Struggling Chicken: No winners, carrying over user participation amount only.');
    } else { // 5% CZ Chicken
        winnerType = 'CZ_CHICKEN';
        czChickenPayoutAddress = czWalletAddress;
        czChickenPayoutAmount = totalPoolAmount;
        nextRoundCarryOverAmount = 0; // CZ鸡获胜时不结转
        console.log(`CZ Chicken: Entire pool ${totalPoolAmount} to be sent to ${czChickenPayoutAddress || 'CZ_WALLET_ADDRESS_NOT_SET'}`);
    }

    const drawTime = new Date().toISOString();

    await new Promise((resolve, reject) => {
        db.run(`UPDATE lottery_rounds 
                SET status = 'COMPLETED', 
                    winner_type = ?, 
                    winner_address = ?, 
                    winning_amount = ?, 
                    cz_chicken_payout_address = ?, 
                    cz_chicken_payout_amount = ?, 
                    next_round_carry_over_amount = ?, 
                    draw_time = ?
                WHERE id = ?`,
            [winnerType, winnerAddresses, winningAmount, czChickenPayoutAddress, czChickenPayoutAmount, nextRoundCarryOverAmount, drawTime, currentRound.id],
            function(err) {
                if (err) {
                    console.error('Error updating round to COMPLETED:', err.message);
                    reject(err);
                } else {
                    console.log(`Round ${currentRound.round_number} marked as COMPLETED. Winner Type: ${winnerType}.`);
                    resolve();
                }
            }
        );
    });

    const completedRound = await getRoundById(db, currentRound.id);
    if (completedRound) {
        await initializeNextRound(db, completedRound);
    }
}

async function createNewRound(db, roundNumber, carryOverAmount) {
    // 获取北京时间（UTC+8）
    const now = new Date();
    const beijingTime = new Date(now.getTime() + (8 * 60 * 60 * 1000)); // 转换为北京时间
    
    // 计算当前或下一个北京时间60分钟间隔点（整点开始）
    let nextIntervalBeijing;
    const minutes = beijingTime.getMinutes();
    const seconds = beijingTime.getSeconds();
    
    if (minutes === 0 && seconds === 0) {
        // 如果正好是整点，使用当前时间
        nextIntervalBeijing = new Date(beijingTime.getFullYear(), beijingTime.getMonth(), beijingTime.getDate(), beijingTime.getHours(), 0, 0, 0);
    } else {
        // 否则使用下一个整点
        const nextHour = beijingTime.getHours() + 1;
        nextIntervalBeijing = new Date(beijingTime.getFullYear(), beijingTime.getMonth(), beijingTime.getDate(), nextHour, 0, 0, 0);
    }
    
    // 转换回UTC时间用于存储
    const startTime = new Date(nextIntervalBeijing.getTime() - (8 * 60 * 60 * 1000));
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 60分钟后结束
    
    const basePoolAmount = 100000; // 固定基础奖池，不结转
    const totalPoolAmount = basePoolAmount + Number(carryOverAmount); // 基础奖池 + 结转奖池

    return new Promise((resolve, reject) => {
        db.run(`INSERT INTO lottery_rounds (round_number, start_time, end_time, base_pool_amount, carry_over_amount, total_pool_amount, status)
                VALUES (?, ?, ?, ?, ?, ?, ?)`, 
                [roundNumber, startTime.toISOString(), endTime.toISOString(), basePoolAmount, carryOverAmount, totalPoolAmount, 'PENDING'], 
                function(err) {
            if (err) {
                console.error('Error creating new round:', err.message);
                reject(err);
            } else {
                console.log(`Successfully created round ${roundNumber}, starting at ${startTime.toISOString()}, ending at ${endTime.toISOString()}`);
                console.log(`Beijing time: starts at ${nextIntervalBeijing.toLocaleString('zh-CN', {timeZone: 'Asia/Shanghai'})}, ends at ${new Date(nextIntervalBeijing.getTime() + 30 * 60 * 1000).toLocaleString('zh-CN', {timeZone: 'Asia/Shanghai'})}`);
                resolve(this.lastID);
            }
        });
    });
}

async function initializeNextRound(db, previousRound) {
    const nextRoundNumber = previousRound.round_number + 1;
    const carryOver = previousRound.next_round_carry_over_amount || 0;
    await createNewRound(db, nextRoundNumber, carryOver);
}

// --- 辅助数据库函数 --- 
function getCurrentRound(db) {
    return new Promise((resolve, reject) => {
        db.get("SELECT * FROM lottery_rounds WHERE status = 'PENDING' ORDER BY start_time DESC LIMIT 1", (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

function getLastCompletedRound(db) {
    return new Promise((resolve, reject) => {
        db.get("SELECT * FROM lottery_rounds WHERE status = 'COMPLETED' ORDER BY round_number DESC LIMIT 1", (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

function getRoundById(db, roundId) {
    return new Promise((resolve, reject) => {
        db.get("SELECT * FROM lottery_rounds WHERE id = ?", [roundId], (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

// 新增辅助函数：获取特定轮次的参与者
function getParticipantsForRound(db, roundId) {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM participations WHERE round_id = ? AND is_valid = 1", [roundId], (err, rows) => {
            if (err) {
                console.error('Error fetching participants for round:', err.message);
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

// 新增辅助函数：标记参与者为中奖者
function markParticipantAsWinner(db, participationId) {
    return new Promise((resolve, reject) => {
        db.run("UPDATE participations SET is_winner = 1 WHERE id = ?", [participationId], function(err) {
            if (err) {
                console.error(`Error marking participant ${participationId} as winner:`, err.message);
                reject(err);
            } else {
                resolve();
            }
        });
    });
}

module.exports = {
    conductLottery,
    createNewRound,
    initializeNextRound,
    getCurrentRound,
    getLastCompletedRound,
    getRoundById,
    getParticipantsForRound // 确保导出新增的函数，如果需要在外部使用
};