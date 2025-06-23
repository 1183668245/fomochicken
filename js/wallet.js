// GrooveMe代币配置信息
const tokenInfo = {
    contractAddress: '0x26eb73b57be4bc920a2f7983bcc75923c6b04444',
    decimals: 18,
    symbol: 'GrooveMe',
    abi: [{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":true,"internalType":"address","name":"spender","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"Approval","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"previousOwner","type":"address"},{"indexed":true,"internalType":"address","name":"newOwner","type":"address"}],"name":"OwnershipTransferred","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"Transfer","type":"event"},{"inputs":[],"name":"MODE_NORMAL","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"MODE_TRANSFER_CONTROLLED","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"MODE_TRANSFER_RESTRICTED","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"_mode","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"address","name":"spender","type":"address"}],"name":"allowance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"approve","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"decimals","outputs":[{"internalType":"uint8","name":"","type":"uint8"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"subtractedValue","type":"uint256"}],"name":"decreaseAllowance","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"addedValue","type":"uint256"}],"name":"increaseAllowance","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"string","name":"name","type":"string"},{"internalType":"string","name":"symbol","type":"string"},{"internalType":"uint256","name":"totalSupply","type":"uint256"}],"name":"init","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"name","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"renounceOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"v","type":"uint256"}],"name":"setMode","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"symbol","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"totalSupply","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"transfer","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"from","type":"address"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"transferFrom","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"}]
};

const bscConfig = {
    chainId: '0x38',
    rpcUrls: [
        'https://bsc-dataseed1.binance.org/',
        'https://bsc-dataseed2.binance.org/',
        'https://bsc-dataseed3.binance.org/',
        'https://bsc-dataseed4.binance.org/'
    ],
    blockExplorer: 'https://bscscan.com'
};

const recipientAddress = '0x0e0c0fe2aa4e7169ce60f394ff92abbe0be88093';

// 全局变量声明
let walletManager = null;
let updateInterval = null;
let countdownInterval = null;

// 动态获取API地址
function getApiBaseUrl() {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:3000';
    }
    // 使用自定义后端域名
    return 'https://api.fomochicken.xyz';
}

const API_BASE_URL = getApiBaseUrl();

// 钱包管理器类
class WalletManager {
    constructor() {
        this.web3 = null;
        this.account = null;
        this.tokenContract = null;
        this.isConnected = false;
        this.init();
    }

    async init() {
        // 无论是否检测到钱包，都要设置事件监听器
        this.setupEventListeners();
        
        if (typeof window.ethereum !== 'undefined') {
            // 尝试使用多个RPC节点
            this.web3 = new Web3(window.ethereum);
            
            // 设置备用RPC提供者
            this.backupProviders = bscConfig.rpcUrls.map(url => new Web3.providers.HttpProvider(url));
            
            // 移除自动检查连接，避免页面刷新时弹窗
            // await this.checkConnection();
        } else {
            console.log('MetaMask not detected');
        }
    }

    checkWalletInstallation() {
        if (typeof window.ethereum === 'undefined') {
            const installMessage = `
检测到您尚未安装MetaMask钱包扩展程序。

请按照以下步骤安装：
1. 访问 https://metamask.io/download/
2. 选择您的浏览器版本
3. 安装扩展程序
4. 创建或导入钱包
5. 刷新此页面并重新连接

安装完成后，请刷新页面重试。
        `;
            alert(installMessage);
            return false;
        }
        return true;
    }

    async checkConnection() {
        try {
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
            if (accounts.length > 0) {
                this.account = accounts[0];
                this.isConnected = true;
                this.updateWalletUI();
                await this.initTokenContract();
                await this.updateBalance();
            }
        } catch (error) {
            console.error('Error checking connection:', error);
        }
    }

    async connectWallet() {
        try {
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            this.account = accounts[0];
            this.isConnected = true;
            
            await this.switchToBSC();
            await this.initTokenContract();
            this.updateWalletUI();
            await this.updateBalance();
            
            // 连接成功后立即加载任务状态
            loadTaskStatus();
            
            return true;
        } catch (error) {
            console.error('Error connecting wallet:', error);
            alert('Failed to connect wallet: ' + error.message);
            return false;
        }
    }

