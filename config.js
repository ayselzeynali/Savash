// SAVASH client configuration.
// Leave signalingUrl empty until the signaling Worker has been deployed.
// Do not commit long-lived TURN credentials to this public repository.
window.SAVASH_CONFIG = {
  signalingUrl: "",
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" }
  ],
  stateIntervalMs: 100
};
