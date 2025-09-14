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


// Viewport monitoring for mobile-only access
function checkViewportSize() {
    if (window.innerWidth > 768) {
        // Show mobile-only message if window gets resized to desktop size
        document.body.innerHTML = `
            <div style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: linear-gradient(135deg, #141414, #1a1a1a);
                color: #FFF3DA;
                font-family: 'Orbitron', monospace;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                text-align: center;
                padding: 2rem;
                z-index: 10000;
            ">
                <div style="font-size: 4rem; margin-bottom: 2rem;">â™›</div>
                <h1 style="font-size: 3rem; font-weight: 900; margin-bottom: 1rem; letter-spacing: 2px;">PREDICTKING</h1>
                <h2 style="font-size: 1.5rem; margin-bottom: 2rem; color: #888;">Please Use Mobile Device</h2>
                <p style="font-size: 1.1rem; max-width: 500px; line-height: 1.6;">
                    This application is optimized for mobile devices only. Please access from your smartphone or resize your browser window to mobile view.
                </p>
            </div>
        `;
    }
}

// Monitor viewport changes
window.addEventListener('resize', checkViewportSize);

// Profile picture defaults with working URLs
const defaultProfilePics = {
    male: [
        "https://api.dicebear.com/7.x/avataaars/svg?seed=male1&backgroundColor=b6e3f4",
        "https://api.dicebear.com/7.x/avataaars/svg?seed=male2&backgroundColor=c0aede",
        "https://api.dicebear.com/7.x/avataaars/svg?seed=male3&backgroundColor=d1d4f9",
        "https://api.dicebear.com/7.x/avataaars/svg?seed=male4&backgroundColor=ffd93d",
        "https://api.dicebear.com/7.x/avataaars/svg?seed=male5&backgroundColor=ffb3ba"
    ],
    female: [
        "https://api.dicebear.com/7.x/avataaars/svg?seed=female1&backgroundColor=ffb3ba",
        "https://api.dicebear.com/7.x/avataaars/svg?seed=female2&backgroundColor=ffdfba",
        "https://api.dicebear.com/7.x/avataaars/svg?seed=female3&backgroundColor=ffffba",
        "https://api.dicebear.com/7.x/avataaars/svg?seed=female4&backgroundColor=baffc9",
        "https://api.dicebear.com/7.x/avataaars/svg?seed=female5&backgroundColor=bae1ff"
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

// Handle file upload for profile pictures
function handleProfilePicUpload(file, gender) {
    return new Promise((resolve) => {
        if (!file) {
            // If no file uploaded, use random default
            resolve(getRandomProfilePic(gender));
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            // Convert to base64 and resolve
            resolve(e.target.result);
        };
        reader.readAsDataURL(file);
    });
}

document.addEventListener('DOMContentLoaded', function() {
    // Double-check mobile access
    if (!isMobileDevice()) {
        return; // Exit if not mobile
    }
    
    // Initialize collections
    initializeCollections();
    
    // Check if we're on EVC page
    if (window.location.pathname.includes('evc.html')) {
        showEVCLoadingScreen();
        
        // Ensure everything loads before showing page
        Promise.all([
            checkLoginStatus(),
            new Promise(resolve => setTimeout(resolve, 3000)) // Minimum 3 seconds
        ]).then(() => {
            updateThemeBasedOnUser();
            hideEVCLoadingScreen();
            showPostRefreshWelcomeMessage(); // ADD this line
        });
        return;
    }
    
    // Check if elements exist before using them
    if (document.getElementById('loading-screen')) {
        showLoadingScreen();
    }
    
    // Ensure everything loads before showing page
    Promise.all([
        checkLoginStatus(),
        loadEvents(),
        loadStats(),
        new Promise(resolve => {
            // Wait for actual loading completion
            let completed = 0;
            const checkProgress = () => {
                completed += 25;
                if (completed >= 100) {
                    setTimeout(resolve, 500); // Small delay after completion
                } else {
                    setTimeout(checkProgress, 750); // Staggered progress
                }
            };
            checkProgress();
        })
    ]).then(() => {
        if (document.getElementById('loading-screen')) {
            hideLoadingScreen();
        }
        updateThemeBasedOnUser();
        startRealTimeUpdates();
        showPostRefreshWelcomeMessage(); // ADD this line
    });
});


async function loadUserNotifications() {
    if (!currentUser) return [];

    try {
        const snapshot = await db
            .collection("notifications")
            .where("userId", "==", currentUser.id)
            .orderBy("timestamp", "desc")
            .limit(50)
            .get();


        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Error loading notifications:", error);
        return [];
    }
}



// Add mobile detection function
function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
           window.innerWidth <= 768;
}

// Loading Screen Functions
function showLoadingScreen() {
    document.getElementById('loading-screen').style.display = 'flex';
    document.getElementById('main-app').classList.add('hidden');
}

function hideLoadingScreen() {
    document.getElementById('loading-screen').style.display = 'none';
    document.getElementById('main-app').classList.remove('hidden');
}

function showEVCLoadingScreen() {
    const loadingScreen = document.getElementById('evc-loading-screen');
    if (loadingScreen) {
        loadingScreen.style.display = 'flex';
        document.getElementById('main-app').classList.add('hidden');
    }
}

function hideEVCLoadingScreen() {
    const loadingScreen = document.getElementById('evc-loading-screen');
    if (loadingScreen) {
        loadingScreen.style.display = 'none';
        document.getElementById('main-app').classList.remove('hidden');
    }
}

function showLiveChat() {
    if (!currentUser) {
        showNotification('Please login to access live chat', 'error');
        return;
    }
    
    // Create and show coming soon modal
    let modal = document.getElementById('live-chat-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'live-chat-modal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <span class="close" onclick="closeModal('live-chat-modal')">&times;</span>
                <h2>LIVE CHAT</h2>
                <div style="text-align: center; padding: 2rem;">
                    <p style="font-size: 1.2rem; margin-bottom: 2rem;">Coming Soon!</p>
                    <p>Live chat feature is under development.</p>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    showModal('live-chat-modal');
}

function showNotifications() {
    if (!currentUser) {
        showNotification('Please login first', 'error');
        return;
    }
    
    // Create and show notifications modal with same content as profile notifications tab
    let modal = document.getElementById('notifications-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'notifications-modal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <span class="close" onclick="closeModal('notifications-modal')">&times;</span>
                <h2>NOTIFICATIONS</h2>
                <div class="notifications-tab">
                    <div class="notification-item">
                        <div class="notification-content">
                            <h4>Welcome to PredictKing!</h4>
                            <p>Start betting and earning rewards.</p>
                            <span class="notification-time">2 hours ago</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    showModal('notifications-modal');
}

function openNotificationModal(notificationText, notificationTitle = "Notification") {
    // Fade the profile modal
    const profileModal = document.getElementById('profile-modal');
    if (profileModal && profileModal.style.display !== 'none') {
        profileModal.classList.add('faded');
    }
    
    // Create notification modal
    let modal = document.getElementById('notification-detail-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'notification-detail-modal';
        modal.className = 'modal notification-modal';
        modal.innerHTML = `
            <div class="modal-content notification-modal-content">
                <span class="close" onclick="closeNotificationModal()">&times;</span>
                <h2 id="notification-detail-title"></h2>
                <div id="notification-detail-content"></div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    document.getElementById('notification-detail-title').textContent = notificationTitle;
    document.getElementById('notification-detail-content').textContent = notificationText;
    showModal('notification-detail-modal');
}

function closeNotificationModal() {
    const profileModal = document.getElementById('profile-modal');
    if (profileModal) {
        profileModal.classList.remove('faded');
    }
    closeModal('notification-detail-modal');
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
        // Show logged out buttons, hide logged in buttons
        const loggedOutBtns = document.querySelector('.header-buttons:not(.logged-in-buttons)');
        const loggedInBtns = document.querySelector('.logged-in-buttons');
        if (loggedOutBtns) loggedOutBtns.classList.remove('hidden');
        if (loggedInBtns) loggedInBtns.classList.add('hidden');
    } else {
        // Hide logged out buttons, show logged in buttons
        const loggedOutBtns = document.querySelector('.header-buttons:not(.logged-in-buttons)');
        const loggedInBtns = document.querySelector('.logged-in-buttons');
        if (loggedOutBtns) loggedOutBtns.classList.add('hidden');
        if (loggedInBtns) loggedInBtns.classList.remove('hidden');
        
        if (currentUser.gender === 'male') {
            setTheme('male');
        } else if (currentUser.gender === 'female') {
            setTheme('female');
        }
    }
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
        // Set flag to refresh after manual login AND store welcome message flag
        window.shouldRefreshAfterLogin = true;
        localStorage.setItem('showWelcomeMessage', 'true');
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

// ADD THE PROFILE PICTURE HANDLER HERE:
// Profile picture upload handler
const profilePicInput = document.getElementById('profile-pic');
if (profilePicInput) {
    profilePicInput.addEventListener('change', function() {
        const file = this.files[0];
        const button = document.querySelector('.file-upload-btn');
        
        if (file) {
            button.textContent = `📷 ${file.name}`;
            button.style.color = 'var(--primary-color)';
        } else {
            button.textContent = '📷 Upload Profile Picture';
            button.style.color = '';
        }
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
            // Store flag to show welcome message after refresh
            localStorage.setItem('showWelcomeMessage', 'true');
        }
        
        hideBuffering();
        
        // Refresh page after successful login if needed
        if (window.shouldRefreshAfterLogin || !silentLogin) {
            setTimeout(() => {
                window.shouldRefreshAfterLogin = false; // Reset flag
                window.location.reload();
            }, 300); // Faster refresh
        }
        
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
    const gender = document.getElementById('gender').value;
    const profilePicFile = document.getElementById('profile-pic').files[0];
    
    // Handle profile picture
    const profilePic = await handleProfilePicUpload(profilePicFile, gender);
    
    const formData = {
        nickname: document.getElementById('nickname').value,
        displayName: document.getElementById('display-name').value,
        gender: gender,
        instagram: document.getElementById('instagram').value,
        profilePic: profilePic,
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
        
        // Generate SHA256 login code with better error handling
        let loginCode;
        try {
            loginCode = await generateSHA256(formData.nickname + Date.now());
        } catch (hashError) {
            console.error('Hash generation error:', hashError);
            // Fallback to simpler hash if crypto.subtle fails
            loginCode = btoa(formData.nickname + Date.now() + Math.random()).replace(/[^a-zA-Z0-9]/g, '').substring(0, 32);
        }
        formData.loginCode = loginCode;

        // Check if nickname exists
        const nicknameQuery = await db.collection('users').where('nickname', '==', formData.nickname).get();
        if (!nicknameQuery.empty) {
            showNotification('Nickname already exists', 'error');
            hideBuffering();
            return;
        }

        // Create user
        const docRef = await db.collection('users').add(formData);
        
        // Store user ID for later reference
        window.currentUserId = docRef.id;
        
        // Store login code in browser storage immediately
        localStorage.setItem('userCode', loginCode);
        localStorage.setItem('savedUsername', formData.nickname);
        localStorage.setItem('userSHA256', loginCode); // Store for profile access
        
        // Store in cookies as backup (expires in 1 year)
        const expiryDate = new Date();
        expiryDate.setFullYear(expiryDate.getFullYear() + 1);
        document.cookie = `predictking_code=${loginCode}; expires=${expiryDate.toUTCString()}; path=/; SameSite=Lax`;
        document.cookie = `predictking_username=${formData.nickname}; expires=${expiryDate.toUTCString()}; path=/; SameSite=Lax`;
        
        // Show login code modal
        document.getElementById('generated-code').value = loginCode;
        closeModal('register-modal');
        showModal('code-modal');
        
        // Set registration variables but DON'T auto-login
        window.registrationInProgress = true;
        window.currentRegistrationCode = loginCode;
        window.currentRegistrationUsername = formData.nickname;
        
        // Log registration
        logActivity('registration', { userId: docRef.id, nickname: formData.nickname });
        
        // Trigger browser password save after modal is shown - this should prompt save dialog
        setTimeout(() => {
            triggerPasswordSaveForRegistration(formData.nickname, loginCode);
        }, 1500);
        
        hideBuffering();
        showNotification('Account created successfully! IMPORTANT: Save your login code now!', 'success');
        
    } catch (error) {
        console.error('Registration error:', error);
        showNotification('Registration failed. Please try again.', 'error');
        hideBuffering();
    }
}

// ADD this new function after registerUser:
function triggerPasswordSave(username, password) {
    // Don't interfere with registration process
    if (window.registrationInProgress) {
        return;
    }
    
    // Use the enhanced registration function for consistency
    triggerPasswordSaveForRegistration(username, password);
}

async function generateSHA256(text) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Make sure this is called after login check
function updateLayoutBasedOnLoginStatus() {
    if (currentUser) {
        showLoggedInLayout();
    } else {
        showLoggedOutLayout();
    }
}

// Call this in your checkLoginStatus success callback
function checkLoginStatus() {
    return new Promise((resolve) => {
        const savedCode = localStorage.getItem('userCode');
        if (savedCode) {
            loginUser(savedCode, true)  // silent login - no refresh
                .then(() => { 
                    updateLayoutBasedOnLoginStatus();
                    resolve();
                })
                .catch(() => {
                    updateLayoutBasedOnLoginStatus();
                    resolve();
                });
        } else {
            updateLayoutBasedOnLoginStatus();
            resolve();
        }
    });
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
    const modal = document.getElementById(modalId);
    modal.style.display = 'block';
    // Remove any animation classes to ensure no animation
    const modalContent = modal.querySelector('.modal-content');
    if (modalContent) {
        modalContent.classList.remove('slide-out');
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        
        // Stop ad video if closing ad modal
        if (modalId === 'ad-modal') {
            cleanupAdTimer();
        }
        
        // Clean up any animation classes
        const modalContent = modal.querySelector('.modal-content');
        if (modalContent) {
            modalContent.classList.remove('slide-out');
        }
    }
}

// Clean up ad timer when modal closes
function cleanupAdTimer() {
    if (window.currentAdTimer) {
        clearInterval(window.currentAdTimer);
        window.currentAdTimer = null;
        
        // If timer was running and modal closes early, it's just a click, not a view
        // ad_click was already logged, ad_view will NOT be logged
    }
    const claimBtn = document.getElementById('claim-reward');
    if (claimBtn) {
        claimBtn.classList.add('hidden');
    }
    const adVideo = document.getElementById('ad-video');
    if (adVideo) {
        adVideo.src = 'about:blank';
        adVideo.remove();
        const adContainer = document.querySelector('.ad-container');
        if (adContainer) {
            const newIframe = document.createElement('iframe');
            newIframe.id = 'ad-video';
            newIframe.width = '100%';
            newIframe.height = '300';
            newIframe.frameBorder = '0';
            newIframe.allowFullscreen = true;
            newIframe.allow = 'autoplay; fullscreen';
            adContainer.appendChild(newIframe);
        }
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
    
    const walletBalance = currentUser.balance - currentUser.debt;
    const balanceEl = document.getElementById('wallet-balance');
    
    balanceEl.textContent = formatCurrency(walletBalance);
    
    // Set color based on wallet balance
    if (walletBalance < 0) {
        balanceEl.style.color = '#ffc857'; // Debt color
    } else {
        balanceEl.style.color = 'var(--primary-color)'; // Theme color
    }
    
    showModal('wallet-modal');
}

function updateEVCWalletBalance() {
    const evcWalletBalance = document.getElementById('wallet-balance');
    if (evcWalletBalance && currentUser) {
        const walletBalance = currentUser.balance - currentUser.debt;
        evcWalletBalance.textContent = formatCurrency(walletBalance);
        
        // Set color based on wallet balance
        if (walletBalance < 0) {
            evcWalletBalance.style.color = '#ffc857'; // Debt color
        } else {
            evcWalletBalance.style.color = 'var(--primary-color)'; // Theme color
        }
    }
}

function updateBalance() {
    if (currentUser) {
        const walletBalance = currentUser.balance - currentUser.debt;
        const balanceText = formatCurrency(walletBalance);
        
        const balanceEl = document.getElementById('balance');
        if (balanceEl) {
            balanceEl.textContent = balanceText;
            balanceEl.style.display = 'none'; // Always hide on homepage
            
            // Set color based on wallet balance
            if (walletBalance < 0) {
                balanceEl.style.color = '#ffc857'; // Debt color
            } else {
                balanceEl.style.color = 'var(--primary-color)'; // Theme color
            }
        }
    }
}

// Quero (₮Ξ) - Universal currency for PredictKing
// Etymology: "Quero" derives from Latin "quaero" meaning "I seek/desire"
// symbolizing the player's quest for victory and rewards in prediction gaming
function formatCurrency(amount) {
    const flooredAmount = Math.floor(amount); // Floor the amount to remove decimals
    return `₮Ξ${flooredAmount}`;
}

// ADD this function after formatCurrency:
function checkUserDebt() {
    if (!currentUser) return false;
    
    const walletBalance = currentUser.balance - currentUser.debt;
    return walletBalance < 0; // Returns true if user is in debt
}

function showAmberNotification(message) {
    const notification = document.getElementById('notification');
    const text = document.getElementById('notification-text');
    
    // Clear any existing timers
    if (window.notificationTimer) {
        clearTimeout(window.notificationTimer);
    }
    if (window.notificationHideTimer) {
        clearTimeout(window.notificationHideTimer);
    }
    
    text.textContent = message;
    notification.className = 'notification warning'; // Use warning class for amber color
    
    // Swoosh animation from left to right
    notification.classList.remove('hidden', 'hide');
    notification.classList.add('show');
    
    // Set timers with proper cleanup
    window.notificationTimer = setTimeout(() => {
        notification.classList.remove('show');
        notification.classList.add('hide');
        
        window.notificationHideTimer = setTimeout(() => {
            notification.classList.add('hidden');
            notification.classList.remove('hide');
            window.notificationTimer = null;
            window.notificationHideTimer = null;
        }, 600);
    }, 3000); // Longer display time for debt warning
}

async function settleDebtAutomatically(userId, amountToAdd) {
    try {
        const userRef = db.collection('users').doc(userId);
        const userDoc = await userRef.get();
        const userData = userDoc.data();
        
        const currentBalance = userData.balance || 0;
        const currentDebt = userData.debt || 0;
        
        if (currentDebt > 0) {
            const totalAvailable = currentBalance + amountToAdd;
            
            if (totalAvailable >= currentDebt) {
                // Can settle all debt
                const remainingBalance = totalAvailable - currentDebt;
                await userRef.update({
                    balance: Math.floor(remainingBalance),
                    debt: 0
                });
                
                showNotification(`Debt of ${formatCurrency(currentDebt, userData.currency)} settled! Remaining balance: ${formatCurrency(remainingBalance, userData.currency)}`, 'success');
                
                return { balance: Math.floor(remainingBalance), debt: 0 };
            } else {
                // Partial debt settlement
                const remainingDebt = currentDebt - totalAvailable;
                await userRef.update({
                    balance: 0,
                    debt: Math.floor(remainingDebt)
                });
                
                showNotification(`Partial debt settlement: ${formatCurrency(totalAvailable, userData.currency)} applied. Remaining debt: ${formatCurrency(remainingDebt, userData.currency)}`, 'info');
                
                return { balance: 0, debt: Math.floor(remainingDebt) };
            }
        } else {
            // No debt, just add to balance
            const newBalance = currentBalance + amountToAdd;
            await userRef.update({
                balance: Math.floor(newBalance)
            });
            
            return { balance: Math.floor(newBalance), debt: 0 };
        }
    } catch (error) {
        console.error('Error settling debt:', error);
        throw error;
    }
}

// Events and Betting Functions
async function loadEvents() {
    try {
        const eventsSnapshot = await db.collection('events')
            .where('display_status', '==', 'visible')
            .get();
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
    
    const backgroundImage = event.backgroundImage || 'https://picsum.photos/seed/picsum/200/300';
    const profilePic = event.profilePic || 'https://picsum.photos/id/237/200/300';
    
    card.innerHTML = `
        <div class="event-background" style="background-image: url('${backgroundImage}')"></div>
        <img src="${profilePic}" alt="Event Profile" class="event-profile-pic">
        <div class="event-content">
            <div class="event-spacer"></div>
            <div class="event-info">
                <h3>${event.title}</h3>
                <div class="event-details">
                    <span class="event-time">${formatEventTime(event.startTime)}</span>
                    <span class="event-participants">${event.totalBets || 0} bets</span>
                    ${event.status === 'settled' && event.winner ? 
                        `<div class="event-winner" style="color: var(--primary-color); font-weight: bold; margin-top: 4px;">${event.winner} WON</div>` : ''}
            </div>
            <div class="event-pot">
                Total Pot: ${formatCurrency(event.totalPot || 0)}
            </div>
        </div>
    `;
    
    return card;
}

// REPLACE the showEventModal function with this improved version:
async function showEventModal(event) {
    if (!currentUser) {
        showNotification('Please login to bet', 'error');
        return;
    }
    
    // Check if user is in debt FIRST
    if (checkUserDebt()) {
        showAmberNotification('Clear your debt first!');
        
        // Show debt resolution modal instead of event modal
        showDebtResolutionModal();
        return;
    }
    
    window.currentEventId = event.id;
    
    const now = new Date();
    const eventStart = event.startTime ? event.startTime.toDate() : new Date(0);
    const hasStarted = now > eventStart;
    
    // Check if user has wagered on this event
    const userHasWagered = await userHadBetOnEvent(event.id);
    
    let vfrButton = '';
    let bettingContent = '';
    let statusDisplay = '';
    
    // Handle any status - not just 'settled'
    if (event.status === 'settled' && event.winner) {
        // Show winner in theme color
        statusDisplay = `<span style="color: var(--primary-color); font-weight: bold;">${event.winner} WON</span>`;
        bettingContent = `
            <div class="event-settled">
                <h3>Event Settled</h3>
                <p>This event has ended and betting is closed.</p>
                <div class="winner-announcement" style="color: var(--primary-color); font-size: 1.2rem; font-weight: bold; margin: 1rem 0;">
                    🏆 ${event.winner} WON
                </div>
            </div>
        `;
    } else if (event.status !== 'active') {
        // Handle other statuses (cancelled, postponed, etc.)
        statusDisplay = `<span style="color: #ffc857; font-weight: bold;">${event.status.toUpperCase()}</span>`;
        bettingContent = `
            <div class="event-not-active">
                <h3>Event Status: ${event.status.toUpperCase()}</h3>
                <p>Betting is currently not available for this event.</p>
            </div>
        `;
    } else {
        // Active event - show normal betting interface
        statusDisplay = 'ACTIVE';
        
        if (currentUser.kycStatus !== 'approved') {
            bettingContent = `
                <div class="kyc-required">
                    <h3>Account Approval Required</h3>
                    <p>Your account is awaiting approval (~8hrs)</p>
                </div>
            `;
        } else if (currentUser.balance - currentUser.debt <= 0) {
            bettingContent = `
                <div class="insufficient-balance">
                    <h3>Insufficient Balance</h3>
                    <p>Add funds to your wallet to start betting</p>
                </div>
            `;
        } else {
            if (hasStarted && userHasWagered) {
                vfrButton = `<button class="vfr-btn" onclick="showVFRModal('${event.id}')">VOTE FOR RESULT</button>`;
            }
            
            bettingContent = `
                <div class="betting-tabs">
                    <button class="tab-btn" onclick="showBettingTab('pool')">Pool Betting</button>
                    <button class="tab-btn" onclick="showBettingTab('1v1')">1v1 Betting</button>
                </div>
                <div id="betting-content">
                    <div class="select-betting-type">
                        <h3>Select Betting Type</h3>
                        <p>Please select Pool Betting or 1v1 Betting to continue</p>
                    </div>
                </div>
            `;
        }
    }
    
    document.getElementById('event-modal').querySelector('.modal-content').innerHTML = `
        <span class="close" onclick="closeModal('event-modal')">&times;</span>
        <h2 id="event-title">${event.title}</h2>
        <p>Start Time: <span id="event-time">${formatEventTime(event.startTime)}</span></p>
        <p>Status: <span id="event-status">${statusDisplay}</span></p>
        ${vfrButton}
        ${bettingContent}
    `;
    
    showModal('event-modal');
    logActivity('event_view', { userId: currentUser.id, eventId: event.id });
}

// ADD this new function after showEventModal:
function showDebtResolutionModal() {
    const debtAmount = currentUser.debt;
    
    let modal = document.getElementById('debt-resolution-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'debt-resolution-modal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <span class="close" onclick="closeModal('debt-resolution-modal')">&times;</span>
                <h2 style="color: #ffc857;">Clear Your Debt First!</h2>
                <div class="debt-info" style="background: rgba(255, 200, 87, 0.1); padding: 1.5rem; border-radius: 8px; margin: 1rem 0;">
                    <h3 style="color: #ffc857; margin-bottom: 1rem;">Outstanding Debt</h3>
                    <div style="font-size: 1.5rem; font-weight: bold; color: #ffc857; margin-bottom: 1rem;">
                        ${formatCurrency(debtAmount)}
                    </div>
                    <p style="color: #FFF3DA; margin-bottom: 1.5rem;">
                        You cannot place bets while you have outstanding debt. Please clear your debt to continue wagering.
                    </p>
                    <div class="debt-resolution-buttons">
                        <button class="primary-btn" onclick="closeModal('debt-resolution-modal'); watchAdForDebtClear();" style="margin-right: 1rem;">
                            WATCH ADS
                        </button>
                        <button class="secondary-btn" onclick="closeModal('debt-resolution-modal'); showBuyIn();">
                            BUY IN
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    } else {
        // Update debt amount in existing modal
        const debtAmountEl = modal.querySelector('.debt-info div');
        if (debtAmountEl) {
            debtAmountEl.textContent = formatCurrency(debtAmount);
        }
    }
    
    showModal('debt-resolution-modal');
}

function watchAdForDebtClear() {
    if (!currentUser) {
        showNotification('Please login first', 'error');
        return;
    }
    
    // Set flag to track this is for debt clearing
    window.adPurpose = 'debt_clear';
    
    if (window.currentAdTimer) {
        clearInterval(window.currentAdTimer);
        window.currentAdTimer = null;
    }
    
    const iframe = document.getElementById('ad-video');
    if (!iframe) {
        console.error('Ad video iframe not found');
        showNotification('Ad system error. Please try again.', 'error');
        return;
    }
    
    const adUrl = adminSettings.activeAds[Math.floor(Math.random() * adminSettings.activeAds.length)];
    iframe.src = adUrl + '?autoplay=1&controls=0&disablekb=1&modestbranding=1&rel=0&enablejsapi=1';
    iframe.style.pointerEvents = 'none';
    iframe.allow = 'autoplay; fullscreen';
    
    showModal('ad-modal');
    
    // Log ad_click immediately when modal opens
    logActivity('ad_click', { userId: currentUser.id, adUrl, purpose: 'debt_clear' });
    
    const claimBtn = document.getElementById('claim-reward');
    if (claimBtn) {
        claimBtn.classList.add('hidden');
    }
    
    let timeLeft = 32;
    const timerEl = document.getElementById('ad-timer');
    if (timerEl) {
        timerEl.textContent = timeLeft;
    }
    
    window.currentAdTimer = setInterval(() => {
        timeLeft--;
        if (timerEl) {
            timerEl.textContent = timeLeft;
        }
        
        if (timeLeft <= 0) {
            clearInterval(window.currentAdTimer);
            window.currentAdTimer = null;
            if (claimBtn) {
                claimBtn.classList.remove('hidden');
            }
            
            // Log ad_view only when timer completes (user watched full ad)
            logActivity('ad_view', { userId: currentUser.id, adUrl, purpose: 'debt_clear' });
        }
    }, 1000);
}

// REPLACE the showBettingTab function with this improved version:
function showBettingTab(type) {
    const content = document.getElementById('betting-content');
    
    if (type === 'pool') {
        content.innerHTML = createPoolBettingUI();
        // Load odds after UI is created
        setTimeout(() => loadPoolOdds(window.currentEventId), 500);
    } else {
        content.innerHTML = create1v1BettingUI();
    }
    
    // Update tab buttons
    document.querySelectorAll('.betting-tabs .tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Find the clicked button and mark it active
    const clickedBtn = Array.from(document.querySelectorAll('.betting-tabs .tab-btn'))
        .find(btn => btn.onclick.toString().includes(type));
    if (clickedBtn) {
        clickedBtn.classList.add('active');
    }
}

function createPoolBettingUI() {
    const currentEvent = events.find(e => e.id === window.currentEventId);
    if (!currentEvent || !currentEvent.options) {
        return '<div class="pool-betting">Event options not available</div>';
    }
    
    return `
        <div class="pool-betting">
            <div class="betting-options" id="betting-options">
                ${currentEvent.options.map((option, index) => `
                    <div class="option-card" onclick="selectBettingOption('${option}', ${index})">
                        <h4>${option}</h4>
                        <div class="odds" id="odds-${index}">Loading...</div>
                        <div class="bet-count" id="bets-${index}">0 bets</div>
                        <div class="pool-amount" id="pool-${index}">â‚¹0</div>
                    </div>
                `).join('')}
            </div>
            <div class="bet-input">
                <div class="selected-option" id="selected-option">Select an option first</div>
                <input type="number" id="bet-amount" placeholder="Bet amount" min="1">
                <button class="primary-btn" onclick="confirmPoolBet()">PLACE BET</button>
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

// ADD THIS ENTIRE FUNCTION - it's missing from your current code
async function placeBet(option, type, amount = null) {
    if (!currentUser) {
        showNotification('Please login to bet', 'error');
        return;
    }
    
    const betAmount = amount || parseInt(document.getElementById('bet-amount')?.value);
    if (!betAmount || betAmount <= 0) {
        showNotification('Enter valid bet amount', 'error');
        return;
    }
    
    if (betAmount > currentUser.balance) {
        showNotification('Insufficient balance', 'error');
        return;
    }
    
    try {
        // Get current event (you'll need to pass eventId to this function)
        const currentEventId = window.currentEventId; // You'll need to set this when opening event modal
        
        // Deduct from user balance
        currentUser.balance -= betAmount;
        
        // Update user in Firebase
        await db.collection('users').doc(currentUser.id).update({
            balance: currentUser.balance,
            totalBets: (currentUser.totalBets || 0) + 1
        });
        
        // Create bet record
        await db.collection('bets').add({
            userId: currentUser.id,
            eventId: currentEventId,
            option: option,
            amount: betAmount,
            type: type,
            timestamp: firebase.firestore.Timestamp.now(),
            status: 'placed'
        });
        
        // Update event pot
        const eventRef = db.collection('events').doc(currentEventId);
        const eventDoc = await eventRef.get();
        const currentPot = eventDoc.data().totalPot || 0;
        const currentBets = eventDoc.data().totalBets || 0;
        
        await eventRef.update({
            totalPot: currentPot + betAmount,
            totalBets: currentBets + 1
        });
        
        updateBalance();
        closeModal('event-modal');
        showNotification(`Bet placed: ${formatCurrency(betAmount, currentUser.currency)} on ${option}`, 'success');
        
        // ADD THIS LOGGING CALL
        logActivity('bet_placed', { 
            userId: currentUser.id, 
            eventId: currentEventId,
            amount: betAmount,
            option: option,
            type: type,
            newBalance: currentUser.balance 
        });
        
    } catch (error) {
        console.error('Error placing bet:', error);
        showNotification('Failed to place bet', 'error');
    }
}

function createPriceLadder() {
    return `
        <div class="ladder-header">
            <span>Wager</span>
            <span>Back Team A</span>
            <span>Back Team B</span>
        </div>
        <div class="ladder-row" onclick="placeLadderBet(100, 'team_a')">
            <span>â‚¹100</span>
            <span class="back-btn">2.0</span>
            <span class="lay-btn">2.0</span>
        </div>
        <div class="ladder-row" onclick="placeLadderBet(200, 'team_a')">
            <span>â‚¹200</span>
            <span class="back-btn">2.0</span>
            <span class="lay-btn">2.0</span>
        </div>
        <div class="ladder-row" onclick="placeLadderBet(500, 'team_a')">
            <span>â‚¹500</span>
            <span class="back-btn">2.0</span>
            <span class="lay-btn">2.0</span>
        </div>
    `;
}

let selectedBettingOption = null;
let selectedOptionIndex = null;

function selectBettingOption(option, index) {
    selectedBettingOption = option;
    selectedOptionIndex = index;
    
    // Update UI
    document.querySelectorAll('.option-card').forEach(card => card.classList.remove('selected'));
    document.querySelectorAll('.option-card')[index].classList.add('selected');
    document.getElementById('selected-option').textContent = `Selected: ${option}`;
}

// REPLACE the confirmPoolBet function with this version that includes proper status:
// REPLACE the entire confirmPoolBet function with this corrected version:
async function confirmPoolBet() {
    console.log('Selected option:', selectedBettingOption, 'Index:', selectedOptionIndex);
    
    if (!currentUser) {
        showNotification('Please login to bet', 'error');
        return;
    }
    
    // Check if user is in debt
    if (checkUserDebt()) {
        showAmberNotification('Clear your debt first!');
        setTimeout(() => {
            showWallet();
        }, 1000);
        return;
    }
    
    if (!selectedBettingOption) {
        showNotification('Please select a betting option first', 'error');
        return;
    }
    
    const betAmount = parseInt(document.getElementById('bet-amount').value);
    if (!betAmount || betAmount <= 0) {
        showNotification('Enter valid bet amount', 'error');
        return;
    }
    
    const walletBalance = currentUser.balance - currentUser.debt;
    if (betAmount > walletBalance) {
        showNotification('Insufficient balance', 'error');
        return;
    }
    
    try {
        showBuffering();
        
        const eventId = window.currentEventId;
        const currentEvent = events.find(e => e.id === eventId);
        
        if (!currentEvent) {
            showNotification('Event not found', 'error');
            hideBuffering();
            return;
        }
        
        // Get current odds that user sees (these will be locked in)
        const currentOddsElement = document.getElementById(`odds-${selectedOptionIndex}`);
        if (!currentOddsElement) {
            showNotification('Error getting odds. Please try again.', 'error');
            hideBuffering();
            return;
        }
        
        const lockedOdds = parseFloat(currentOddsElement.textContent);
        if (isNaN(lockedOdds) || lockedOdds <= 0) {
            showNotification('Invalid odds. Please try again.', 'error');
            hideBuffering();
            return;
        }
        
        const potentialWinning = Math.floor(betAmount * lockedOdds);
        
        // Use transaction to ensure consistency
        const result = await db.runTransaction(async (transaction) => {
            // Get current pool state
            const poolRef = db.collection('betting_pools').doc(eventId);
            const poolDoc = await transaction.get(poolRef);
            
            let poolData;
            if (!poolDoc.exists) {
                poolData = {
                    eventId: eventId,
                    eventTitle: currentEvent.title,
                    eventStartTime: currentEvent.startTime,
                    eventOptions: currentEvent.options,
                    totalPool: 0,
                    totalBets: 0,
                    totalWagered: 0,
                    optionPools: {},
                    optionBetCounts: {},
                    vigPercentage: currentEvent.vigPercentage || 5,
                    status: 'active',
                    createdAt: firebase.firestore.Timestamp.now()
                };
                
                // Initialize option pools safely
                if (currentEvent.options && Array.isArray(currentEvent.options)) {
                    currentEvent.options.forEach((option) => {
                        poolData.optionPools[option] = 100; // Base amount
                        poolData.optionBetCounts[option] = 0;
                    });
                }
            } else {
                poolData = poolDoc.data();
                // Ensure the required properties exist
                if (!poolData.optionPools) poolData.optionPools = {};
                if (!poolData.optionBetCounts) poolData.optionBetCounts = {};
                if (!poolData.totalWagered) poolData.totalWagered = poolData.totalPool || 0;
            }
            
            // Create betting slip with LOCKED odds (what user saw)
            const bettingSlip = {
                userId: currentUser.id,
                userNickname: currentUser.nickname,
                userDisplayName: currentUser.displayName,
                eventId: eventId,
                eventTitle: currentEvent.title,
                eventStartTime: currentEvent.startTime,
                selectedOption: selectedBettingOption,
                betAmount: betAmount,
                currency: currentUser.currency,
                timestamp: firebase.firestore.Timestamp.now(),
                status: 'placed',
                betType: 'pool',
                odds: lockedOdds, // User's locked odds
                potentialWinning: potentialWinning
            };
            
            // Update pool with new bet
            poolData.totalPool += betAmount;
            poolData.totalBets += 1;
            poolData.totalWagered += betAmount; // Track total wagered
            
            // Safely update option pools
            if (!poolData.optionPools[selectedBettingOption]) {
                poolData.optionPools[selectedBettingOption] = 100; // Initialize if missing
            }
            if (!poolData.optionBetCounts[selectedBettingOption]) {
                poolData.optionBetCounts[selectedBettingOption] = 0; // Initialize if missing
            }
            
            poolData.optionPools[selectedBettingOption] += betAmount;
            poolData.optionBetCounts[selectedBettingOption] += 1;
            
            // Update user balance
            const userRef = db.collection('users').doc(currentUser.id);
            transaction.update(userRef, {
                balance: currentUser.balance - betAmount,
                totalBets: (currentUser.totalBets || 0) + 1
            });
            
            // Save pool data
            transaction.set(poolRef, poolData);
            
            // Save betting slip
            const slipRef = db.collection('betting_slips').doc();
            transaction.set(slipRef, bettingSlip);
            
            // Update event total pot
            const eventRef = db.collection('events').doc(eventId);
            transaction.update(eventRef, {
                totalPot: poolData.totalPool,
                totalBets: poolData.totalBets
            });
            
            return bettingSlip;
        });
        
        // Update local user data
        currentUser.balance -= betAmount;
        currentUser.totalBets = (currentUser.totalBets || 0) + 1;
        
        updateBalance();
        hideBuffering();
        closeModal('event-modal');
        
        showNotification(
            `Bet placed: ${formatCurrency(betAmount, currentUser.currency)} on ${selectedBettingOption}. Locked odds: ${result.odds}. Potential win: ${formatCurrency(result.potentialWinning, currentUser.currency)}`,
            'success'
        );
        
        // Log activity
        logActivity('bet_placed', {
            userId: currentUser.id,
            eventId: eventId,
            amount: betAmount,
            option: selectedBettingOption,
            lockedOdds: result.odds,
            potentialWinning: result.potentialWinning,
            status: 'placed'
        });
        
        // Refresh odds for all users after a short delay
        setTimeout(() => {
            loadPoolOdds(eventId);
        }, 1000);
        
    } catch (error) {
        console.error('Error placing bet:', error);
        showNotification('Failed to place bet', 'error');
        hideBuffering();
    }
}

async function loadPoolOdds(eventId) {
    try {
        const poolDoc = await db.collection('betting_pools').doc(eventId).get();
        const currentEvent = events.find(e => e.id === eventId);
        
        if (!currentEvent || !currentEvent.options) {
            console.error('Event or options not found');
            return;
        }

        let poolData;
        let calculatedOdds = {};
        
        if (!poolDoc.exists) {
            // No bets placed yet, show initial odds with vig built in
            currentEvent.options.forEach((option, index) => {
                const oddsEl = document.getElementById(`odds-${index}`);
                const betsEl = document.getElementById(`bets-${index}`);
                const poolEl = document.getElementById(`pool-${index}`);
                
                const initialOdds = currentEvent.initialOdds && currentEvent.initialOdds[option] 
                    ? currentEvent.initialOdds[option] 
                    : 2.0;
                
                calculatedOdds[option] = initialOdds;
                
                if (oddsEl) oddsEl.textContent = initialOdds.toFixed(2);
                if (betsEl) betsEl.textContent = '0 bets';
                if (poolEl) poolEl.textContent = '₹0';
            });
        } else {
            poolData = poolDoc.data();
            
            // Safety checks
            if (!poolData.optionPools) poolData.optionPools = {};
            if (!poolData.optionBetCounts) poolData.optionBetCounts = {};
            
            const totalPool = poolData.totalPool || 0;
            const vigPercentage = poolData.vigPercentage || 5;
            
            // Calculate overround to maintain vig
            const targetOverround = 100 + vigPercentage; // e.g., 105% for 5% vig
            
            currentEvent.options.forEach((option, index) => {
                const optionPool = poolData.optionPools[option] || 0;
                const betCount = poolData.optionBetCounts[option] || 0;
                
                let odds = currentEvent.initialOdds && currentEvent.initialOdds[option] 
                    ? currentEvent.initialOdds[option] 
                    : 2.0;
                
                // Only recalculate if there are actual bets and pool is significant
                if (totalPool > 0 && optionPool > 0) {
                    // Calculate implied probability for this option
                    const impliedProbability = (optionPool / totalPool) * 100;
                    
                    // Adjust for overround to maintain vig
                    const adjustedProbability = (impliedProbability / 100) * (targetOverround / 100);
                    
                    // Convert back to odds, ensuring minimum of 1.01
                    odds = Math.max(1.01, 1 / adjustedProbability);
                }
                
                calculatedOdds[option] = odds;
                const poolAmount = Math.max(0, optionPool);
                
                const oddsEl = document.getElementById(`odds-${index}`);
                const betsEl = document.getElementById(`bets-${index}`);
                const poolEl = document.getElementById(`pool-${index}`);
                
                if (oddsEl) oddsEl.textContent = odds.toFixed(2);
                if (betsEl) betsEl.textContent = `${betCount} bets`;
                if (poolEl) poolEl.textContent = `₹${poolAmount}`;
            });
        }
        
        // UPDATE: Save currentOdds to event document in Firestore
        await db.collection('events').doc(eventId).update({
            currentOdds: calculatedOdds,
            updatedAt: firebase.firestore.Timestamp.now()
        });
        
        // Update local events array
        const eventIndex = events.findIndex(e => e.id === eventId);
        if (eventIndex !== -1) {
            events[eventIndex].currentOdds = calculatedOdds;
        }
        
    } catch (error) {
        console.error('Error loading pool odds:', error);
        
        // Fallback to initial odds
        const currentEvent = events.find(e => e.id === eventId);
        if (currentEvent && currentEvent.options) {
            let fallbackOdds = {};
            currentEvent.options.forEach((option, index) => {
                const oddsEl = document.getElementById(`odds-${index}`);
                const betsEl = document.getElementById(`bets-${index}`);
                const poolEl = document.getElementById(`pool-${index}`);
                
                const initialOdds = currentEvent.initialOdds && currentEvent.initialOdds[option] 
                    ? currentEvent.initialOdds[option] 
                    : 2.0;
                
                fallbackOdds[option] = initialOdds;
                
                if (oddsEl) oddsEl.textContent = initialOdds.toFixed(2);
                if (betsEl) betsEl.textContent = '0 bets';
                if (poolEl) poolEl.textContent = '₹0';
            });
            
            // Still try to update Firestore even in fallback
            try {
                await db.collection('events').doc(eventId).update({
                    currentOdds: fallbackOdds,
                    updatedAt: firebase.firestore.Timestamp.now()
                });
            } catch (updateError) {
                console.error('Error updating fallback odds:', updateError);
            }
        }
    }
}

function showVFRModal(eventId) {
    const event = events.find(e => e.id === eventId);
    if (!event) return;
    
    let modal = document.getElementById('vfr-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'vfr-modal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <span class="close" onclick="closeModal('vfr-modal')">&times;</span>
                <h2>VOTE FOR RESULT</h2>
                <p>Which option won?</p>
                <div id="vfr-options"></div>
                <button id="submit-vfr" class="primary-btn" onclick="submitVFR()">SUBMIT VOTE</button>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    const optionsHtml = event.options.map((option, index) => `
        <label class="vfr-option">
            <input type="radio" name="vfr-choice" value="${option}">
            <span>${option}</span>
        </label>
    `).join('');
    
    document.getElementById('vfr-options').innerHTML = optionsHtml;
    window.currentVFREventId = eventId;
    showModal('vfr-modal');
}

// REPLACE the submitVFR function with this improved version:
async function submitVFR() {
    const selectedOption = document.querySelector('input[name="vfr-choice"]:checked');
    if (!selectedOption) {
        showNotification('Please select a result', 'error');
        return;
    }
    
    try {
        // Check if user already voted
        const existingVote = await db.collection('event_votes')
            .where('userId', '==', currentUser.id)
            .where('eventId', '==', window.currentVFREventId)
            .get();
            
        if (!existingVote.empty) {
            showNotification('You have already voted for this event', 'warning');
            return;
        }
        
        // Submit vote (this will auto-create the collection if it doesn't exist)
        await db.collection('event_votes').add({
            userId: currentUser.id,
            userNickname: currentUser.nickname,
            eventId: window.currentVFREventId, // Just store the event document ID
            selectedWinner: selectedOption.value,
            timestamp: firebase.firestore.Timestamp.now(),
            userHadBet: await userHadBetOnEvent(window.currentVFREventId)
        });
        
        closeModal('vfr-modal');
        showNotification('Vote submitted successfully!', 'success');
        
    } catch (error) {
        console.error('Error submitting VFR:', error);
        showNotification('Failed to submit vote', 'error');
    }
}

async function settleEvent(eventId, winningOption) {
    try {
        const settlement = await db.runTransaction(async (transaction) => {
            // Get pool data
            const poolRef = db.collection('betting_pools').doc(eventId);
            const poolDoc = await transaction.get(poolRef);
            
            if (!poolDoc.exists) {
                throw new Error('Pool not found');
            }
            
            const poolData = poolDoc.data();
            const totalPot = poolData.totalPool || 0;
            const vigPercentage = poolData.vigPercentage || 5;
            
            // Get all bets for this event
            const allBetsQuery = await db.collection('betting_slips')
                .where('eventId', '==', eventId)
                .where('status', '==', 'placed')
                .get();
            
            let winnersWin = 0;
            let losersLose = 0;
            const winnerUpdates = [];
            
            // Process all bets
            for (const betDoc of allBetsQuery.docs) {
                const bet = betDoc.data();
                
                if (bet.selectedOption === winningOption) {
                    // Winner - calculate payout using their locked odds
                    const winAmount = Math.floor(bet.betAmount * bet.odds);
                    winnersWin += winAmount;
                    
                    // Update betting slip
                    transaction.update(betDoc.ref, {
                        status: 'placed & won',
                        actualWinning: winAmount,
                        settledAt: firebase.firestore.Timestamp.now()
                    });
                    
                    // Update user balance
                    const userRef = db.collection('users').doc(bet.userId);
                    const userDoc = await transaction.get(userRef);
                    const currentBalance = userDoc.data().balance || 0;
                    const currentWinnings = userDoc.data().totalWinnings || 0;
                    
                    transaction.update(userRef, {
                        balance: currentBalance + winAmount,
                        totalWinnings: currentWinnings + winAmount
                    });
                    
                    winnerUpdates.push({
                        userId: bet.userId,
                        winAmount: winAmount
                    });
                } else {
                    // Loser
                    losersLose += bet.betAmount;
                    
                    // Update betting slip
                    transaction.update(betDoc.ref, {
                        status: 'placed & lost',
                        settledAt: firebase.firestore.Timestamp.now()
                    });
                }
            }
            
            // Calculate actual vig
            const myVig = totalPot - winnersWin;
            
            // Create settlement record
            const settlementData = {
                eventId: eventId,
                eventTitle: poolData.eventTitle,
                winner: winningOption,
                totalPot: totalPot,
                winnersWin: winnersWin,
                losersLose: losersLose,
                myVig: myVig,
                vigPercentage: vigPercentage,
                totalBetsSettled: allBetsQuery.docs.length,
                settledAt: firebase.firestore.Timestamp.now()
            };
            
            const settlementRef = db.collection('event_settlements').doc(eventId);
            transaction.set(settlementRef, settlementData);
            
            // Update event status
            const eventRef = db.collection('events').doc(eventId);
            transaction.update(eventRef, {
                status: 'settled',
                winner: winningOption,
                settledAt: firebase.firestore.Timestamp.now()
            });
            
            return settlementData;
        });
        
        console.log('Event settled:', settlement);
        return settlement;
        
    } catch (error) {
        console.error('Error settling event:', error);
        throw error;
    }
}

// Function to check if bookmaking algorithm is working correctly
function validateBookmakingProfit(totalPot, winnersWin, vigPercentage) {
    const actualVig = totalPot - winnersWin;
    const expectedMinimumVig = totalPot * (vigPercentage / 100);
    
    const isHealthy = actualVig >= expectedMinimumVig;
    const actualVigPercentage = totalPot > 0 ? (actualVig / totalPot) * 100 : 0;
    
    return {
        isHealthy: isHealthy,
        actualVig: actualVig,
        expectedMinimumVig: expectedMinimumVig,
        actualVigPercentage: actualVigPercentage,
        difference: actualVig - expectedMinimumVig
    };
}


// Calculate fair odds with built-in vig for initial event setup
function calculateInitialOddsWithVig(probabilities, vigPercentage) {
    // probabilities should be an object like {A: 0.5, B: 0.5} totaling 1.0
    const targetOverround = 1 + (vigPercentage / 100); // e.g., 1.05 for 5% vig
    
    const fairOdds = {};
    for (const option in probabilities) {
        // Convert probability to odds with vig built in
        const adjustedProbability = probabilities[option] * targetOverround;
        fairOdds[option] = Math.max(1.01, 1 / adjustedProbability);
    }
    
    return fairOdds;
}

async function userHadBetOnEvent(eventId) {
    try {
        const betsQuery = await db.collection('betting_slips')
            .where('userId', '==', currentUser.id)
            .where('eventId', '==', eventId)
            .get(); // Remove status filter to include all bet statuses
        return !betsQuery.empty;
    } catch (error) {
        console.error('Error checking user bets:', error);
        return false;
    }
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
    
    if (window.currentAdTimer) {
        clearInterval(window.currentAdTimer);
        window.currentAdTimer = null;
    }
    
    const adUrl = adminSettings.activeAds[Math.floor(Math.random() * adminSettings.activeAds.length)];
    const iframe = document.getElementById('ad-video');
    iframe.src = adUrl + '?autoplay=1&controls=0&disablekb=1&modestbranding=1&rel=0&enablejsapi=1';
    iframe.style.pointerEvents = 'none';
    iframe.allow = 'autoplay; fullscreen';
    
    showModal('ad-modal');
    
    // Log ad_click immediately when modal opens
    logActivity('ad_click', { userId: currentUser.id, adUrl });
    
    const claimBtn = document.getElementById('claim-reward');
    claimBtn.classList.add('hidden');
    
    let timeLeft = 32;
    document.getElementById('ad-timer').textContent = timeLeft;
    
    window.currentAdTimer = setInterval(() => {
        timeLeft--;
        document.getElementById('ad-timer').textContent = timeLeft;
        
        if (timeLeft <= 0) {
            clearInterval(window.currentAdTimer);
            window.currentAdTimer = null;
            claimBtn.classList.remove('hidden');
            
            // Log ad_view only when timer completes (user watched full ad)
            logActivity('ad_view', { userId: currentUser.id, adUrl });
        }
    }, 1000);
}

async function claimAdReward() {
    if (!currentUser) return;
    
    const reward = adminSettings.perAdReward;
    const adPurpose = window.adPurpose || 'regular';
    
    try {
        if (adPurpose === 'buyin_reset') {
            // Reset daily buyin limit
            await db.collection('users').doc(currentUser.id).update({
                dailyBuyinUsed: 0,
                lastBuyinReset: firebase.firestore.Timestamp.now()
            });
            
            currentUser.dailyBuyinUsed = 0;
            
            showNotification(`Buy-in limit reset! You can now buy in up to ${formatCurrency(adminSettings.dailyBuyinLimit)}`, 'success');
            
            // Log buyin reset
            logActivity('buyin_limit_reset', { 
                userId: currentUser.id, 
                resetAt: new Date(),
                previousLimit: adminSettings.dailyBuyinLimit
            });
            
            // After resetting, show buyin modal again
            setTimeout(() => {
                showBuyIn();
            }, 1500);
            
        } else if (adPurpose === 'debt_clear') {
            // Auto settle debt
            const result = await settleDebtAutomatically(currentUser.id, reward);
            currentUser.balance = result.balance;
            currentUser.debt = result.debt;
            
            updateBalance();
            updateEVCWalletBalance();
            
            showNotification(`Earned ${formatCurrency(reward)}! Keep watching ads to clear more debt.`, 'success');
            
        } else {
            // Regular ad reward
            const result = await settleDebtAutomatically(currentUser.id, reward);
            currentUser.balance = result.balance;
            currentUser.debt = result.debt;
            
            updateBalance();
            updateEVCWalletBalance();
            
            showNotification(`Earned ${formatCurrency(reward)}!`, 'success');
        }
        
        // Clean up and close modal
        window.adPurpose = null;
        cleanupAdTimer();
        closeModal('ad-modal');
        
        // Log reward claim
        logActivity('ad_reward_claimed', { 
            userId: currentUser.id, 
            reward,
            purpose: adPurpose,
            newBalance: currentUser.balance,
            debtSettled: currentUser.debt < (currentUser.debt || 0)
        });
        
    } catch (error) {
        console.error('Error claiming ad reward:', error);
        showNotification('Failed to claim reward', 'error');
    }
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
                        <div class="earning-amount">+${formatCurrency(amount)}</div>
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

// REPLACE the showTab function with this fixed version:
async function showTab(tabName) {
    const content = document.getElementById('tab-content');
    const tabBtns = document.querySelectorAll('.tab-btn');
    
    // Remove active class from all tabs
    tabBtns.forEach(btn => btn.classList.remove('active'));
    
    // Find and activate the clicked tab
    const clickedTab = Array.from(tabBtns).find(btn => btn.onclick.toString().includes(tabName));
    if (clickedTab) clickedTab.classList.add('active');
    
    // Show loading while content loads
    content.innerHTML = '<div class="loading-content">Loading...</div>';
    
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
            try {
                const notifs = await loadUserNotifications();
                const html = await createNotificationsTab();
                content.innerHTML = html;
            } catch (error) {
                content.innerHTML = '<div class="error-content">Error loading notifications</div>';
            }
            break;
        case 'complaints':
            content.innerHTML = createComplaintsTab();
            break;
        case 'slips':
            try {
                const slipsHtml = await createSlipsTab();
                content.innerHTML = slipsHtml;
            } catch (error) {
                content.innerHTML = '<div class="error-content">Error loading betting slips</div>';
            }
            break;
    }
}

function createBalanceTab() {
    const walletBalance = currentUser.balance - currentUser.debt;
    const balanceColor = walletBalance < 0 ? '#ffc857' : 'var(--primary-color)';
    const debtDisplay = currentUser.debt > 0 ? 
        `<div class="debt-warning">Debt: ${formatCurrency(currentUser.debt)}</div>` : '';
    
    return `
        <div class="balance-tab">
            <div class="profile-pic-display">
                <img src="${currentUser.profilePic || getRandomProfilePic(currentUser.gender)}" alt="Profile" class="profile-image ${currentUser.gender}">
                <div class="profile-names">
                    <div class="display-name">${currentUser.displayName}</div>
                    <div class="nickname">@${currentUser.nickname}</div>
                </div>
            </div>
            <div class="balance-info">
                <h3>Wallet Balance</h3>
                <div class="balance-amount" style="color: ${balanceColor};">${formatCurrency(walletBalance)}</div>
                ${debtDisplay}
                <div class="rep-score ${currentUser.repScore.toLowerCase()}">
                    Rep Score: ${currentUser.repScore}
                </div>
            </div>
            <div class="balance-stats">
                <div class="stat">
                    <label>Total Winnings:</label>
                    <span>${formatCurrency(currentUser.totalWinnings || 0)}</span>
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
                <label>Current Profile Picture:</label>
                <img src="${currentUser.profilePic}" alt="Profile" class="current-profile-pic">
                <button onclick="changeProfilePic()">CHANGE PICTURE</button>
            </div>
            <div class="setting-item">
                <label>Login Code Access:</label>
                <button class="sha-reveal-btn" onclick="showMySHA256()">SHOW MY SHA256</button>
                <div id="sha-display" class="sha-display hidden">
                    <input type="text" id="user-sha-code" readonly>
                    <button onclick="copySHAFromSettings()" class="copy-sha-btn">COPY</button>
                </div>
            </div>
            <div class="setting-item">
                <button class="danger-btn" onclick="logout()">LOGOUT</button>
            </div>
        </div>
    `;
}

function changeProfilePic() {
    // Create file input
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';
    
    fileInput.onchange = async function() {
        const file = this.files[0];
        if (file) {
            try {
                showBuffering();
                
                const newPic = await handleProfilePicUpload(file, currentUser.gender);
                
                // Update in Firebase
                await db.collection('users').doc(currentUser.id).update({
                    profilePic: newPic
                });
                
                currentUser.profilePic = newPic;
                showNotification('Profile picture updated!', 'success');
                showTab('settings'); // Refresh settings tab
                hideBuffering();
                
            } catch (error) {
                console.error('Error updating profile pic:', error);
                showNotification('Failed to update profile picture', 'error');
                hideBuffering();
            }
        }
    };
    
    document.body.appendChild(fileInput);
    fileInput.click();
    document.body.removeChild(fileInput);
}

async function createNotificationsTab() {
    const notifications = await loadUserNotifications();

    if (!notifications.length) {
        return `<div class="notifications-tab"><p>No notifications yet</p></div>`;
    }

    return `
        <div class="notifications-tab">
            ${notifications.map(n => `
                <div class="notification-item" onclick="openNotificationModal('${n.message}', '${n.title}'); markNotificationAsRead('${n.id}')">
                    <div class="notification-content">
                        <h4>${n.title}</h4>
                        <p>${n.message}</p>
                        <span class="notification-time">
                            ${n.timestamp?.toDate().toLocaleString() || ''}
                        </span>
                    </div>
                </div>
            `).join("")}
        </div>
    `;
}


function createComplaintsTab() {
    return `
        <div class="complaints-tab">
            <form class="complaint-form" onsubmit="submitComplaint(event)">
                <textarea 
                    id="complaint-text" 
                    class="complaint-textarea" 
                    placeholder="Describe your complaint or issue in detail..."
                    required
                ></textarea>
                <button type="submit" class="complaint-submit-btn">SUBMIT COMPLAINT</button>
            </form>
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

// REPLACE the createSlipsTab function (remove async from the function signature):
function createSlipsTab() {
    if (!currentUser) {
        return Promise.resolve('<div class="slips-tab"><p>Please login to view betting slips</p></div>');
    }
    
    return new Promise(async (resolve) => {
        try {
            const slipsQuery = await db.collection('betting_slips')
                .where('userId', '==', currentUser.id)
                .orderBy('timestamp', 'desc')
                .limit(20)
                .get();
                
            if (slipsQuery.empty) {
                resolve(`
                    <div class="slips-tab">
                        <div class="slip-item">
                            <div class="slip-info">
                                <p>No betting slips yet.</p>
                                <p>Place bets to see your slips here!</p>
                            </div>
                        </div>
                    </div>
                `);
                return;
            }
            
            let slipsHtml = '<div class="slips-tab">';
            slipsQuery.docs.forEach(doc => {
                const slip = doc.data();
                const timestamp = slip.timestamp.toDate().toLocaleString();
                
                // Determine status display
                let statusDisplay = slip.status || 'placed';
                let statusClass = statusDisplay.toLowerCase();
                
                // Map status for display
                if (statusDisplay.includes('&')) {
                    const parts = statusDisplay.split('&').map(p => p.trim());
                    const mainStatus = parts[0].toUpperCase();
                    const resultStatus = parts[1].toUpperCase();
                    
                    let resultColor = '#FFF3DA';
                    if (resultStatus === 'WON') resultColor = '#9ef01a';
                    if (resultStatus === 'LOST') resultColor = '#ff0a54';
                    
                    statusDisplay = `${mainStatus} & <span style="color: ${resultColor};">${resultStatus}</span>`;
                    statusClass = 'compound-status';
                } else {
                    switch(statusDisplay.toLowerCase()) {
                        case 'placed': statusDisplay = 'PLACED'; break;
                        case 'rejected': statusDisplay = 'REJECTED'; statusClass = 'rejected'; break;
                        case 'queued': statusDisplay = 'QUEUED'; statusClass = 'queued'; break;
                        case 'won': statusDisplay = 'WON'; statusClass = 'won'; break;
                        case 'lost': statusDisplay = 'LOST'; statusClass = 'lost'; break;
                        default: statusDisplay = statusDisplay.toUpperCase();
                    }
                }
                
                slipsHtml += `
                    <div class="slip-item">
                        <div class="slip-info">
                            <h4>Event: ${slip.eventTitle}</h4>
                            <p>Bet: ${formatCurrency(slip.betAmount)} on ${slip.selectedOption}</p>
                            <p>Odds: ${slip.odds} | Potential Win: ${formatCurrency(slip.potentialWinning)}</p>
                            <p>Time: ${timestamp}</p>
                            <p>Type: ${slip.betType || 'pool'}</p>
                        </div>
                        <span class="slip-status ${statusClass}">${statusDisplay}</span>
                    </div>
                `;
            });
            slipsHtml += '</div>';
            
            resolve(slipsHtml);
            
        } catch (error) {
            console.error('Error loading betting slips:', error);
            resolve('<div class="slips-tab"><p>Error loading betting slips</p></div>');
        }
    });
}

// ADD this function to update slip status (for admin use later):
async function updateSlipStatus(slipId, newStatus) {
    try {
        await db.collection('betting_slips').doc(slipId).update({
            status: newStatus,
            statusUpdatedAt: firebase.firestore.Timestamp.now()
        });
        
        console.log(`Slip ${slipId} status updated to ${newStatus}`);
    } catch (error) {
        console.error('Error updating slip status:', error);
    }
}

async function submitComplaint(event) {
    event.preventDefault();
    
    if (!currentUser) {
        showNotification('Please login first', 'error');
        return;
    }
    
    const complaintText = document.getElementById('complaint-text').value.trim();
    if (!complaintText) {
        showNotification('Please enter your complaint', 'error');
        return;
    }

    try {
        showBuffering();

        const userRef = db.collection("users").doc(currentUser.id);

        // Run in transaction so complaintCount is safe
        await db.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);
            let complaintCount = userDoc.exists && userDoc.data().complaintCount ? userDoc.data().complaintCount : 0;
            complaintCount += 1;

            // Update complaintCount in user document
            transaction.update(userRef, { complaintCount });

            // Save complaint
            const complaintRef = db.collection("admin_complaints").doc();
            transaction.set(complaintRef, {
                userId: currentUser.id,
                userNickname: currentUser.nickname,
                userDisplayName: currentUser.displayName,
                complaintText: complaintText,
                complaintNumber: complaintCount,
                status: 'pending',
                timestamp: firebase.firestore.Timestamp.now(),
                read: false
            });

            // Also add notification for the user
            const notifRef = db.collection("notifications").doc();
            transaction.set(notifRef, {
                userId: currentUser.id,
                title: "Complaint Submitted",
                message: `Your complaint has been submitted. Complaint #${complaintCount}`,
                type: "system",
                read: false,
                timestamp: firebase.firestore.Timestamp.now()
            });
        });

        // Clear the form
        document.getElementById('complaint-text').value = '';

        showNotification('Complaint submitted successfully!', 'success');
        hideBuffering();

    } catch (error) {
        console.error('Error submitting complaint:', error);
        showNotification('Failed to submit complaint', 'error');
        hideBuffering();
    }
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
                <img src="${user.profilePic || getRandomProfilePic(user.gender)}" 
                     alt="Profile" 
                     class="leaderboard-pic ${user.gender}"
                     onclick="toggleLeaderboardName(this, '${user.displayName}')">
                <span class="winnings">${formatCurrency(user.totalWinnings || 0, user.currency)}</span>
                <span class="rep-score ${user.repScore.toLowerCase()}">${user.repScore}</span>
            `;
            
            leaderboardEl.appendChild(row);
        });
    } catch (error) {
        console.error('Error loading leaderboard:', error);
    }
}

function toggleLeaderboardName(element, displayName) {
    // Remove any existing popups
    document.querySelectorAll('.leaderboard-name-popup').forEach(popup => popup.remove());
    
    // Create new popup
    const popup = document.createElement('div');
    popup.className = 'leaderboard-name-popup';
    popup.textContent = displayName;
    
    const row = element.closest('.leaderboard-row');
    row.appendChild(popup);
    
    // Remove popup after 2 seconds
    setTimeout(() => popup.remove(), 2000);
}

// Buy-in Functions
function showBuyIn() {
    showModal('buyin-modal');
}

async function testBuyIn() {
    const amount = parseInt(document.getElementById('buyin-amount').value);
    if (!amount || amount <= 0) {
        showNotification('Enter valid amount', 'error');
        return;
    }
    
    if (currentUser.dailyBuyinUsed + amount > adminSettings.dailyBuyinLimit) {
        // Show reset limit button instead of generic message
        const resetBtn = document.querySelector('.reset-limit-btn');
        if (resetBtn) {
            resetBtn.classList.remove('hidden');
            resetBtn.classList.add('pulsing-attract');
        }
        showNotification('Daily buy-in limit reached. Reset your limit by watching an ad!', 'warning');
        return;
    }
    
    try {
        showBuffering();
        
        // Auto settle debt
        const result = await settleDebtAutomatically(currentUser.id, amount);
        currentUser.balance = result.balance;
        currentUser.debt = result.debt;
        currentUser.dailyBuyinUsed += amount;
        
        // Update daily buyin usage
        await db.collection('users').doc(currentUser.id).update({
            dailyBuyinUsed: currentUser.dailyBuyinUsed
        });
        
        updateBalance();
        updateEVCWalletBalance();
        closeModal('buyin-modal');
        hideBuffering();
        
        // Log buy-in
        logActivity('buyin', { 
            userId: currentUser.id, 
            amount, 
            method: 'test',
            newBalance: currentUser.balance,
            debtSettled: result.debt < (currentUser.debt || 0)
        });
        
    } catch (error) {
        console.error('Error processing buy-in:', error);
        showNotification('Buy-in failed', 'error');
        hideBuffering();
    }
}

function watchAdForBuyinReset() {
    if (!currentUser) {
        showNotification('Please login first', 'error');
        return;
    }
    
    // Set flag to track this is for buyin reset
    window.adPurpose = 'buyin_reset';
    
    if (window.currentAdTimer) {
        clearInterval(window.currentAdTimer);
        window.currentAdTimer = null;
    }
    
    const iframe = document.getElementById('ad-video');
    if (!iframe) {
        console.error('Ad video iframe not found');
        showNotification('Ad system error. Please try again.', 'error');
        return;
    }
    
    const adUrl = adminSettings.activeAds[Math.floor(Math.random() * adminSettings.activeAds.length)];
    iframe.src = adUrl + '?autoplay=1&controls=0&disablekb=1&modestbranding=1&rel=0&enablejsapi=1';
    iframe.style.pointerEvents = 'none';
    iframe.allow = 'autoplay; fullscreen';
    
    closeModal('buyin-modal');
    showModal('ad-modal');
    
    // Log ad_click immediately when modal opens
    logActivity('ad_click', { userId: currentUser.id, adUrl, purpose: 'buyin_reset' });
    
    const claimBtn = document.getElementById('claim-reward');
    if (claimBtn) {
        claimBtn.classList.add('hidden');
    }
    
    let timeLeft = 32;
    const timerEl = document.getElementById('ad-timer');
    if (timerEl) {
        timerEl.textContent = timeLeft;
    }
    
    window.currentAdTimer = setInterval(() => {
        timeLeft--;
        if (timerEl) {
            timerEl.textContent = timeLeft;
        }
        
        if (timeLeft <= 0) {
            clearInterval(window.currentAdTimer);
            window.currentAdTimer = null;
            if (claimBtn) {
                claimBtn.classList.remove('hidden');
            }
            
            // Log ad_view only when timer completes (user watched full ad)
            logActivity('ad_view', { userId: currentUser.id, adUrl, purpose: 'buyin_reset' });
        }
    }, 1000);
}

// Stats and Real-time Updates
async function loadStats() {
    try {
        const stats = await db.collection('stats').doc('global').get();
        let activePlayers = 0;
        let totalPot = 0;
        
        if (stats.exists) {
            const data = stats.data();
            activePlayers = data.activePlayers || 0;
        }
        
        // Calculate total pot from active visible events
        const activeEventsSnapshot = await db.collection('events')
            .where('status', '==', 'active')
            .where('display_status', '==', 'visible')
            .get();
            
        activeEventsSnapshot.docs.forEach(doc => {
            const eventData = doc.data();
            totalPot += eventData.totalPot || 0;
        });
        
        // Update all stat displays
        const activePlayersEls = ['active-players', 'active-players-sticky', 'active-players-bottom'];
        const totalPotEls = ['total-pot', 'total-pot-sticky', 'total-pot-bottom'];
        
        activePlayersEls.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = activePlayers;
        });
        
        totalPotEls.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = formatCurrency(totalPot, 'INR');
        });
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

// ADD THE FUNCTION HERE:
// Show welcome message after page refresh if needed
function showPostRefreshWelcomeMessage() {
    const welcomeFlag = localStorage.getItem('showWelcomeMessage');
    if (welcomeFlag) {
        localStorage.removeItem('showWelcomeMessage'); // Clear flag
        
        setTimeout(() => {
            if (welcomeFlag === 'registration') {
                showNotification('Welcome to PredictKing! Your account is ready.', 'success');
            } else if (welcomeFlag === 'true') {
                showNotification('Welcome back!', 'success');
            }
        }, 500); // Show after everything loads
    }
}

// Utility Functions
function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    const text = document.getElementById('notification-text');
    
    // Clear any existing timers
    if (window.notificationTimer) {
        clearTimeout(window.notificationTimer);
    }
    if (window.notificationHideTimer) {
        clearTimeout(window.notificationHideTimer);
    }
    
    text.textContent = message;
    notification.className = `notification ${type}`;
    
    // Swoosh animation from left to right
    notification.classList.remove('hidden', 'hide');
    notification.classList.add('show');
    
    // Set timers with proper cleanup
    window.notificationTimer = setTimeout(() => {
        notification.classList.remove('show');
        notification.classList.add('hide');
        
        window.notificationHideTimer = setTimeout(() => {
            notification.classList.add('hidden');
            notification.classList.remove('hide');
            window.notificationTimer = null;
            window.notificationHideTimer = null;
        }, 600);
    }, 2500);
}

async function showNotifications() {
    if (!currentUser) {
        showNotification("Please login first", "error");
        return;
    }

    let modal = document.getElementById("notifications-modal");
    if (!modal) {
        modal = document.createElement("div");
        modal.id = "notifications-modal";
        modal.className = "modal";
        modal.innerHTML = `
            <div class="modal-content">
                <span class="close" onclick="closeModal('notifications-modal')">&times;</span>
                <h2>NOTIFICATIONS</h2>
                <div id="notifications-list" class="notifications-tab"></div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    // load notifications dynamically
    const notifications = await loadUserNotifications();
    const list = document.getElementById("notifications-list");

    if (!notifications.length) {
        list.innerHTML = "<p>No notifications yet</p>";
    } else {
        list.innerHTML = notifications.map(n => `
            <div class="notification-item" onclick="openNotificationModal('${n.message}', '${n.title}'); markNotificationAsRead('${n.id}')">
                <div class="notification-content">
                    <h4>${n.title}</h4>
                    <p>${n.message}</p>
                    <span class="notification-time">${n.timestamp?.toDate().toLocaleString() || ''}</span>
                </div>
            </div>
        `).join("");
    }

    showModal("notifications-modal");
}

async function markNotificationAsRead(notificationId) {
    try {
        await db.collection("notifications").doc(notificationId).update({ read: true });
    } catch (error) {
        console.error("Error marking notification as read:", error);
    }
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
    
    closeModal('profile-modal');
    showNotification('Logged out successfully', 'success');
    
    // Redirect to homepage after a brief delay
    setTimeout(() => {
        window.location.href = 'homepage.html';
    }, 1000);
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

// ADD THE FUNCTION HERE:
async function initializeCollections() {
    try {
        // Check if betting_pools collection exists by trying to get it
        const poolsTest = await db.collection('betting_pools').limit(1).get();
        console.log('betting_pools collection exists or was created');
        
        // Check if betting_slips collection exists
        const slipsTest = await db.collection('betting_slips').limit(1).get();
        console.log('betting_slips collection exists or was created');
        
        // Check if event_votes collection exists
        const votesTest = await db.collection('event_votes').limit(1).get();
        console.log('event_votes collection exists or was created');
        
        // Check if event_settlements collection exists
        const settlementsTest = await db.collection('event_settlements').limit(1).get();
        console.log('event_settlements collection exists or was created');
        
    } catch (error) {
        console.error('Error initializing collections:', error);
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

function showCasino() {
    let modal = document.getElementById('casino-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'casino-modal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <span class="close" onclick="closeModal('casino-modal')">&times;</span>
                <h2>CASINO</h2>
                <div style="text-align: center; padding: 2rem;">
                    <p style="font-size: 1.2rem; margin-bottom: 2rem;">Coming Soon!</p>
                    <p>Casino games are under development.</p>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    showModal('casino-modal');
}

// Update the theme switching function
function updateThemeBasedOnUser() {
    if (!currentUser) {
        setTheme('default');
        const loggedOutLayout = document.querySelector('.logged-out-layout');
        const loggedInLayout = document.querySelector('.logged-in-layout');
        if (loggedOutLayout) loggedOutLayout.classList.remove('hidden');
        if (loggedInLayout) loggedInLayout.classList.add('hidden');
    } else {
        const loggedOutLayout = document.querySelector('.logged-out-layout');
        const loggedInLayout = document.querySelector('.logged-in-layout');
        if (loggedOutLayout) loggedOutLayout.classList.add('hidden');
        if (loggedInLayout) loggedInLayout.classList.remove('hidden');
        
        if (currentUser.gender === 'male') {
            setTheme('male');
        } else if (currentUser.gender === 'female') {
            setTheme('female');
        }
    }
}

// Navigation toggle functionality
let navigationOpen = false;

// Make sure this function exists and works for EVC page
function toggleNavigation() {
    const toggleBtn = document.querySelector('.nav-toggle-btn');
    
    // Check if we're on EVC page or main page
    const isEVCPage = document.body.classList.contains('evc-page') || 
                      window.location.pathname.includes('evc.html');
    
    let visibleIcons;
    
    if (isEVCPage) {
        // EVC page always shows 2 icons
        visibleIcons = document.querySelectorAll('.nav-icon.evc-1, .nav-icon.evc-2');
    } else {
        // Main page depends on login status
        if (currentUser) {
            visibleIcons = document.querySelectorAll('.nav-icon.logged-in-only:not(.hidden)');
        } else {
            visibleIcons = document.querySelectorAll('.nav-icon.logged-out-only:not(.hidden)');
        }
    }
    
    navigationOpen = !navigationOpen;
    
    if (navigationOpen) {
        toggleBtn.classList.add('active');
        visibleIcons.forEach(icon => {
            icon.classList.add('visible');
        });
    } else {
        toggleBtn.classList.remove('active');
        visibleIcons.forEach(icon => {
            icon.classList.remove('visible');
        });
    }
}
function showLoggedInLayout() {
    // Hide logged out elements
    document.querySelectorAll('.logged-out-only').forEach(el => el.classList.add('hidden'));
    
    // Show logged in elements  
    document.querySelectorAll('.logged-in-only').forEach(el => el.classList.remove('hidden'));
    
    // Close navigation if open
    closeNavigation();
}

function showLoggedOutLayout() {
    // Hide logged in elements
    document.querySelectorAll('.logged-in-only').forEach(el => el.classList.add('hidden'));
    
    // Show logged out elements
    document.querySelectorAll('.logged-out-only').forEach(el => el.classList.remove('hidden'));
    
    // Close navigation if open
    closeNavigation();
}

function closeNavigation() {
    navigationOpen = false;
    const toggleBtn = document.querySelector('.nav-toggle-btn');
    if (toggleBtn) toggleBtn.classList.remove('active');
    
    document.querySelectorAll('.nav-icon').forEach(icon => {
        icon.classList.remove('visible');
    });
}


// Enhanced password save function for registration
function triggerPasswordSaveForRegistration(username, password) {
    try {
        // Create a visible form to properly trigger browser's save password dialog
        const form = document.createElement('form');
        form.id = 'password-save-form';
        form.style.position = 'fixed';
        form.style.top = '-200px';
        form.style.left = '50%';
        form.style.transform = 'translateX(-50%)';
        form.style.zIndex = '10001';
        form.style.background = 'transparent';
        form.style.border = 'none';
        form.action = '/login'; // Fake action
        form.method = 'post';
        form.autocomplete = 'on';
        
        const usernameInput = document.createElement('input');
        usernameInput.type = 'text';
        usernameInput.name = 'username';
        usernameInput.id = 'temp-username';
        usernameInput.value = username;
        usernameInput.autocomplete = 'username';
        usernameInput.style.opacity = '0.01';
        usernameInput.style.height = '1px';
        
        const passwordInput = document.createElement('input');
        passwordInput.type = 'password';
        passwordInput.name = 'password';
        passwordInput.id = 'temp-password';
        passwordInput.value = password;
        passwordInput.autocomplete = 'new-password';
        passwordInput.style.opacity = '0.01';
        passwordInput.style.height = '1px';
        
        form.appendChild(usernameInput);
        form.appendChild(passwordInput);
        document.body.appendChild(form);
        
        // Simulate a login attempt to trigger password manager
        setTimeout(() => {
            usernameInput.focus();
            setTimeout(() => {
                passwordInput.focus();
                setTimeout(() => {
                    // Create a submit event
                    const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
                    form.dispatchEvent(submitEvent);
                    
                    // Prevent actual submission
                    form.addEventListener('submit', (e) => {
                        e.preventDefault();
                        console.log('Password manager should be triggered');
                    });
                    
                    // Clean up
                    setTimeout(() => {
                        if (document.body.contains(form)) {
                            document.body.removeChild(form);
                        }
                    }, 3000);
                }, 100);
            }, 100);
        }, 100);
        
    } catch (error) {
        console.error('Error triggering password save:', error);
    }
}

// Function to complete registration process
// Function to complete registration process
function finishRegistration() {
    if (!window.currentRegistrationCode) {
        closeModal('code-modal');
        showNotification('Registration completed!', 'success');
        return;
    }
    
    // Final attempt to save credentials
    if (window.currentRegistrationUsername && window.currentRegistrationCode) {
        // Store in multiple locations for maximum safety
        localStorage.setItem('userCode', window.currentRegistrationCode);
        localStorage.setItem('savedUsername', window.currentRegistrationUsername);
        localStorage.setItem('userSHA256', window.currentRegistrationCode); // Store for profile access
        
        // Update cookies
        const expiryDate = new Date();
        expiryDate.setFullYear(expiryDate.getFullYear() + 1);
        document.cookie = `predictking_code=${window.currentRegistrationCode}; expires=${expiryDate.toUTCString()}; path=/; SameSite=Lax`;
        
        // Try to save in sessionStorage as well
        try {
            sessionStorage.setItem('tempUserCode', window.currentRegistrationCode);
        } catch (e) {
            console.log('SessionStorage not available');
        }
    }
    
    closeModal('code-modal');
    window.registrationInProgress = false;
    
    // Store flag to show welcome message after refresh for new registration
    localStorage.setItem('showWelcomeMessage', 'registration');
    
    showNotification('Registration completed! Logging you in...', 'success');
    
    // Auto-login the user with their new code after a shorter delay
    setTimeout(() => {
        if (window.currentRegistrationCode) {
            // Set flag to indicate this login should trigger refresh
            window.shouldRefreshAfterLogin = true;
            loginUser(window.currentRegistrationCode, false);
        }
        // Clear the temporary variables
        window.currentRegistrationCode = null;
        window.currentRegistrationUsername = null;
    }, 800);
}

// Function to recover saved codes from browser storage
function recoverSavedCredentials() {
    // Try localStorage first
    let savedCode = localStorage.getItem('userCode');
    let savedUsername = localStorage.getItem('savedUsername');
    
    if (savedCode) {
        return { code: savedCode, username: savedUsername };
    }
    
    // Try cookies
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'predictking_code') {
            savedCode = value;
        }
        if (name === 'predictking_username') {
            savedUsername = value;
        }
    }
    
    if (savedCode) {
        return { code: savedCode, username: savedUsername };
    }
    
    // Try sessionStorage as last resort
    try {
        savedCode = sessionStorage.getItem('tempUserCode');
        if (savedCode) {
            return { code: savedCode, username: null };
        }
    } catch (e) {
        console.log('SessionStorage not available');
    }
    
    return null;
}

// Enhanced copy function that also shows recovery info
function copyCode() {
    const codeInput = document.getElementById('generated-code');
    codeInput.select();
    codeInput.setSelectionRange(0, 99999); // For mobile devices
    
    try {
        document.execCommand('copy');
        showNotification('Code copied! Also saved in your browser automatically.', 'success');
    } catch (err) {
        // Fallback for newer browsers
        navigator.clipboard.writeText(codeInput.value).then(() => {
            showNotification('Code copied! Also saved in your browser automatically.', 'success');
        }).catch(() => {
            showNotification('Please manually select and copy the code', 'warning');
        });
    }
}

// Function to show user's SHA256 code in settings
function showMySHA256() {
    const shaDisplay = document.getElementById('sha-display');
    const shaCodeInput = document.getElementById('user-sha-code');
    const shaButton = document.querySelector('.sha-reveal-btn');
    
    if (shaDisplay.classList.contains('hidden')) {
        // Try to get SHA256 from storage
        let userSHA = localStorage.getItem('userSHA256') || localStorage.getItem('userCode');
        
        if (!userSHA) {
            // Try from cookies
            const cookies = document.cookie.split(';');
            for (let cookie of cookies) {
                const [name, value] = cookie.trim().split('=');
                if (name === 'predictking_code') {
                    userSHA = value;
                    break;
                }
            }
        }
        
        if (userSHA) {
            shaCodeInput.value = userSHA;
            shaDisplay.classList.remove('hidden');
            shaButton.textContent = 'HIDE SHA256';
        } else {
            showNotification('SHA256 code not found in browser storage', 'error');
        }
    } else {
        shaDisplay.classList.add('hidden');
        shaButton.textContent = 'SHOW MY SHA256';
        shaCodeInput.value = '';
    }
}

// Function to copy SHA256 from settings
function copySHAFromSettings() {
    const shaCodeInput = document.getElementById('user-sha-code');
    if (!shaCodeInput.value) {
        showNotification('No code to copy', 'error');
        return;
    }
    
    shaCodeInput.select();
    shaCodeInput.setSelectionRange(0, 99999);
    
    try {
        document.execCommand('copy');
        showNotification('SHA256 code copied to clipboard!', 'success');
    } catch (err) {
        navigator.clipboard.writeText(shaCodeInput.value).then(() => {
            showNotification('SHA256 code copied to clipboard!', 'success');
        }).catch(() => {
            showNotification('Failed to copy. Please select and copy manually.', 'error');
        });
    }
}


// Close modals when clicking outside
// Close modals when clicking outside
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        const modalId = event.target.id;
        
        // Special handling for code modal during registration OR regular close
        if (modalId === 'code-modal') {
            if (window.registrationInProgress) {
                finishRegistration(); // Handles registration completion
            } else {
                // Regular code modal close - still trigger refresh if user was logging in
                event.target.style.display = 'none';
                if (window.shouldRefreshAfterLogin) {
                    setTimeout(() => {
                        window.shouldRefreshAfterLogin = false;
                        window.location.reload();
                    }, 300);
                }
            }
            return;
        }
        
        if (modalId === 'ad-modal') {
            cleanupAdTimer();
        }
        event.target.style.display = 'none';
    }
}

// Handle code modal close button specifically
function closeCodeModal() {
    if (window.registrationInProgress) {
        finishRegistration();
    } else {
        closeModal('code-modal');
        if (window.shouldRefreshAfterLogin) {
            setTimeout(() => {
                window.shouldRefreshAfterLogin = false;
                window.location.reload();
            }, 300);
        }
    }
}