    async switchToBSC() {
        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: bscConfig.chainId }],
            });
        } catch (switchError) {
            if (switchError.code === 4902) {
                try {
                    await window.ethereum.request({
                        method: 'wallet_addEthereumChain',
                        params: [{
                            chainId: bscConfig.chainId,
                            chainName: 'BNB Smart Chain',
                            nativeCurrency: {
                                name: 'BNB',
                                symbol: 'BNB',
                                decimals: 18,
                            },
                            rpcUrls: bscConfig.rpcUrls,
                            blockExplorerUrls: [bscConfig.blockExplorer],
                        }],
                    });
                } catch (addError) {
                    console.error('Error adding BSC network:', addError);
                }
            }
        }
    }

    async initTokenContract() {
        if (this.web3) {
            this.tokenContract = new this.web3.eth.Contract(tokenInfo.abi, tokenInfo.contractAddress);
            
            // 设置合约调用的默认选项
            this.tokenContract.defaultBlock = 'latest';
            this.tokenContract.transactionBlockTimeout = 50;
            this.tokenContract.transactionConfirmationBlocks = 1;
            this.tokenContract.transactionPollingTimeout = 480;
        }
    }

    async getTokenBalance() {
        try {
            if (!this.tokenContract || !this.account) {
                console.log('Token contract or account not initialized');
                return '0';
            }

            console.log('Getting token balance for account:', this.account);
            
            // 尝试多种调用方式
            const callMethods = [
                // 方法1：标准调用
                () => this.tokenContract.methods.balanceOf(this.account).call(),
                
                // 方法2：指定from地址
                () => this.tokenContract.methods.balanceOf(this.account).call({
                    from: this.account
                }),
                
                // 方法3：使用最新区块
                () => this.tokenContract.methods.balanceOf(this.account).call('latest'),
                
                // 方法4：直接使用web3.eth.call
                async () => {
                    const data = this.tokenContract.methods.balanceOf(this.account).encodeABI();
                    const result = await this.web3.eth.call({
                        to: tokenInfo.contractAddress,
                        data: data
                    });
                    return this.web3.utils.hexToNumberString(result);
                }
            ];
            
            let lastError;
            
            // 尝试每种方法
            for (let i = 0; i < callMethods.length; i++) {
                try {
                    console.log(`Trying method ${i + 1}...`);
                    const balance = await callMethods[i]();
                    
                    console.log('Raw balance from contract:', balance);
                    
                    if (balance !== null && balance !== undefined && balance !== '0x') {
                        const balanceInEther = this.web3.utils.fromWei(balance.toString(), 'ether');
                        console.log('Balance in ether:', balanceInEther);
                        console.log('Retrieved balance:', balanceInEther);
                        return balanceInEther;
                    }
                } catch (error) {
                    console.log(`Method ${i + 1} failed:`, error.message);
                    lastError = error;
                    
                    // 在方法之间添加短暂延迟
                    if (i < callMethods.length - 1) {
                        await new Promise(resolve => setTimeout(resolve, 200));
                    }
                }
            }
            
            throw lastError || new Error('All balance retrieval methods failed');
            
        } catch (error) {
            console.error('Error getting token balance after all retries:', error.message);
            
            // 提供用户友好的错误信息
            if (error.message.includes('network') || error.message.includes('timeout')) {
                console.log('网络连接问题，请检查网络或稍后重试');
            } else if (error.message.includes('revert')) {
                console.log('合约调用被拒绝，请检查合约地址是否正确');
            }
            
            return '0';
        }
    }

    async checkTokenMode() {
        if (!this.tokenContract) return null;
        
        try {
            const mode = await this.tokenContract.methods._mode().call();
            const MODE_NORMAL = await this.tokenContract.methods.MODE_NORMAL().call();
            const MODE_TRANSFER_CONTROLLED = await this.tokenContract.methods.MODE_TRANSFER_CONTROLLED().call();
            const MODE_TRANSFER_RESTRICTED = await this.tokenContract.methods.MODE_TRANSFER_RESTRICTED().call();
            
            if (mode === MODE_NORMAL) {
                return 'NORMAL';
            } else if (mode === MODE_TRANSFER_CONTROLLED) {
                return 'CONTROLLED';
            } else if (mode === MODE_TRANSFER_RESTRICTED) {
                return 'RESTRICTED';
            }
            return 'UNKNOWN';
        } catch (error) {
            console.error('Error checking token mode:', error);
            return null;
        }
    }

    async transferToken(amount) {
        if (!this.tokenContract || !this.account) {
            throw new Error('Wallet not connected or contract not initialized');
        }

        const mode = await this.checkTokenMode();
        if (mode === 'RESTRICTED') {
            throw new Error('Token transfers are currently restricted. Please wait for the token to launch.');
        }

        const amountWei = this.web3.utils.toWei(amount.toString(), 'ether');
        
        try {
            const gasEstimate = await this.tokenContract.methods
                .transfer(recipientAddress, amountWei)
                .estimateGas({ from: this.account });

            const tx = await this.tokenContract.methods
                .transfer(recipientAddress, amountWei)
                .send({ 
                    from: this.account,
                    gas: Math.floor(gasEstimate * 1.2)
                });

            return tx;
        } catch (error) {
            console.error('Transfer failed:', error);
            throw error;
        }
    }

    async updateBalance() {
        try {
            if (!this.isConnected) {
                console.log('钱包未连接，跳过余额更新');
                return;
            }
            
            console.log('Starting balance update...');
            const balance = await this.getTokenBalance();
            console.log('Retrieved balance:', balance);
            
            const displayBalance = Math.floor(parseFloat(balance));
            
            // 更新主页余额显示
            const balanceElement = document.getElementById('userBalance');
            if (balanceElement) {
                balanceElement.textContent = `${displayBalance} GrooveMe`;
                console.log('主页余额已更新:', displayBalance);
            }
            
            // 更新弹窗余额显示（如果存在）
            const modalBalanceElement = document.getElementById('modalUserBalance');
            if (modalBalanceElement) {
                modalBalanceElement.textContent = `${displayBalance} GrooveMe`;
                console.log('弹窗余额已更新:', displayBalance);
            }
            
        } catch (error) {
            console.error('Error updating balance:', error);
        }
    }

    updateWalletUI() {
        const connectBtn = document.getElementById('connectWallet');
        const walletText = document.getElementById('walletText');
        
        if (this.isConnected && this.account) {
            const shortAddress = `${this.account.slice(0, 6)}...${this.account.slice(-4)}`;
            walletText.textContent = shortAddress;
            connectBtn.classList.add('connected');
        } else {
            walletText.textContent = 'Connect Wallet';
            connectBtn.classList.remove('connected');
        }
    }

    setupEventListeners() {
        const connectBtn = document.getElementById('connectWallet');
        if (connectBtn) {
            connectBtn.addEventListener('click', async () => {
            if (!this.checkWalletInstallation()) {
                return; // 如果没有安装钱包，显示提示并返回
            }
            
            if (!this.isConnected) {
                await this.checkConnection();
                if (!this.isConnected) {
                    this.connectWallet();
                }
            }
        });
        }

        if (window.ethereum) {
            window.ethereum.on('accountsChanged', (accounts) => {
                if (accounts.length === 0) {
                    this.account = null;
                    this.isConnected = false;
                } else {
                    this.account = accounts[0];
                    this.isConnected = true;
                }
                this.updateWalletUI();
                this.updateBalance();
                
                // 当钱包账户改变时，重新加载任务状态
                if (typeof onWalletConnectionChanged === 'function') {
                    onWalletConnectionChanged();
                }
            });

            window.ethereum.on('chainChanged', () => {
                window.location.reload();
            });
        }
    }
}

