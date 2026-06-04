// e:/memora/extension/popup.js

document.addEventListener('DOMContentLoaded', () => {
  const authView = document.getElementById('auth-view');
  const dashboardView = document.getElementById('dashboard-view');
  
  const loginBtn = document.getElementById('login-btn');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const errorMsg = document.getElementById('auth-error');
  
  const logoutBtn = document.getElementById('logout-btn');
  const pauseBtn = document.getElementById('pause-btn');
  const syncBtn = document.getElementById('sync-history-btn');
  
  const statusDot = document.getElementById('status-dot');
  const statusText = document.getElementById('status-text');
  
  let isPaused = false;

  // Check auth state
  chrome.runtime.sendMessage({ type: "CHECK_AUTH" }, (response) => {
    if (response && response.isAuthenticated) {
      showDashboard();
    } else {
      showAuth();
    }
  });
  
  // Load pause state
  chrome.storage.local.get("global_pause", (data) => {
    if (data.global_pause) {
      isPaused = true;
      updatePauseUI();
    }
  });

  loginBtn.addEventListener('click', () => {
    const email = emailInput.value;
    const password = passwordInput.value;
    
    if (!email || !password) {
      errorMsg.textContent = "Please enter email and password.";
      return;
    }
    
    loginBtn.textContent = "Connecting...";
    errorMsg.textContent = "";
    
    chrome.runtime.sendMessage({ type: "LOGIN", email, password }, (res) => {
      loginBtn.textContent = "Connect to Vault";
      if (res && res.success) {
        showDashboard();
      } else {
        errorMsg.textContent = res ? res.error : "Failed to connect.";
      }
    });
  });

  logoutBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: "LOGOUT" }, () => {
      showAuth();
    });
  });

  pauseBtn.addEventListener('click', () => {
    isPaused = !isPaused;
    chrome.storage.local.set({ global_pause: isPaused });
    updatePauseUI();
  });
  
  syncBtn.addEventListener('click', () => {
    syncBtn.textContent = "Syncing... (This may take a while)";
    syncBtn.style.opacity = "0.7";
    syncBtn.disabled = true;
    
    // In Phase 2, this will send a message to background.js to start scraping APIs.
    setTimeout(() => {
      syncBtn.textContent = "Sync Past History";
      syncBtn.style.opacity = "1";
      syncBtn.disabled = false;
      alert("Historical sync initiated! Check your Memora Vault soon.");
    }, 2000);
  });

  function showAuth() {
    authView.style.display = 'flex';
    dashboardView.style.display = 'none';
  }

  function showDashboard() {
    authView.style.display = 'none';
    dashboardView.style.display = 'flex';
  }
  
  function updatePauseUI() {
    if (isPaused) {
      statusDot.classList.add('paused');
      statusText.textContent = "Paused";
      pauseBtn.textContent = "Resume Extension";
    } else {
      statusDot.classList.remove('paused');
      statusText.textContent = "Active & Listening";
      pauseBtn.textContent = "Pause Extension";
    }
  }
});
