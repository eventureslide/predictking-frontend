// Firebase Configuration - REPLACE WITH YOUR CONFIG
const firebaseConfig = {
    apiKey: "AIzaSyA61LVsUjl1CsR3XeMyEjjZ-DDU6rMHwhU",
    authDomain: "predictking-database.firebaseapp.com",
    projectId: "predictking-database",
    storageBucket: "predictking-database.firebasestorage.app",
    messagingSenderId: "786291226968",
    appId: "1:786291226968:web:4608df217228f4ecdf0d2d"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Global Variables
let currentUser = null;
let currentTheme = 'default';
let events = [];
let leaderboard = [];
let adminSettings = {
    vigPercentage: 5,
    dailyBuyinLimit: 1000,
    perAdReward: 50,
    activeAds: [
        'https://www.youtube.com/embed/r9xWOA_S3_g',
        'https://www.youtube.com/embed/srRdl60cDVw'
    ]
};

// Profile picture defaults
const defaultProfilePics = {
    male: [
        "https://i.ibb.co/VYvcGYh0/00e3ef3b309ca5bd6280aa9f3eeb3e97.jpg", // Add more male profile pic URLs here
        // Add 50+ more male profile pic URLs
    ],
    female: [
        "https://i.ibb.co/6R0b2tFc/cute-cool-boy-dabbing-pose-cartoon-icon-illustration-people-fashion-icon-concept-isolated-generat-ai.jpg", // Add more female profile pic URLs here  
        // Add 50+ more female profile pic URLs
    ]
};

// Track used profile pics to avoid repetition
let usedProfilePics = {
    male: new Set(),
    female: new Set()
};

function getRandomProfilePic(gender) {
    const pics = defaultProfilePics[gender] || defaultProfilePics.male;
    const usedSet = usedProfilePics[gender];
    
    // If all pics are used, reset the set
    if (usedSet.size >= pics.length) {
        usedSet.clear();
    }
    
    // Find unused pics
    const unusedPics = pics.filter(pic => !usedSet.has(pic));
    
    // Select random from unused pics
    const selectedPic = unusedPics[Math.floor(Math.random() * unusedPics.length)];
    
    // Mark as used
    usedSet.add(selectedPic);
    
    return selectedPic;
}

// Initialization
/* Replace with: */
document.addEventListener('DOMContentLoaded', async function() {
    showLoadingScreen();
    
    // Prevent text selection on loading screen
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        loadingScreen.style.userSelect = 'none';
        loadingScreen.style.webkitUserSelect = 'none';
        loadingScreen.style.mozUserSelect = 'none';
    }
    
    // Load all necessary data
    await Promise.all([
        checkLoginStatus(),
        loadEvents(),
        loadStats()
    ]);
    
    startRealTimeUpdates();
    updateThemeBasedOnUser();
    
    // Wait for loading bar to complete (minimum 3 seconds)
    setTimeout(() => {
        hideLoadingScreen();
        updateButtonLayout();
    }, 3000);
});

// Loading Screen Functions
function showLoadingScreen() {
    document.getElementById('loading-screen').style.display = 'flex';
    document.getElementById('main-app').classList.add('hidden');
}

function hideLoadingScreen() {
    document.getElementById('loading-screen').style.display = 'none';
    document.getElementById('main-app').classList.remove('hidden');
}

// Theme Management
function setTheme(theme) {
    document.body.className = '';
    document.body.classList.add(theme + '-theme');
    currentTheme = theme;
}