// 全局函数定义 - 确保在全局作用域中
async function updatePoolAmount() {
    try {
        const response = await fetch(`${getApiBaseUrl()}/current-round`);
        const data = await response.json();
        
        if (data && data.total_pool_amount !== undefined) {
            const poolElement = document.getElementById('poolAmount');
            if (poolElement) {
                poolElement.textContent = `${data.total_pool_amount.toLocaleString()} GrooveMe`;
            }
            
            const targetAmount = 1000000;
            const percentage = Math.min((data.total_pool_amount / targetAmount) * 100, 100);
            const progressFill = document.getElementById('progressFill');
            if (progressFill) {
                progressFill.style.width = `${percentage}%`;
            }
        } else {
            const poolElement = document.getElementById('poolAmount');
            if (poolElement) {
                poolElement.textContent = '100,000 GrooveMe';
            }
        }
    } catch (error) {
        console.error('更新奖池金额失败:', error);
        const poolElement = document.getElementById('poolAmount');
        if (poolElement) {
            poolElement.textContent = '100,000 GrooveMe';
        }
    }
}

async function loadParticipants() {
    try {
        const roundResponse = await fetch(`${getApiBaseUrl()}/current-round`);
        const roundData = await roundResponse.json();
        
        if (roundData && roundData.id) {
            const timestamp = Date.now();
            const response = await fetch(`${getApiBaseUrl()}/participations/${roundData.id}?t=${timestamp}`);
            const participants = await response.json();
            
            if (participants) {
                displayParticipants(participants);
            }
        }
    } catch (error) {
        console.error('加载参与者列表失败:', error);
        const participantElement = document.getElementById('participantCount');
        if (participantElement) {
            participantElement.textContent = '0';
        }
    }
}

function displayParticipants(participants) {
    const participantCount = participants.length;
    const participantElement = document.getElementById('participantCount');
    if (participantElement) {
        participantElement.textContent = participantCount;
    }
}

async function updateCountdown() {
    try {
        const response = await fetch(`${getApiBaseUrl()}/current-round`);
        const data = await response.json();
        
        if (data && data.end_time) {
            // 将UTC时间转换为北京时间进行计算
            const endTimeUTC = new Date(data.end_time);
            const nowUTC = new Date();
            
            // 计算时间差（毫秒）
            const timeLeft = endTimeUTC.getTime() - nowUTC.getTime();
            
            if (timeLeft > 0) {
                startCountdownTimer(timeLeft);
            } else {
                document.getElementById('countdown').textContent = '等待开奖';
            }
        }
    } catch (error) {
        console.error('获取倒计时失败:', error);
        document.getElementById('countdown').textContent = '连接中...';
    }
}

function startCountdownTimer(timeLeft) {
    if (countdownInterval) {
        clearInterval(countdownInterval);
    }
    
    // 添加鸡蛋图片切换函数
    function updateEggImage(timeLeftMs) {
        const eggImage = document.getElementById('eggImage');
        const minutes = Math.floor(timeLeftMs / (1000 * 60));
        
        if (timeLeftMs <= 0) {
            // 倒计时真正结束，显示破裂的蛋并停止动画
            eggImage.src = 'egg04.png';
            eggImage.classList.add('hatched');
        } else {
            // 移除破壳状态类，恢复动画
            eggImage.classList.remove('hatched');
            
            if (minutes <= 10) {
                // 剩余10分钟或更少，显示即将孵化的蛋
                eggImage.src = 'egg03.png';
            } else if (minutes <= 40) {
                // 剩余40分钟或更少，显示发育中的蛋
                eggImage.src = 'egg02.png';
            } else {
                // 剩余时间超过40分钟，显示初始状态的蛋
                eggImage.src = 'egg01.png';
            }
        }
    }
    
    // 初始设置鸡蛋图片
    updateEggImage(timeLeft);
    
    countdownInterval = setInterval(() => {
        timeLeft -= 1000;
        
        if (timeLeft <= 0) {
            clearInterval(countdownInterval);
            document.getElementById('countdown').textContent = '等待开奖';
            // 倒计时结束时显示破裂的蛋
            updateEggImage(0);
            setTimeout(() => {
                updateCountdown();
                updatePoolAmount();
                updateWinnerHistory();
                // 新一轮开始时恢复初始鸡蛋图片
                document.getElementById('eggImage').src = 'egg01.png';
            }, 5000);
            return;
        }
        
        // 更新鸡蛋图片
        updateEggImage(timeLeft);
        
        const hours = Math.floor(timeLeft / (1000 * 60 * 60));
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
        
        const display = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        document.getElementById('countdown').textContent = display;
    }, 1000);
}

