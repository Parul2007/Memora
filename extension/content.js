// e:/memora/extension/content.js

// 1. Inject Grammarly-Style Memora Icon
function injectMemoraIcon() {
  if (document.getElementById('memora-extension-root')) return;

  const container = document.createElement('div');
  container.id = 'memora-extension-root';
  container.style.position = 'fixed';
  container.style.bottom = '20px';
  container.style.right = '20px';
  container.style.zIndex = '999999';

  const shadow = container.attachShadow({ mode: 'open' });

  // Add styles to shadow DOM
  const style = document.createElement('style');
  style.textContent = `
    .memora-icon-wrapper {
      width: 48px;
      height: 48px;
      background: #11120D;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      transition: all 0.2s ease;
      position: relative;
    }
    
    .memora-icon-wrapper:hover {
      transform: scale(1.05);
      box-shadow: 0 6px 16px rgba(0,0,0,0.2);
    }

    .memora-icon-wrapper.syncing {
      animation: pulse 2s infinite;
    }
    
    .memora-icon {
      font-size: 24px;
      color: #FAFAF9;
    }

    .memora-tooltip {
      position: absolute;
      bottom: 60px;
      right: 0;
      background: #11120D;
      color: #FAFAF9;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 13px;
      font-family: system-ui, sans-serif;
      white-space: nowrap;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.2s ease;
    }

    .memora-icon-wrapper:hover .memora-tooltip {
      opacity: 1;
    }

    @keyframes pulse {
      0% { box-shadow: 0 0 0 0 rgba(17, 18, 13, 0.4); }
      70% { box-shadow: 0 0 0 10px rgba(17, 18, 13, 0); }
      100% { box-shadow: 0 0 0 0 rgba(17, 18, 13, 0); }
    }
  `;
  shadow.appendChild(style);

  const wrapper = document.createElement('div');
  wrapper.className = 'memora-icon-wrapper';
  wrapper.id = 'memora-btn';

  const icon = document.createElement('div');
  icon.className = 'memora-icon';
  icon.innerHTML = '🧠'; // Placeholder for Memora Logo
  
  const tooltip = document.createElement('div');
  tooltip.className = 'memora-tooltip';
  tooltip.textContent = 'Memora is active';
  tooltip.id = 'memora-tooltip';

  wrapper.appendChild(icon);
  wrapper.appendChild(tooltip);
  shadow.appendChild(wrapper);
  document.body.appendChild(container);

  // Click to pause/resume
  let paused = false;
  wrapper.addEventListener('click', () => {
    paused = !paused;
    if (paused) {
      wrapper.style.background = '#78716c';
      tooltip.textContent = 'Memora is paused for this tab';
    } else {
      wrapper.style.background = '#11120D';
      tooltip.textContent = 'Memora is active';
    }
  });

  return { wrapper, tooltip, isPaused: () => paused };
}

const { wrapper: iconWrapper, tooltip, isPaused } = injectMemoraIcon();

function indicateSyncing() {
  iconWrapper.classList.add('syncing');
  tooltip.textContent = 'Syncing conversation...';
  setTimeout(() => {
    iconWrapper.classList.remove('syncing');
    if (!isPaused()) {
      tooltip.textContent = 'Memora is active';
    }
  }, 2000);
}


// 2. MutationObserver to watch for AI responses
// We will look for elements that signify a completed AI generation.
// This varies heavily by platform, so we'll use a generic approach for demonstration
// and platform-specific selectors in production.

let lastExtractedText = "";

function extractConversation() {
  if (isPaused()) return;

  const url = window.location.href;
  let platform = 'unknown';
  let userPrompt = '';
  let aiResponse = '';

  if (url.includes('chatgpt.com')) {
    platform = 'chatgpt';
    // Highly simplified extraction for ChatGPT
    const userNodes = document.querySelectorAll('[data-message-author-role="user"]');
    const aiNodes = document.querySelectorAll('[data-message-author-role="assistant"]');
    
    if (userNodes.length > 0 && aiNodes.length > 0) {
      userPrompt = userNodes[userNodes.length - 1].textContent;
      aiResponse = aiNodes[aiNodes.length - 1].textContent;
    }
  } else if (url.includes('claude.ai')) {
    platform = 'claude';
    // Simplified extraction for Claude
    const userNodes = document.querySelectorAll('.font-user-message'); 
    const aiNodes = document.querySelectorAll('.font-claude-message');
    
    if (userNodes.length > 0 && aiNodes.length > 0) {
      userPrompt = userNodes[userNodes.length - 1].textContent;
      aiResponse = aiNodes[aiNodes.length - 1].textContent;
    }
  } else if (url.includes('gemini.google.com')) {
    platform = 'gemini';
    const userNodes = document.querySelectorAll('user-query');
    const aiNodes = document.querySelectorAll('message-content');
    
    if (userNodes.length > 0 && aiNodes.length > 0) {
      userPrompt = userNodes[userNodes.length - 1].textContent;
      aiResponse = aiNodes[aiNodes.length - 1].textContent;
    }
  }

  // Basic deduplication check so we don't spam the backend
  const combo = userPrompt + aiResponse;
  if (!userPrompt || !aiResponse || combo === lastExtractedText) return;
  
  // Also we must check if the AI is still generating.
  // We'll assume if there is a "Stop generating" button, it's not done.
  const isGenerating = document.querySelector('button[aria-label="Stop generating"]') != null;
  if (isGenerating) return;

  lastExtractedText = combo;

  indicateSyncing();

  chrome.runtime.sendMessage({
    type: "INGEST_MEMORY",
    payload: {
      platform,
      user_prompt: userPrompt,
      ai_response: aiResponse,
      url
    }
  }, (response) => {
    console.log("Memora Extension: Ingest response", response);
  });
}

// Observe DOM changes to catch when a generation completes
const observer = new MutationObserver(() => {
  // Use a debounce so we don't parse the DOM 100 times a second
  clearTimeout(window.memoraDebounce);
  window.memoraDebounce = setTimeout(extractConversation, 1500);
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
  characterData: true
});