function updateThemeBasedOnUser() {
    if (!currentUser) {
        setTheme('default');
        // Show sticky stats bar for logged out users
        const stickyBar = document.getElementById('sticky-stats-bar');
        const originalBtn = document.getElementById('original-evc-btn');
        if (stickyBar) stickyBar.classList.remove('hidden');
        if (originalBtn) originalBtn.classList.add('hidden');
        
        // Hide wallet button when logged out
        const walletBtn = document.getElementById('wallet-btn');
        if (walletBtn) walletBtn.classList.add('hidden');
        
        // Show login required button on EVC page
        const loginRequiredBtn = document.getElementById('login-required');
        if (loginRequiredBtn) loginRequiredBtn.classList.remove('hidden');
    } else {
        // Hide sticky stats bar for logged in users
        const stickyBar = document.getElementById('sticky-stats-bar');
        const originalBtn = document.getElementById('original-evc-btn');
        if (stickyBar) stickyBar.classList.add('hidden');
        if (originalBtn) originalBtn.classList.remove('hidden');
        
        if (currentUser.gender === 'male') {
            setTheme('male');
        } else if (currentUser.gender === 'female') {
            setTheme('female');
        }
        
        // Show wallet button when logged in
        const walletBtn = document.getElementById('wallet-btn');
        if (walletBtn) walletBtn.classList.remove('hidden');
        
        // Hide login required button on EVC page
        const loginRequiredBtn = document.getElementById('login-required');
        if (loginRequiredBtn) loginRequiredBtn.classList.add('hidden');
    }
}

function updateButtonLayout() {
    const profileBtn = document.getElementById('profile-btn');
    const notificationsBtn = document.getElementById('notifications-btn');
    const loginBtn = document.getElementById('login-btn');
    
    if (currentUser) {
        // Logged in: show 4 buttons in grid
        if (profileBtn) profileBtn.classList.remove('hidden');
        if (notificationsBtn) notificationsBtn.classList.remove('hidden');
        if (loginBtn) loginBtn.classList.add('hidden');
    } else {
        // Logged out: show only 2 buttons
        if (profileBtn) profileBtn.classList.add('hidden');
        if (notificationsBtn) notificationsBtn.classList.add('hidden');
        if (loginBtn) loginBtn.classList.remove('hidden');
    }
}

function showLiveChat() {
    if (!currentUser) {
        showNotification('Please login first', 'error');
        return;
    }
    showModal('livechat-modal');
}

function showNotifications() {
    if (!currentUser) {
        showNotification('Please login first', 'error');
        return;
    }
    showModal('notifications-modal');
}

// Authentication Functions
function showLogin() {
    showModal('login-modal');
}

function showRegister() {
    showModal('register-modal');
}

const loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const code = document.getElementById('login-code').value;
        loginUser(code);
    });
}

const registerForm = document.getElementById('register-form');
if (registerForm) {
    registerForm.addEventListener('submit', function(e) {
        e.preventDefault();
        registerUser();
    });
}



// Find the loginUser function and add 'async' before 'function':
async function loginUser(code, silentLogin = false) {
    try {
        showBuffering();
        const userQuery = await db.collection('users').where('loginCode', '==', code).get();
        
        if (userQuery.empty) {
            showNotification('Invalid login code', 'error');
            return;
        }

        const userData = userQuery.docs[0].data();
        currentUser = { id: userQuery.docs[0].id, ...userData };
        
        localStorage.setItem('userCode', code);
        updateUIForLoggedInUser();
        updateThemeBasedOnUser();
        closeModal('login-modal');
        
        // Only increase active players count for actual login, not refresh
        if (!silentLogin) {
            await updateActivePlayersCount(1);
            logActivity('login', { userId: currentUser.id });
            showNotification('Welcome back!', 'success');
        }
        
        hideBuffering();
        return currentUser;
    } catch (error) {
        console.error('Login error:', error);
        showNotification('Login failed', 'error');
        hideBuffering();
    }
}


async function updateActivePlayersCount(change) {
    try {
        const statsRef = db.collection('stats').doc('global');
        const stats = await statsRef.get();
        const currentCount = stats.exists ? (stats.data().activePlayers || 0) : 0;
        
        await statsRef.set({
            activePlayers: Math.max(0, currentCount + change),
            totalPot: stats.exists ? stats.data().totalPot || 0 : 0
        }, { merge: true });
    } catch (error) {
        console.error('Error updating active players:', error);
    }
}


