import { io } from "socket.io-client";
import { API_BASE } from "./api.js";

// One shared realtime connection for the whole signed-in app.
// - getSocket(): the socket object (created on first use, not yet connected),
//   so any component can attach listeners.
// - connectSocket(): called once by AppLayout after sign-in.
// - disconnectSocket(): called on sign-out / unmount.
let socket = null;

export function getSocket() {
  if (!socket) {
    socket = io(API_BASE || undefined, {
      autoConnect: false,
      // A function so every (re)connect sends the current token.
      auth: (callback) => callback({ token: localStorage.getItem("token") || "" }),
    });
  }
  return socket;
}

export function connectSocket() {
  const instance = getSocket();
  if (!instance.active) instance.connect();
  return instance;
}

export function disconnectSocket() {
  if (!socket) return;
  socket.disconnect();
  socket.removeAllListeners();
  socket = null;
}
