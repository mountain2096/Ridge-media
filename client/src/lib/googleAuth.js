const SCRIPT_ID = "google-identity-services";
let scriptPromise;
let initializedClientId;
let credentialHandler;

export function loadGoogleIdentity() {
  if (window.google?.accounts?.id) return Promise.resolve(window.google.accounts.id);
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    let script = document.getElementById(SCRIPT_ID);
    const onLoad = () => {
      if (window.google?.accounts?.id) resolve(window.google.accounts.id);
      else { script.remove(); reject(new Error("Không thể tải đăng nhập Google.")); }
    };
    const onError = () => { script.remove(); reject(new Error("Không thể tải đăng nhập Google.")); };
    if (!script) {
      script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.addEventListener("load", onLoad, { once: true });
      script.addEventListener("error", onError, { once: true });
      document.head.append(script);
    } else {
      script.addEventListener("load", onLoad, { once: true });
      script.addEventListener("error", onError, { once: true });
    }
  }).catch((error) => {
    scriptPromise = undefined;
    throw error;
  });
  return scriptPromise;
}

export async function initializeGoogleIdentity(clientId, onCredential) {
  credentialHandler = onCredential;
  const identity = await loadGoogleIdentity();
  if (initializedClientId !== clientId) {
    identity.initialize({ client_id: clientId, callback: (response) => credentialHandler?.(response) });
    initializedClientId = clientId;
  }
  return identity;
}

export function clearGoogleCredentialHandler(onCredential) {
  if (credentialHandler === onCredential) credentialHandler = undefined;
}