async function updateWinnerHistory() {
    try {
        const response = await fetch(`${getApiBaseUrl()}/completed-rounds?limit=50`);
        const data = await response.json();
        
        if (data && data.rounds && data.rounds.length > 0) {
            const historyContainer = document.getElementById('winnerHistoryList');
            if (historyContainer) {
                historyContainer.innerHTML = data.rounds.map(round => `
                    <div class="winner-item">
                        <div class="winner-round">第${round.round_id}轮</div>
                        <div class="winner-address-container">
                            <div class="winner-address">${round.winner_address ? round.winner_address.slice(0, 6) + '...' + round.winner_address.slice(-4) : '暂无'}</div>
                            ${round.winner_address ? `<button class="copy-address-btn" onclick="copyAddress('${round.winner_address}')" title="复制地址">📋</button>` : ''}
                        </div>
                        <div class="winner-amount">${round.total_pool_amount || 0} GrooveMe</div>
                    </div>
                `).join('');
            }
        }
    } catch (error) {
        console.error('获取中奖历史失败:', error);
    }
}

// 添加复制地址功能
function copyAddress(address) {
    if (navigator.clipboard && window.isSecureContext) {
        // 使用现代 Clipboard API
        navigator.clipboard.writeText(address).then(() => {
            showCopySuccess();
        }).catch(err => {
            console.error('复制失败:', err);
            fallbackCopyTextToClipboard(address);
        });
    } else {
        // 降级方案
        fallbackCopyTextToClipboard(address);
    }
}

// 降级复制方案
function fallbackCopyTextToClipboard(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
        const successful = document.execCommand('copy');
        if (successful) {
            showCopySuccess();
        } else {
            showCopyError();
        }
    } catch (err) {
        console.error('降级复制失败:', err);
        showCopyError();
    }
    
    document.body.removeChild(textArea);
}