async function registerUser() {
    const formData = {
        nickname: document.getElementById('nickname').value,
        displayName: document.getElementById('display-name').value,
        gender: document.getElementById('gender').value,
        currency: document.getElementById('currency').value,
        instagram: document.getElementById('instagram').value,
        profilePic: getRandomProfilePic(document.getElementById('gender').value),
        registrationDate: firebase.firestore.Timestamp.now(),
        kycStatus: 'pending',
        repScore: 'GOOD',
        balance: 0,
        debt: 0,
        totalWinnings: 0,
        totalBets: 0,
        dailyBuyinUsed: 0,
        lastBuyinReset: firebase.firestore.Timestamp.now()
    };

    try {
        showBuffering();
        
        // Generate SHA256 login code
        const loginCode = await generateSHA256(formData.nickname + Date.now());
        formData.loginCode = loginCode;

        // Check if nickname exists
        const nicknameQuery = await db.collection('users').where('nickname', '==', formData.nickname).get();
        if (!nicknameQuery.empty) {
            showNotification('Nickname already taken. Please choose another.', 'error');
            hideBuffering();
            return;
        }

        // Create user
        const docRef = await db.collection('users').add(formData);
        
        // Show login code
        document.getElementById('generated-code').value = loginCode;
        closeModal('register-modal');
        showModal('code-modal');
        
        // Log registration
        logActivity('registration', { userId: docRef.id, nickname: formData.nickname });
        
        hideBuffering();
    } catch (error) {
        console.error('Registration error:', error);
        showNotification('Registration failed', 'error');
        hideBuffering();
    }
}

async function generateSHA256(text) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/* Replace with: */
function checkLoginStatus() {
    const savedCode = localStorage.getItem('userCode');
    if (savedCode) {
        loginUser(savedCode, true).then(() => { // Pass true for silent login
            // Update EVC page UI after login
            if (window.location.pathname.includes('evc.html')) {
                updateThemeBasedOnUser();
                const loginRequiredBtn = document.getElementById('login-required');
                const walletBtn = document.getElementById('wallet-btn');
                if (loginRequiredBtn) loginRequiredBtn.classList.add('hidden');
                if (walletBtn) walletBtn.classList.remove('hidden');
            }
        });
    }
}

function updateUIForLoggedInUser() {
    const loginBtn = document.getElementById('login-btn');
    const registerBtn = document.getElementById('register-btn');
    const walletBtn = document.getElementById('wallet-btn');
    
    if (loginBtn) loginBtn.classList.add('hidden');
    if (registerBtn) registerBtn.classList.add('hidden');
    if (walletBtn) walletBtn.classList.remove('hidden');
    
    updateBalance();
}

