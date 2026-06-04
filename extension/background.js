// e:/memora/extension/background.js

const API_BASE = "http://localhost:8000/api";

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "LOGIN") {
    handleLogin(request.email, request.password).then(sendResponse);
    return true; // Keep message channel open for async response
  }
  
  if (request.type === "LOGOUT") {
    chrome.storage.local.remove("memora_token", () => {
      sendResponse({ success: true });
    });
    return true;
  }
  
  if (request.type === "CHECK_AUTH") {
    chrome.storage.local.get("memora_token", (data) => {
      sendResponse({ isAuthenticated: !!data.memora_token });
    });
    return true;
  }
  
  if (request.type === "INGEST_MEMORY") {
    handleIngest(request.payload).then(sendResponse);
    return true;
  }
});

async function handleLogin(email, password) {
  try {
    // Note: Assuming a standard OAuth2 / token endpoint or a custom auth endpoint.
    // The backend uses Supabase, but typically there's an API route or we use Supabase directly.
    // We'll mock the token storage assuming the backend provides it, or we can use the /api/auth/login endpoint if it exists.
    // Since we don't have the exact auth endpoint documented, we'll try a standard fetch and store whatever token we get.
    
    // For local dev without a real auth endpoint exposed yet, let's just assume we get a token.
    // If there is an auth endpoint, it would be here:
    // const res = await fetch(`${API_BASE}/auth/login`, { ... });
    
    // As a placeholder, we just set a dummy token so the UI works, 
    // but in reality we'd hit the backend or Supabase endpoint.
    const token = "dummy-jwt-token"; 
    
    await chrome.storage.local.set({ memora_token: token });
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function handleIngest(payload) {
  try {
    const data = await chrome.storage.local.get(["memora_token", "global_pause"]);
    
    if (data.global_pause) {
      return { status: "paused" };
    }
    
    const token = data.memora_token;
    if (!token) {
      return { status: "error", error: "Not authenticated" };
    }
    
    const res = await fetch(`${API_BASE}/extension/ingest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // 'Authorization': `Bearer ${token}` // Usually required, but we'll include it
      },
      body: JSON.stringify(payload)
    });
    
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    
    const result = await res.json();
    return { status: "success", data: result };
    
  } catch (err) {
    console.error("Ingest failed:", err);
    return { status: "error", error: err.message };
  }
}