// 显示复制成功提示
function showCopySuccess() {
    // 创建临时提示元素
    const toast = document.createElement('div');
    toast.textContent = '地址已复制到剪贴板';
    toast.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 10px 20px;
        border-radius: 5px;
        z-index: 10000;
        font-size: 14px;
    `;
    
    document.body.appendChild(toast);
    
    // 2秒后移除提示
    setTimeout(() => {
        if (document.body.contains(toast)) {
            document.body.removeChild(toast);
        }
    }, 2000);
}

// 显示复制失败提示
function showCopyError() {
    alert('复制失败，请手动复制地址');
}

function startRealtimeUpdates() {
    if (updateInterval) {
        clearInterval(updateInterval);
    }
    
    updateInterval = setInterval(async () => {
        try {
            await updatePoolAmount();
            await loadParticipants();
            await updateCountdown();
        } catch (error) {
            console.error('定时更新失败:', error);
        }
    }, 30000);
}

// 转账成功后的处理
async function handleTransferSuccess(transactionHash, amount, userAddress) {
    console.log('转账成功，开始处理后续逻辑...', { transactionHash, amount, userAddress });
    
    try {
        // 立即更新一次
        await updatePoolAmount();
        await loadParticipants();
        
        console.log('数据更新完成');
        
        // 延迟更新机制 - 给后端处理区块链事件的时间
        setTimeout(async () => {
            console.log('延迟更新开始...');
            await updatePoolAmount();
            await loadParticipants();
        }, 3000); // 3秒后再次更新
        
        // 启动更积极的重试更新
        startFastUpdatesAfterTransfer();
        
    } catch (error) {
        console.error('处理转账成功时出错:', error);
        // 错误时也要延迟重试
        setTimeout(async () => {
            try {
                await updatePoolAmount();
                await loadParticipants();
            } catch (updateError) {
                console.error('延迟更新数据失败:', updateError);
            }
        }, 5000);
    }
}

function startFastUpdatesAfterTransfer() {
    let updateCount = 0;
    const maxUpdates = 10; // 增加更新次数
    
    console.log('开始转账后快速更新...');
    
    const fastUpdateInterval = setInterval(async () => {
        try {
            await updatePoolAmount();
            await loadParticipants();
            updateCount++;
            console.log(`快速更新 ${updateCount}/${maxUpdates}`);
            
            if (updateCount >= maxUpdates) {
                clearInterval(fastUpdateInterval);
                console.log('快速更新完成，恢复正常更新频率');
            }
        } catch (error) {
            console.error('快速更新出错:', error);
        }
    }, 3000); // 改为3秒间隔，给后端更多处理时间
}

// 参与孵化功能
// 修改 participateInIncubation 函数
async function participateInIncubation() {
    if (!walletManager || !walletManager.isConnected) {
        alert('请先连接钱包');
        return;
    }

    // 修改这里：使用正确的元素ID
    const amountInput = document.getElementById('tokenAmount');
    if (!amountInput) {
        alert('找不到输入框元素');
        return;
    }
    
    const amount = parseFloat(amountInput.value);

    if (!amount || amount <= 0) {
        alert('请输入有效的参与金额');
        return;
    }

    try {
        const balance = await walletManager.getTokenBalance();
        if (parseFloat(balance) < amount) {
            alert('余额不足');
            return;
        }

        const confirmBtn = document.getElementById('confirmParticipate');
        if (confirmBtn) {
            confirmBtn.disabled = true;
            confirmBtn.textContent = '处理中...';
        }

        const tx = await walletManager.transferToken(amount);
        
        if (tx && tx.transactionHash) {
            await handleTransferSuccess(tx.transactionHash, amount, walletManager.account);
            alert('参与成功！');
            amountInput.value = '';
            closeModal();
        }
    } catch (error) {
        console.error('参与失败:', error);
        alert('参与失败: ' + error.message);
    } finally {
        const confirmBtn = document.getElementById('confirmParticipate');
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.textContent = '确认参与';
        }
    }
}

// 添加显示模态框的函数
function showParticipateModal() {
    if (!walletManager || !walletManager.isConnected) {
        alert('请先连接钱包');
        return;
    }
    
    const modal = document.getElementById('participateModal');
    if (modal) {
        modal.style.display = 'block';
        // 更新弹窗中的余额显示
        setTimeout(async () => {
            try {
                const balance = await walletManager.getTokenBalance();
                const modalBalanceElement = document.getElementById('modalUserBalance');
                if (modalBalanceElement) {
                    const displayBalance = Math.floor(parseFloat(balance));
                    modalBalanceElement.textContent = `${displayBalance} GrooveMe`;
                    console.log('弹窗余额已更新:', displayBalance);
                } else {
                    console.log('找不到弹窗余额元素');
                }
            } catch (error) {
                console.error('更新弹窗余额失败:', error);
            }
        }, 100);
    }
}

// 添加关闭模态框的函数
function closeModal() {
    const modal = document.getElementById('participateModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// 添加确认参与函数
function confirmParticipation() {
    participateInIncubation();
}

// 快捷输入代币数量功能
function setQuickAmount(amount) {
    const tokenAmountInput = document.getElementById('tokenAmount');
    if (tokenAmountInput) {
        tokenAmountInput.value = amount;
        // 触发input事件，以便其他相关功能能够响应
        tokenAmountInput.dispatchEvent(new Event('input', { bubbles: true }));
        
        // 添加视觉反馈
        tokenAmountInput.style.background = '#e8f5e8';
        setTimeout(() => {
            tokenAmountInput.style.background = '';
        }, 300);
    }
}



// 底部导航栏tab切换功能
function initBottomNavigation() {
    const tabItems = document.querySelectorAll('.tab-item');
    
    tabItems.forEach(item => {
        item.addEventListener('click', function() {
            const tabType = this.getAttribute('data-tab');
            
            // 如果点击的是NFT按钮，不改变任何tab的active状态
            if (tabType === 'nft') {
                handleTabSwitch(tabType);
                return;
            }
            
            // 对于其他按钮，正常处理
            handleTabSwitch(tabType);
        });
    });
}

// 空投任务状态管理 - 基于钱包地址的本地存储
let taskStatus = {
    task1: false,
    task2: false
};

// 添加倒计时相关变量
let submitTime = null;

// 获取倒计时存储键
function getCountdownStorageKey() {
    const walletAddress = getCurrentWalletAddress();
    if (!walletAddress) {
        return null;
    }
    return `airdropCountdown_${walletAddress}`;
}

// 保存提交时间
function saveSubmitTime() {
    const storageKey = getCountdownStorageKey();
    if (!storageKey) {
        return;
    }
    
    submitTime = Date.now();
    localStorage.setItem(storageKey, submitTime.toString());
}

// 加载提交时间
function loadSubmitTime() {
    const storageKey = getCountdownStorageKey();
    if (!storageKey) {
        submitTime = null;
        return;
    }
    
    const saved = localStorage.getItem(storageKey);
    if (saved) {
        submitTime = parseInt(saved);
    } else {
        submitTime = null;
    }
}

// 清除提交时间
function clearSubmitTime() {
    const storageKey = getCountdownStorageKey();
    if (storageKey) {
        localStorage.removeItem(storageKey);
    }
    submitTime = null;
}

// 格式化倒计时显示
function formatCountdown(milliseconds) {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// 开始倒计时
function startCountdown() {
    const submitBtn = document.getElementById('submitBtn');
    if (!submitBtn || !submitTime) {
        return;
    }
    
    // 清除之前的倒计时
    if (countdownInterval) {
        clearInterval(countdownInterval);
    }
    
    countdownInterval = setInterval(() => {
        const now = Date.now();
        const elapsed = now - submitTime;
        const remaining = 24 * 60 * 60 * 1000 - elapsed; // 24小时
        
        if (remaining <= 0) {
            // 倒计时结束
            clearInterval(countdownInterval);
            countdownInterval = null;
            
            // 重置任务2状态
            taskStatus.task2 = false;
            saveTaskStatus();
            
            // 清除提交时间
            clearSubmitTime();
            
            // 更新UI
            updateTaskUI();
            
            // 显示提示
            alert('24小时已过，您可以重新提交空投申请！');
        } else {
            // 更新倒计时显示
            const countdownText = formatCountdown(remaining);
            submitBtn.textContent = `已提交 (${countdownText})`;
            submitBtn.disabled = true;
            submitBtn.style.background = 'linear-gradient(135deg, #666 0%, #888 50%, #aaa 100%)';
            submitBtn.style.cursor = 'not-allowed';
        }
    }, 1000);
}

// 检查是否在倒计时中
function isInCountdown() {
    if (!submitTime) {
        return false;
    }
    
    const now = Date.now();
    const elapsed = now - submitTime;
    const remaining = 24 * 60 * 60 * 1000 - elapsed;
    
    return remaining > 0;
}

// 获取当前钱包地址
function getCurrentWalletAddress() {
    if (walletManager && walletManager.account) {
        return walletManager.account.toLowerCase();
    }
    return null;
}

// 获取任务状态存储键
function getTaskStorageKey() {
    const walletAddress = getCurrentWalletAddress();
    if (!walletAddress) {
        return null;
    }
    return `airdropTaskStatus_${walletAddress}`;
}

// 从localStorage加载任务状态
function loadTaskStatus() {
    const storageKey = getTaskStorageKey();
    if (!storageKey) {
        taskStatus = {
            task1: false,
            task2: false
        };
        submitTime = null;
        updateTaskUI();
        return;
    }
    
    // 加载任务状态
    const saved = localStorage.getItem(storageKey);
    if (saved) {
        try {
            taskStatus = JSON.parse(saved);
        } catch (error) {
            console.error('解析任务状态失败:', error);
            taskStatus = {
                task1: false,
                task2: false
            };
        }
    } else {
        taskStatus = {
            task1: false,
            task2: false
        };
    }
    
    // 加载提交时间
    loadSubmitTime();
    
    // 如果在倒计时中，启动倒计时
    if (isInCountdown()) {
        startCountdown();
    }
    
    updateTaskUI();
}

// 保存任务状态到localStorage
function saveTaskStatus() {
    const storageKey = getTaskStorageKey();
    if (!storageKey) {
        console.warn('无法保存任务状态：未连接钱包');
        return;
    }
    
    try {
        localStorage.setItem(storageKey, JSON.stringify(taskStatus));
        console.log('任务状态已保存:', storageKey, taskStatus);
    } catch (error) {
        console.error('保存任务状态失败:', error);
    }
}

// 完成任务
function completeTask(taskId, url) {
    // 检查是否连接钱包
    if (!getCurrentWalletAddress()) {
        alert('请先连接钱包再完成任务！');
        return;
    }
    
    // 打开推特链接
    window.open(url, '_blank');
    
    // 标记任务完成
    taskStatus[`task${taskId}`] = true;
    saveTaskStatus();
    updateTaskUI();
    
    // 显示完成提示
    setTimeout(() => {
        alert(`任务 ${taskId} 已完成！`);
    }, 1000);
}

// 更新任务UI状态
function updateTaskUI() {
    // 更新任务状态显示
    Object.keys(taskStatus).forEach(taskKey => {
        const taskNumber = taskKey.replace('task', '');
        // 修改选择器，直接使用id而不是data-task属性
        const taskItem = document.getElementById(`task${taskNumber}`);
        const completeBtn = document.getElementById(`task${taskNumber}-btn`);
        const taskStatus_element = document.getElementById(`task${taskNumber}-status`);
        
        if (taskItem && completeBtn) {
            if (taskStatus[taskKey]) {
                taskItem.classList.add('completed');
                completeBtn.textContent = '已完成';
                completeBtn.disabled = true;
                // 更新任务状态图标
                if (taskStatus_element) {
                    taskStatus_element.textContent = '✅';
                }
            } else {
                taskItem.classList.remove('completed');
                completeBtn.textContent = '去完成';
                completeBtn.disabled = false;
                // 重置任务状态图标
                if (taskStatus_element) {
                    taskStatus_element.textContent = '⏳';
                }
            }
        }
    });
    
    // 更新提交按钮状态
    const submitBtn = document.getElementById('submitBtn');
    if (submitBtn) {
        if (isInCountdown()) {
            // 如果在倒计时中，按钮保持禁用状态
            submitBtn.disabled = true;
            // 倒计时显示会在startCountdown函数中更新
        } else {
            // 正常状态
            const allCompleted = Object.values(taskStatus).every(status => status);
            submitBtn.disabled = !allCompleted;
            submitBtn.textContent = allCompleted ? '提交空投申请' : '完成所有任务后提交';
            submitBtn.style.background = '';
            submitBtn.style.cursor = '';
        }
    }
}

// 提交空投申请
function submitAirdrop() {
    const walletAddress = getCurrentWalletAddress();
    if (!walletAddress) {
        alert('请先连接钱包！');
        return;
    }
    
    // 检查是否在倒计时中
    if (isInCountdown()) {
        alert('您已提交过申请，请等待倒计时结束后再次提交！');
        return;
    }
    
    const allCompleted = Object.values(taskStatus).every(status => status);
    if (allCompleted) {
        // 保存提交时间
        saveSubmitTime();
        
        // 开始倒计时
        startCountdown();
        
        alert(`空投申请已提交！\n钱包地址: ${walletAddress}\n我们将在24小时内处理您的申请。`);
        
        // 这里可以添加实际的提交逻辑，发送到后端
        // submitToBackend(walletAddress, taskStatus);
    } else {
        alert('请先完成所有任务！');
    }
}

// 监听钱包连接状态变化
function onWalletConnectionChanged() {
    // 清除之前的倒计时
    if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
    }
    
    // 当钱包连接状态改变时，重新加载任务状态
    loadTaskStatus();
}

// 处理tab切换逻辑
function handleTabSwitch(tabType) {
    // 如果是NFT按钮，直接显示弹窗，不进行任何页面和状态切换
    if (tabType === 'nft') {
        showDevelopingModal();
        console.log('显示NFT开发中提示弹窗');
        return; // 直接返回，不执行后续的页面切换逻辑
    }
    
    // 隐藏所有内容区域
    document.querySelectorAll('.home-content, .cards-content, .airdrop-content').forEach(content => {
        content.style.display = 'none';
    });
    
    // 移除所有tab的active状态
    document.querySelectorAll('.tab-item').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // 添加当前tab的active状态
    document.querySelector(`[data-tab="${tabType}"]`).classList.add('active');
    
    switch(tabType) {
        case 'home':
            document.querySelector('.home-content').style.display = 'block';
            console.log('切换到首页');
            break;
        case 'cards':
            document.querySelector('.cards-content').style.display = 'block';
            initCardsGallery();
            console.log('切换到玩法卡牌');
            break;
        case 'winners':
            document.querySelector('.airdrop-content').style.display = 'block';
            loadTaskStatus();
            console.log('切换到领取空投');
            break;
        default:
            document.querySelector('.home-content').style.display = 'block';
            console.log('未知的tab类型:', tabType);
    }
}

// 初始化卡牌展览
function initCardsGallery() {
    // 添加卡牌点击事件
    document.querySelectorAll('.card-item:not(.coming-soon)').forEach(card => {
        card.addEventListener('click', function() {
            const cardType = this.dataset.card;
            showCardDetails(cardType);
        });
    });
    
    // 添加卡牌悬停效果
    document.querySelectorAll('.card-item').forEach(card => {
        card.addEventListener('mouseenter', function() {
            if (!this.classList.contains('coming-soon')) {
                this.style.transform = 'translateY(-5px) scale(1.02)';
            }
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = '';
        });
    });
}

// 显示卡牌详情（替换原来的alert弹窗）
function showCardDetails(cardType) {
    const cardData = {
        'golden-phoenix': {
            name: 'Golden Phoenix',
            description: '最稀有的传奇卡牌，拥有神秘的重生力量。当你获得这张卡牌时，能够赢得本轮100%的奖池金额，但孵化几率仅有20%。传说中，金凤凰每千年才会出现一次，象征着财富与重生的力量。',
            effect: '赢得100%奖池',
            hatchRate: '20%',
            rarity: '传奇',
            rarityClass: 'legendary',
            image: 'GOLDEN PHOENIX.png'
        },
        'crystal-rooster': {
            name: 'Crystal Rooster',
            description: '由纯净水晶打造的史诗级卡牌，散发着神秘的蓝色光芒。奖池将在最多5名玩家之间平分，孵化成功率为50%。水晶公鸡代表着团结与分享，让幸运的玩家们共同分享胜利的果实。',
            effect: '平分奖池(最多5人)',
            hatchRate: '50%',
            rarity: '史诗',
            rarityClass: 'epic',
            image: 'CRYSTAL ROOSTER.png'
        },
        'changpeng-zhao': {
            name: 'Changpeng Zhao',
            description: '神话级特殊卡牌，以币安创始人CZ为原型设计。当获得这张卡牌时，当前轮奖池将自动转入CZ的钱包地址，孵化几率极低仅有5%。这是对加密货币世界传奇人物的致敬。',
            effect: '奖池转入CZ钱包',
            hatchRate: '5%',
            rarity: '神话',
            rarityClass: 'mythic',
            image: 'CZ.png'
        },
        'striving-rooster': {
            name: 'Striving Rooster',
            description: '象征着坚持不懈精神的稀有卡牌，身着蓝色战袍的公鸡展现出强大的意志力。当前奖池将滚动到下一轮，增加下轮奖池金额，给予玩家更大的期待和机会。',
            effect: '奖池滚动到下轮',
            hatchRate: '25%',
            rarity: '稀有',
            rarityClass: 'rare',
            image: 'STRIVING ROOSTER.png'
        }
    };
    
    const card = cardData[cardType];
    if (card) {
        // 设置卡牌详情内容
        document.getElementById('cardDetailImage').src = card.image;
        document.getElementById('cardDetailImage').alt = card.name;
        document.getElementById('cardDetailName').textContent = card.name;
        document.getElementById('cardDetailDescription').textContent = card.description;
        document.getElementById('cardDetailEffect').textContent = card.effect;
        document.getElementById('cardDetailHatchRate').textContent = card.hatchRate;
        
        // 设置稀有度样式
        const rarityElement = document.getElementById('cardDetailRarity');
        rarityElement.textContent = card.rarity;
        rarityElement.className = `card-detail-rarity ${card.rarityClass}`;
        
        // 显示模态框
        const modal = document.getElementById('cardDetailModal');
        modal.style.display = 'flex';
        
        // 添加动画效果
        setTimeout(() => {
            modal.classList.add('show');
        }, 10);
        
        // 阻止页面滚动
        document.body.style.overflow = 'hidden';
    }
}

// 关闭卡牌详情
function closeCardDetail() {
    const modal = document.getElementById('cardDetailModal');
    modal.classList.remove('show');
    
    setTimeout(() => {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }, 300);
}

// 添加键盘ESC关闭功能
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        const modal = document.getElementById('cardDetailModal');
        if (modal.classList.contains('show')) {
            closeCardDetail();
        }
    }
});

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    console.log('页面加载完成，开始初始化...');
    
    // 初始化钱包管理器
    walletManager = new WalletManager();
    
    // 初始化底部导航栏
    initBottomNavigation();
    
    // 初始化数据
    updatePoolAmount();
    updateCountdown();
    loadParticipants();
    updateWinnerHistory();
    
    // 启动定时更新
    startRealtimeUpdates();
    
    // 初始化任务状态
    loadTaskStatus();
    
    // 设置模态框点击外部关闭
    window.onclick = function(event) {
        const participationModal = document.getElementById('participationModal');
        
        if (event.target === participationModal) {
            closeParticipationModal();
        }
    };
});

// 显示玩法规则弹窗
function showRulesModal() {
    const modal = document.getElementById('rulesModal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

// 关闭玩法规则弹窗
function closeRulesModal() {
    const modal = document.getElementById('rulesModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// 在现有的点击外部关闭弹窗功能中添加玩法规则弹窗
window.addEventListener('click', function(event) {
    const participationModal = document.getElementById('participationModal');
    const rulesModal = document.getElementById('rulesModal');
    
    if (event.target === participationModal) {
        closeParticipationModal();
    }
    if (event.target === rulesModal) {
        closeRulesModal();
    }
});

// 显示开发中提示弹窗
function showDevelopingModal() {
    const modal = document.getElementById('developingModal');
    modal.classList.add('show');
    
    // 添加ESC键关闭功能
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeDevelopingModal();
        }
    });
}

// 关闭开发中提示弹窗
function closeDevelopingModal() {
    const modal = document.getElementById('developingModal');
    modal.classList.remove('show');
}

// 显示最新结果弹窗
function showLatestResultModal() {
    const modal = document.getElementById('latestResultModal');
    modal.style.display = 'flex';
    loadLatestResult();
}

// 关闭最新结果弹窗
function closeLatestResultModal() {
    const modal = document.getElementById('latestResultModal');
    modal.style.display = 'none';
}

// 加载最新开奖结果
async function loadLatestResult() {
    const contentDiv = document.getElementById('latestResultContent');
    contentDiv.innerHTML = '<div class="loading-text">加载中...</div>';
    
    try {
        const response = await fetch(`${getApiBaseUrl()}/completed-rounds?limit=1`);
        const data = await response.json();
        
        if (data.rounds && data.rounds.length > 0) {
            const latestRound = data.rounds[0];
            displayLatestResult(latestRound);
        } else {
            contentDiv.innerHTML = '<div class="no-result-message">暂无开奖结果</div>';
        }
    } catch (error) {
        console.error('获取最新结果失败:', error);
        contentDiv.innerHTML = '<div class="no-result-message">加载失败，请稍后重试</div>';
    }
}

// 显示最新开奖结果
function displayLatestResult(round) {
    const contentDiv = document.getElementById('latestResultContent');
    
    // 获取开奖类型的中文名称
    const getWinnerTypeName = (type) => {
        switch(type) {
            case 'GOLDEN_PHOENIX': return '金凤凰';
            case 'DIAMOND_CHICKEN': return '钻石鸡';
            case 'STRUGGLING_CHICKEN': return '打工鸡';
            case 'CZ_CHICKEN': return 'CZ鸡';
            default: return type;
        }
    };
    
    // 格式化金额
    const formatAmount = (amount) => {
        return new Intl.NumberFormat('zh-CN').format(amount) + ' GrooveMe';
    };
    
    // 截断地址显示
    const truncateAddress = (address) => {
        if (!address) return '未知地址';
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    };
    
    let html = `
        <div class="result-item">
            <div class="result-header">
                <div class="result-round">第 ${round.round_id} 轮</div>
                <div class="result-type">${getWinnerTypeName(round.winner_type)}</div>
            </div>
    `;
    
    // 处理不同类型的中奖情况
    if (round.winner_type === 'CZ_CHICKEN' && round.cz_chicken_payout_address) {
        // CZ鸡的情况，显示CZ鸡的地址和金额
        html += `
            <div class="result-winner">
                <span class="winner-label">中奖地址:</span>
                <div class="winner-address-container">
                    <span class="winner-address">${round.cz_chicken_payout_address}</span>
                    <button class="copy-address-btn" onclick="copyToClipboard('${round.cz_chicken_payout_address}')">
                        📋 复制
                    </button>
                </div>
            </div>
            <div class="result-amount">
                <span class="amount-label">获得金额:</span>
                <span class="amount-value">${formatAmount(round.cz_chicken_payout_amount || 0)}</span>
            </div>
        `;
    } else if (round.winner_address) {
        // 其他类型的中奖情况
        html += `
            <div class="result-winner">
                <span class="winner-label">中奖地址:</span>
                <div class="winner-address-container">
                    <span class="winner-address">${round.winner_address}</span>
                    <button class="copy-address-btn" onclick="copyToClipboard('${round.winner_address}')">
                        📋 复制
                    </button>
                </div>
            </div>
            <div class="result-amount">
                <span class="amount-label">获得金额:</span>
                <span class="amount-value">${formatAmount(round.total_pool_amount || 0)}</span>
            </div>
        `;
    } else {
        html += `
            <div class="no-result-message">本轮暂无中奖信息</div>
        `;
    }
    
    html += `</div>`;
    
    contentDiv.innerHTML = html;
}

// 复制地址到剪贴板
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        // 显示复制成功提示
        showCopySuccess();
    } catch (err) {
        // 降级方案
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showCopySuccess();
    }
}

// 显示复制成功提示
function showCopySuccess() {
    // 创建临时提示元素
    const toast = document.createElement('div');
    toast.textContent = '地址已复制到剪贴板';
    toast.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #28a745;
        color: white;
        padding: 12px 24px;
        border-radius: 6px;
        z-index: 10000;
        font-size: 14px;
        font-weight: 600;
    `;
    
    document.body.appendChild(toast);
    
    // 2秒后移除提示
    setTimeout(() => {
        document.body.removeChild(toast);
    }, 2000);
}

// 点击弹窗外部关闭弹窗
document.addEventListener('click', function(event) {
    const modal = document.getElementById('latestResultModal');
    if (event.target === modal) {
        closeLatestResultModal();
    }
});

// --- 项目介绍弹窗逻辑 (每次刷新都显示) ---

document.addEventListener('DOMContentLoaded', () => {
    const introModal = document.getElementById('introModal');
    if (introModal) {
        introModal.style.display = 'flex';
    }
});

function closeIntroModal() {
    const introModal = document.getElementById('introModal');
    if (introModal) {
        introModal.style.display = 'none';
    }
}