// Modal Functions
function showModal(modalId) {
    document.getElementById(modalId).style.display = 'block';
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

// Clean up ad timer when modal closes
function cleanupAdTimer() {
    if (window.currentAdTimer) {
        clearInterval(window.currentAdTimer);
        window.currentAdTimer = null;
    }
    const claimBtn = document.getElementById('claim-reward');
    if (claimBtn) {
        claimBtn.classList.add('hidden');
    }
    const adVideo = document.getElementById('ad-video');
    if (adVideo) {
        adVideo.src = '';
    }
    const timerEl = document.getElementById('ad-timer');
    if (timerEl) {
        timerEl.textContent = '30';
    }
}

// Wallet Functions
function showWallet() {
    if (!currentUser) {
        showNotification('Please login first', 'error');
        return;
    }
    
    document.getElementById('wallet-balance').textContent = formatCurrency(currentUser.balance, currentUser.currency);
    showModal('wallet-modal');
}

function updateEVCWalletBalance() {
    const evcWalletBalance = document.getElementById('wallet-balance');
    if (evcWalletBalance && currentUser) {
        evcWalletBalance.textContent = formatCurrency(currentUser.balance, currentUser.currency);
    }
}

function updateBalance() {
    if (currentUser) {
        const balanceText = currentUser.debt > 0 ? 
            `-${formatCurrency(currentUser.debt, currentUser.currency)}` :
            formatCurrency(currentUser.balance, currentUser.currency);
        
        const balanceEl = document.getElementById('balance');
        if (balanceEl) {
            balanceEl.textContent = balanceText;
            balanceEl.style.display = 'none'; // Always hide on homepage
            if (currentUser.debt > 0) {
                balanceEl.style.color = '#ff0a54';
            }
        }
    }
}

function formatCurrency(amount, currency) {
    const symbols = { INR: '₹', USD: '$', EUR: '€' };
    return `${symbols[currency] || '₹'}${amount}`;
}

// Events and Betting Functions
async function loadEvents() {
    try {
        const eventsSnapshot = await db.collection('events').where('status', '==', 'active').get();
        events = eventsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        displayEvents();
    } catch (error) {
        console.error('Error loading events:', error);
    }
}

function displayEvents() {
    const grid = document.getElementById('events-grid');
    if (!grid) return; // Exit if element doesn't exist
    grid.innerHTML = '';
    
    events.forEach(event => {
        const eventCard = createEventCard(event);
        grid.appendChild(eventCard);
    });
}

function createEventCard(event) {
    const card = document.createElement('div');
    card.className = 'event-card';
    card.onclick = () => showEventModal(event);
    
    card.innerHTML = `
        <div class="event-image">
            <div class="event-placeholder">🎯</div>
        </div>
        <div class="event-info">
            <h3>${event.title}</h3>
            <div class="event-details">
                <span class="event-time">${formatEventTime(event.startTime)}</span>
                <span class="event-participants">${event.totalBets || 0} bets</span>
            </div>
            <div class="event-pot">
                Total Pot: ${formatCurrency(event.totalPot || 0, 'INR')}
            </div>
        </div>
    `;
    
    return card;
}

function showEventModal(event) {
    if (!currentUser) {
        showNotification('Please login to bet', 'error');
        return;
    }
    
    if (currentUser.kycStatus !== 'approved') {
        showNotification('Account awaiting approval (≤8hrs)', 'warning');
        return;
    }
    
    if (currentUser.repScore === 'BAD' || currentUser.debt > 0) {
        showNotification('Clear your debt to start betting', 'error');
        return;
    }
    
    document.getElementById('event-title').textContent = event.title;
    document.getElementById('event-time').textContent = formatEventTime(event.startTime);
    document.getElementById('event-status').textContent = event.status;
    
    showBettingTab('pool');
    showModal('event-modal');
    
    // Log event view
    logActivity('event_view', { userId: currentUser.id, eventId: event.id });
}

function showBettingTab(type) {
    const content = document.getElementById('betting-content');
    
    if (type === 'pool') {
        content.innerHTML = createPoolBettingUI();
    } else {
        content.innerHTML = create1v1BettingUI();
    }
    
    // Update tab buttons
    document.querySelectorAll('.betting-tabs .tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
}

function createPoolBettingUI() {
    return `
        <div class="pool-betting">
            <div class="betting-options">
                <div class="option-card" onclick="placeBet('team_a', 'pool')">
                    <h4>Team A</h4>
                    <div class="odds">2.1</div>
                    <div class="bet-count">45 bets</div>
                </div>
                <div class="option-card" onclick="placeBet('team_b', 'pool')">
                    <h4>Team B</h4>
                    <div class="odds">1.8</div>
                    <div class="bet-count">67 bets</div>
                </div>
            </div>
            <div class="bet-input">
                <input type="number" id="bet-amount" placeholder="Bet amount" min="1">
                <button class="primary-btn" onclick="confirmBet()">PLACE BET</button>
            </div>
        </div>
    `;
}

function create1v1BettingUI() {
    return `
        <div class="1v1-betting">
            <div class="betting-tabs-sub">
                <button class="tab-btn active" onclick="show1v1Tab('wager')">Wager Ladder</button>
                <button class="tab-btn" onclick="show1v1Tab('contract')">Contract Ladder</button>
            </div>
            <div class="price-ladder" id="price-ladder">
                ${createPriceLadder()}
            </div>
        </div>
    `;
}

function createPriceLadder() {
    return `
        <div class="ladder-header">
            <span>Wager</span>
            <span>Back Team A</span>
            <span>Back Team B</span>
        </div>
        <div class="ladder-row" onclick="placeLadderBet(100, 'team_a')">
            <span>₹100</span>
            <span class="back-btn">2.0</span>
            <span class="lay-btn">2.0</span>
        </div>
        <div class="ladder-row" onclick="placeLadderBet(200, 'team_a')">
            <span>₹200</span>
            <span class="back-btn">2.0</span>
            <span class="lay-btn">2.0</span>
        </div>
        <div class="ladder-row" onclick="placeLadderBet(500, 'team_a')">
            <span>₹500</span>
            <span class="back-btn">2.0</span>
            <span class="lay-btn">2.0</span>
        </div>
    `;
}

// EVC Functions
function goToEVC() {
    window.location.href = 'evc.html';
}

function goHome() {
    window.location.href = 'homepage.html';
}

function watchAd() {
    if (!currentUser) {
        showNotification('Please login first', 'error');
        return;
    }
    
    // Clear any existing timer
    if (window.currentAdTimer) {
        clearInterval(window.currentAdTimer);
        window.currentAdTimer = null;
    }
    
    const adUrl = adminSettings.activeAds[Math.floor(Math.random() * adminSettings.activeAds.length)];
    document.getElementById('ad-video').src = adUrl + '?autoplay=1&mute=0&controls=0';
    showModal('ad-modal');
    
    // Reset claim button
    const claimBtn = document.getElementById('claim-reward');
    claimBtn.classList.add('hidden');
    
    let timeLeft = 32; // 30 second video + 2 seconds buffer
    document.getElementById('ad-timer').textContent = timeLeft;
    
    // Start timer immediately
    window.currentAdTimer = setInterval(() => {
        timeLeft--;
        document.getElementById('ad-timer').textContent = timeLeft;
        
        if (timeLeft <= 0) {
            clearInterval(window.currentAdTimer);
            window.currentAdTimer = null;
            claimBtn.classList.remove('hidden');
        }
    }, 1000);
    
    // Log ad view
    logActivity('ad_view', { userId: currentUser.id, adUrl });
}

function claimAdReward() {
    if (!currentUser) return;
    
    const reward = adminSettings.perAdReward;
    currentUser.balance += reward;
    
    // Update in Firebase
    db.collection('users').doc(currentUser.id).update({
        balance: currentUser.balance
    });
    
    updateBalance();
    updateEVCWalletBalance();
    closeModal('ad-modal');
    showNotification(`Earned ${formatCurrency(reward, currentUser.currency)}!`, 'success');
    
    // Log reward claim
    logActivity('ad_reward_claimed', { 
        userId: currentUser.id, 
        reward,
        newBalance: currentUser.balance 
    });
}

async function showRecentEarnings() {
    if (!currentUser) {
        showNotification('Please login first', 'error');
        return;
    }
    
    try {
        // Load earnings history from activity logs
        const earningsSnapshot = await db.collection('activity_logs')
            .where('data.userId', '==', currentUser.id)
            .where('action', 'in', ['ad_reward_claimed', 'daily_bonus', 'task_completed'])
            .orderBy('timestamp', 'desc')
            .limit(50)
            .get();
        
        let earningsHTML = '<h3>Recent Earnings History</h3><div class="earnings-history">';
        let totalEarnings = 0;
        
        if (earningsSnapshot.empty) {
            earningsHTML += '<p>No earnings yet. Watch ads to start earning!</p>';
        } else {
            earningsSnapshot.docs.forEach(doc => {
                const data = doc.data();
                const timestamp = data.timestamp.toDate().toLocaleString();
                const amount = data.data.reward || data.data.bonus || data.data.amount || 0;
                totalEarnings += amount;
                
                let actionText = '';
                switch(data.action) {
                    case 'ad_reward_claimed': actionText = 'Watched Ad'; break;
                    case 'daily_bonus': actionText = 'Daily Bonus'; break;
                    case 'task_completed': actionText = 'Task Completed'; break;
                    default: actionText = data.action;
                }
                
                earningsHTML += `
                    <div class="earning-item">
                        <div class="earning-action">${actionText}</div>
                        <div class="earning-amount">+${formatCurrency(amount, currentUser.currency)}</div>
                        <div class="earning-time">${timestamp}</div>
                    </div>
                `;
            });
        }
        
        earningsHTML += `</div><div class="total-earnings">Total Earned: ${formatCurrency(totalEarnings, currentUser.currency)}</div>`;
        
        // Create and show modal
        showEarningsModal(earningsHTML);
        
    } catch (error) {
        console.error('Error loading earnings:', error);
        showNotification('Error loading earnings history', 'error');
    }
}

function showEarningsModal(content) {
    // Create modal if it doesn't exist
    let modal = document.getElementById('earnings-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'earnings-modal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <span class="close" onclick="closeModal('earnings-modal')">&times;</span>
                <div id="earnings-content"></div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    document.getElementById('earnings-content').innerHTML = content;
    showModal('earnings-modal');
}

// Profile Functions
function showProfile() {
    if (!currentUser) {
        showNotification('Please login first', 'error');
        return;
    }
    
    showModal('profile-modal');
    showTab('balance');
}

function showTab(tabName) {
    const content = document.getElementById('tab-content');
    const tabBtns = document.querySelectorAll('.tab-btn');
    
    tabBtns.forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    switch(tabName) {
        case 'balance':
            content.innerHTML = createBalanceTab();
            break;
        case 'history':
            content.innerHTML = createHistoryTab();
            break;
        case 'settings':
            content.innerHTML = createSettingsTab();
            break;
        case 'notifications':
            content.innerHTML = createNotificationsTab();
            break;
        case 'complaints':
            content.innerHTML = createComplaintsTab();
            break;
        case 'slips':
            content.innerHTML = createSlipsTab();
            break;
    }
}

function createBalanceTab() {
    const debtDisplay = currentUser.debt > 0 ? 
        `<div class="debt-warning">Debt: ${formatCurrency(currentUser.debt, currentUser.currency)}</div>` : '';
    
    return `
        <div class="balance-tab">
            <div class="profile-pic-display">
                <img src="${currentUser.profilePic || getRandomProfilePic(currentUser.gender)}" alt="Profile" class="profile-image ${currentUser.gender}">
            </div>
            <div class="balance-info">
                <h3>Current Balance</h3>
                <div class="balance-amount">${formatCurrency(currentUser.balance, currentUser.currency)}</div>
                ${debtDisplay}
                <div class="rep-score ${currentUser.repScore.toLowerCase()}">
                    Rep Score: ${currentUser.repScore}
                </div>
            </div>
            <div class="balance-stats">
                <div class="stat">
                    <label>Total Winnings:</label>
                    <span>${formatCurrency(currentUser.totalWinnings || 0, currentUser.currency)}</span>
                </div>
                <div class="stat">
                    <label>Total Bets:</label>
                    <span>${currentUser.totalBets || 0}</span>
                </div>
            </div>
        </div>
    `;
}

function createSettingsTab() {
    return `
        <div class="settings-tab">
            <div class="setting-item">
                <label for="display-name-change">Display Name:</label>
                <input type="text" id="display-name-change" value="${currentUser.displayName}">
                <button onclick="updateDisplayName()">UPDATE</button>
            </div>
            <div class="setting-item">
                <label for="currency-change">Currency:</label>
                <select id="currency-change">
                    <option value="INR" ${currentUser.currency === 'INR' ? 'selected' : ''}>₹ INR</option>
                    <option value="USD" ${currentUser.currency === 'USD' ? 'selected' : ''}>$ USD</option>
                    <option value="EUR" ${currentUser.currency === 'EUR' ? 'selected' : ''}>€ EUR</option>
                </select>
                <button onclick="updateCurrency()">UPDATE</button>
            </div>
            <div class="setting-item">
                <label>Current Profile Picture:</label>
                <img src="${currentUser.profilePic}" alt="Profile" class="current-profile-pic">
                <button onclick="changeProfilePic()">CHANGE PICTURE</button>
            </div>
            <div class="setting-item">
                <button class="danger-btn" onclick="logout()">LOGOUT</button>
            </div>
        </div>
    `;
}

function changeProfilePic() {
    const newPic = getRandomProfilePic(currentUser.gender);
    
    // Update in Firebase
    db.collection('users').doc(currentUser.id).update({
        profilePic: newPic
    }).then(() => {
        currentUser.profilePic = newPic;
        showNotification('Profile picture updated!', 'success');
        // Refresh settings tab
        showTab('settings');
    }).catch(error => {
        console.error('Error updating profile pic:', error);
        showNotification('Failed to update profile picture', 'error');
    });
}

function createNotificationsTab() {
    return `
        <div class="notifications-tab">
            <div class="notification-item">
                <div class="notification-content">
                    <h4>Welcome to PredictKing!</h4>
                    <p>Start betting and earning rewards.</p>
                    <span class="notification-time">2 hours ago</span>
                </div>
            </div>
        </div>
    `;
}

function createComplaintsTab() {
    return `
        <div class="complaints-tab">
            <p>For complaints and support, contact us via Telegram:</p>
            <button class="primary-btn" onclick="openTelegram()">CONTACT SUPPORT</button>
        </div>
    `;
}

function createHistoryTab() {
    return `
        <div class="history-tab">
            <h3>Betting History</h3>
            <div class="history-content">
                <div class="history-item">
                    <p>No betting history available yet.</p>
                    <p>Start placing bets to see your history here!</p>
                </div>
            </div>
        </div>
    `;
}

function createSlipsTab() {
    return `
        <div class="slips-tab">
            <div class="slip-item">
                <div class="slip-info">
                    <h4>Event: Sample Match</h4>
                    <p>Bet: ₹100 on Team A</p>
                    <span class="slip-status queued">QUEUED</span>
                </div>
            </div>
        </div>
    `;
}

// Leaderboard Functions
function showLeaderboard() {
    loadLeaderboard();
    showModal('leaderboard-modal');
}

async function loadLeaderboard() {
    try {
        const usersSnapshot = await db.collection('users')
            .orderBy('totalWinnings', 'desc')
            .limit(50)
            .get();
        
        const leaderboardEl = document.getElementById('leaderboard');
        leaderboardEl.innerHTML = '';
        
        usersSnapshot.docs.forEach((doc, index) => {
            const user = doc.data();
            const position = index + 1;
            
            const row = document.createElement('div');
            row.className = 'leaderboard-row';
            row.innerHTML = `
                <span class="position">#${position}</span>
                <img src="${user.profilePic || getRandomProfilePic(user.gender)}" alt="Profile" class="leaderboard-pic ${user.gender}">
                <span class="name">${user.displayName}</span>
                <span class="winnings">${formatCurrency(user.totalWinnings || 0, user.currency)}</span>
                <span class="bets">${user.totalBets || 0}</span>
                <span class="rep-score ${user.repScore.toLowerCase()}">${user.repScore}</span>
            `;
            
            leaderboardEl.appendChild(row);
        });
    } catch (error) {
        console.error('Error loading leaderboard:', error);
    }
}

// Buy-in Functions
function showBuyIn() {
    showModal('buyin-modal');
}

function testBuyIn() {
    const amount = parseInt(document.getElementById('buyin-amount').value);
    if (!amount || amount <= 0) {
        showNotification('Enter valid amount', 'error');
        return;
    }
    
    if (currentUser.dailyBuyinUsed + amount > adminSettings.dailyBuyinLimit) {
        showNotification('Daily buy-in limit reached. Watch an ad to reset.', 'warning');
        return;
    }
    
    currentUser.balance += amount;
    currentUser.dailyBuyinUsed += amount;
    
    // Update in Firebase
    db.collection('users').doc(currentUser.id).update({
        balance: currentUser.balance,
        dailyBuyinUsed: currentUser.dailyBuyinUsed
    });
    
    updateBalance();
    closeModal('buyin-modal');
    showNotification(`Added ${formatCurrency(amount, currentUser.currency)} to wallet!`, 'success');
    
    // Log buy-in
    logActivity('buyin', { userId: currentUser.id, amount, method: 'test' });
}

// Stats and Real-time Updates
async function loadStats() {
    try {
        const stats = await db.collection('stats').doc('global').get();
        if (stats.exists) {
            const data = stats.data();
            
            // Update main stats
            const activePlayersEl = document.getElementById('active-players');
            const totalPotEl = document.getElementById('total-pot');
            if (activePlayersEl) activePlayersEl.textContent = data.activePlayers || 0;
            if (totalPotEl) totalPotEl.textContent = formatCurrency(data.totalPot || 0, 'INR');
            
            // Update sticky stats for logged out mode
            const activePlayersStickyEl = document.getElementById('active-players-sticky');
            const totalPotStickyEl = document.getElementById('total-pot-sticky');
            if (activePlayersStickyEl) activePlayersStickyEl.textContent = data.activePlayers || 0;
            if (totalPotStickyEl) totalPotStickyEl.textContent = formatCurrency(data.totalPot || 0, 'INR');
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

function startRealTimeUpdates() {
    // Update stats every 30 seconds
    setInterval(loadStats, 30000);
    
    // Update events every minute
    setInterval(loadEvents, 60000);
}

// Utility Functions
function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    const text = document.getElementById('notification-text');
    
    text.textContent = message;
    notification.className = `notification ${type}`;
    notification.style.transform = 'translateX(-100%)';
    notification.classList.remove('hidden');
    
    // Slide in from left
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 10);
    
    // Slide out to right after 2 seconds
    setTimeout(() => {
        notification.style.transform = 'translateX(100vw)';
        setTimeout(() => {
            notification.classList.add('hidden');
            notification.style.transform = 'translateX(-100%)';
        }, 300);
    }, 2000);
}

function showBuffering() {
    // Add buffering indicator
    document.body.classList.add('loading');
}

function hideBuffering() {
    document.body.classList.remove('loading');
}

function formatEventTime(timestamp) {
    if (!timestamp) return 'TBD';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString();
}

function copyCode() {
    const codeInput = document.getElementById('generated-code');
    codeInput.select();
    document.execCommand('copy');
    showNotification('Code copied to clipboard!', 'success');
}

function downloadCode() {
    const code = document.getElementById('generated-code').value;
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(code));
    element.setAttribute('download', 'predictking-login-code.txt');
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}

function logout() {
    updateActivePlayersCount(-1); // Decrease count
    currentUser = null;
    localStorage.removeItem('userCode');
    setTheme('default');
    
    // Update UI
    document.getElementById('login-btn').classList.remove('hidden');
    document.getElementById('register-btn').classList.remove('hidden');
    document.getElementById('wallet-btn').classList.add('hidden');
    
    closeModal('profile-modal');
    showNotification('Logged out successfully', 'success');
}

// Activity Logging
async function logActivity(action, data) {
    try {
        await db.collection('activity_logs').add({
            action,
            data,
            timestamp: firebase.firestore.Timestamp.now(),
            userAgent: navigator.userAgent,
            ip: 'client-side' // IP will be logged server-side in production
        });
    } catch (error) {
        console.error('Error logging activity:', error);
    }
}

// Daily Bonus
function claimDailyBonus() {
    if (!currentUser) return;
    
    const lastClaim = currentUser.lastDailyBonus;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    if (lastClaim && lastClaim.toDate() >= today) {
        showNotification('Daily bonus already claimed!', 'warning');
        return;
    }
    
    const bonus = 100; // Daily bonus amount
    currentUser.balance += bonus;
    currentUser.lastDailyBonus = firebase.firestore.Timestamp.now();
    
    // Update in Firebase
    db.collection('users').doc(currentUser.id).update({
        balance: currentUser.balance,
        lastDailyBonus: currentUser.lastDailyBonus
    });
    
    updateBalance();
    showNotification(`Daily bonus claimed: ${formatCurrency(bonus, currentUser.currency)}!`, 'success');
    
    // Log daily bonus
    logActivity('daily_bonus', { userId: currentUser.id, bonus });
}

// Close modals when clicking outside
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
}
