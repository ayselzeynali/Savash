(() => {
  "use strict";

  const $ = id => document.getElementById(id);
  const config = window.SAVASH_CONFIG || {};
  const ROOM_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let socket = null;
  let peer = null;
  let dataChannel = null;
  let localStream = null;
  let remoteAudio = null;
  let pendingCandidates = [];
  let remoteState = null;
  let role = "";
  let roomCode = "";
  let connected = false;
  let connecting = false;
  let muted = false;
  let leaving = false;

  function status(message, state) {
    const element = $("onlineStatus");
    if (!element) return;
    element.textContent = message;
    element.dataset.state = state || "idle";
  }

  function updateControls() {
    const ready = !!(dataChannel && dataChannel.readyState === "open");
    $("createRoomBtn").disabled = connecting || connected;
    $("joinRoomBtn").disabled = connecting || connected;
    $("disconnectBtn").disabled = !(connecting || connected || socket);
    $("muteBtn").disabled = !localStream;
    $("muteBtn").textContent = muted ? "UNMUTE MICROPHONE" : "MUTE MICROPHONE";
    $("startOnlineBtn").disabled = !ready;
    $("startOnlineBtn").textContent = ready ? "START ONLINE DUEL" : "WAITING FOR PLAYER...";
  }

  function makeRoomCode() {
    let code = "";
    for (let i = 0; i < 8; i++) code += ROOM_ALPHABET[Math.floor(Math.random() * ROOM_ALPHABET.length)];
    return code;
  }

  function makeSocketUrl(code, selectedRole) {
    const base = String(config.signalingUrl || "").trim();
    if (!base) throw new Error("The SAVASH signaling server has not been configured yet.");
    const url = new URL(base);
    if (url.protocol === "https:") url.protocol = "wss:";
    if (url.protocol === "http:") url.protocol = "ws:";
    if (url.protocol !== "wss:" && url.protocol !== "ws:") {
      throw new Error("The signaling URL must use HTTPS or WSS.");
    }
    url.pathname = url.pathname.replace(/\/+$/, "") + "/room/" + code;
    url.searchParams.set("role", selectedRole);
    return url.toString();
  }

  function sendSignal(message) {
    if (!socket || socket.readyState !== WebSocket.OPEN) return false;
    try {
      socket.send(JSON.stringify(message));
      return true;
    } catch (_) {
      return false;
    }
  }

  function sendData(message) {
    if (!dataChannel || dataChannel.readyState !== "open") return false;
    if (dataChannel.bufferedAmount > 32768) return false;
    try {
      dataChannel.send(JSON.stringify(message));
      return true;
    } catch (_) {
      return false;
    }
  }

  function cleanPeer() {
    if (dataChannel) {
      try { dataChannel.close(); } catch (_) {}
    }
    dataChannel = null;
    if (peer) {
      try { peer.close(); } catch (_) {}
    }
    peer = null;
    pendingCandidates = [];
    remoteState = null;
    updateControls();
  }

  function closeMedia() {
    if (localStream) localStream.getTracks().forEach(track => track.stop());
    localStream = null;
    if (remoteAudio) {
      remoteAudio.pause();
      remoteAudio.srcObject = null;
      remoteAudio.remove();
    }
    remoteAudio = null;
    muted = false;
  }

  function disconnect(showMessage = true) {
    leaving = true;
    sendSignal({ type: "leave" });
    cleanPeer();
    if (socket) {
      socket.onclose = null;
      try { socket.close(1000, "left room"); } catch (_) {}
    }
    socket = null;
    closeMedia();
    connected = false;
    connecting = false;
    role = "";
    roomCode = "";
    leaving = false;
    updateControls();
    if (showMessage) status("Disconnected. The offline campaign is still available.", "idle");
  }

  async function requestMicrophone() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      status("This browser cannot access a microphone here. Continuing with game data only.", "idle");
      return;
    }
    try {
      localStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false
      });
      muted = false;
      updateControls();
    } catch (error) {
      localStream = null;
      status("Microphone permission was not granted. The duel can still connect without voice.", "idle");
    }
  }

  function attachDataChannel(channel) {
    dataChannel = channel;
    channel.onopen = () => {
      connected = true;
      connecting = false;
      const voiceText = localStream ? "Voice microphone is ready." : "Voice is unavailable; game data is connected.";
      status("Opponent connected in room " + roomCode + ". " + voiceText, "connected");
      updateControls();
    };
    channel.onclose = () => {
      connected = false;
      updateControls();
      status("The game data channel closed. Reconnect to continue online.", "error");
    };
    channel.onerror = () => {
      status("The peer data channel reported an error.", "error");
    };
    channel.onmessage = event => {
      let message;
      try { message = JSON.parse(event.data); } catch (_) { return; }
      if (message.type === "state") {
        const x = Number(message.x), y = Number(message.y), hp = Number(message.hp);
        if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(hp)) return;
        remoteState = {
          x: Math.max(0, Math.min(1, x)),
          y: Math.max(0, Math.min(1, y)),
          hp: Math.max(0, Math.min(100, hp)),
          firing: !!message.firing,
          receivedAt: Date.now()
        };
      } else if (message.type === "hit") {
        const damage = Math.max(0, Math.min(40, Number(message.damage) || 0));
        window.dispatchEvent(new CustomEvent("savash:peer-hit", { detail: { damage } }));
      }
    };
    updateControls();
  }

  function createPeerConnection() {
    if (peer) return peer;
    const iceServers = Array.isArray(config.iceServers) ? config.iceServers : [];
    peer = new RTCPeerConnection({ iceServers });
    if (localStream) {
      localStream.getTracks().forEach(track => peer.addTrack(track, localStream));
    }
    peer.onicecandidate = event => {
      if (event.candidate && event.candidate.candidate) {
        sendSignal({ type: "ice-candidate", candidate: event.candidate.toJSON ? event.candidate.toJSON() : event.candidate });
      }
    };
    peer.ondatachannel = event => attachDataChannel(event.channel);
    peer.ontrack = event => {
      const stream = event.streams && event.streams[0]
        ? event.streams[0]
        : new MediaStream([event.track]);
      if (!remoteAudio) {
        remoteAudio = document.createElement("audio");
        remoteAudio.autoplay = true;
        remoteAudio.playsInline = true;
        remoteAudio.setAttribute("aria-label", "Opponent voice chat");
        document.body.appendChild(remoteAudio);
      }
      remoteAudio.srcObject = stream;
      const playResult = remoteAudio.play();
      if (playResult && typeof playResult.catch === "function") {
        playResult.catch(() => status("Game connected. Tap the page once to enable incoming voice audio.", "connected"));
      }
    };
    peer.onconnectionstatechange = () => {
      if (!peer) return;
      if (peer.connectionState === "connected") {
        connected = true;
        status("Peer-to-peer connection established in room " + roomCode + ".", "connected");
      } else if (peer.connectionState === "failed" || peer.connectionState === "disconnected") {
        connected = false;
        status("Peer connection " + peer.connectionState + ". A TURN relay may be required on this network.", "error");
      }
      updateControls();
    };
    return peer;
  }

  async function flushCandidates() {
    if (!peer || !peer.remoteDescription) return;
    const queued = pendingCandidates.splice(0);
    for (const candidate of queued) {
      try { await peer.addIceCandidate(new RTCIceCandidate(candidate)); } catch (_) {}
    }
  }

  async function makeOffer() {
    try {
      const connection = createPeerConnection();
      if (!dataChannel) attachDataChannel(connection.createDataChannel("savash-state", { ordered: true }));
      const offer = await connection.createOffer();
      await connection.setLocalDescription(offer);
      sendSignal({ type: "offer", sdp: connection.localDescription });
      status("Room " + roomCode + " is waiting for the other player to accept.", "connecting");
    } catch (error) {
      status("Could not create the peer offer: " + error.message, "error");
    }
  }

  async function handleSignal(message) {
    if (!message || typeof message.type !== "string") return;
    if (message.type === "waiting") {
      status("Room " + roomCode + " created. Share this code with your friend.", "connecting");
    } else if (message.type === "room-ready") {
      status("Opponent found. Negotiating the peer connection...", "connecting");
    } else if (message.type === "peer-joined") {
      if (role === "host") await makeOffer();
    } else if (message.type === "offer") {
      try {
        const connection = createPeerConnection();
        await connection.setRemoteDescription(new RTCSessionDescription(message.sdp));
        await flushCandidates();
        const answer = await connection.createAnswer();
        await connection.setLocalDescription(answer);
        sendSignal({ type: "answer", sdp: connection.localDescription });
      } catch (error) {
        status("Could not accept the peer offer: " + error.message, "error");
      }
    } else if (message.type === "answer") {
      try {
        if (!peer) return;
        await peer.setRemoteDescription(new RTCSessionDescription(message.sdp));
        await flushCandidates();
      } catch (error) {
        status("Could not finish peer negotiation: " + error.message, "error");
      }
    } else if (message.type === "ice-candidate") {
      if (!message.candidate) return;
      if (peer && peer.remoteDescription) {
        try { await peer.addIceCandidate(new RTCIceCandidate(message.candidate)); } catch (_) {}
      } else {
        pendingCandidates.push(message.candidate);
      }
    } else if (message.type === "peer-left") {
      cleanPeer();
      connected = false;
      status("The other player left. The room is waiting for another player.", "connecting");
    } else if (message.type === "error") {
      status(message.message || "The signaling server rejected this room.", "error");
    }
  }

  async function connect(selectedRole) {
    if (connecting || connected) return;
    const input = $("roomCode");
    let code = String(input.value || "").trim().toUpperCase();
    if (selectedRole === "host" && !code) code = makeRoomCode();
    if (!/^[A-HJ-NP-Z2-9]{8}$/.test(code)) {
      status("Enter an 8-character room code using letters A–Z (without I/O) and numbers 2–9.", "error");
      return;
    }
    if (!config.signalingUrl) {
      status("Online play is not active yet: the SAVASH signaling Worker has not been deployed or configured.", "error");
      return;
    }
    if (!window.WebSocket || !window.RTCPeerConnection) {
      status("This browser does not support the required WebSocket and WebRTC features.", "error");
      return;
    }

    disconnect(false);
    role = selectedRole;
    roomCode = code;
    input.value = code;
    connecting = true;
    updateControls();
    status("Requesting microphone permission and connecting to room " + roomCode + "...", "connecting");

    await requestMicrophone();
    let url;
    try {
      url = makeSocketUrl(roomCode, role);
    } catch (error) {
      connecting = false;
      status(error.message, "error");
      updateControls();
      return;
    }

    try {
      socket = new WebSocket(url);
    } catch (error) {
      connecting = false;
      status("Could not open the signaling socket: " + error.message, "error");
      updateControls();
      return;
    }

    socket.onopen = () => {
      status("Signaling server reached. Waiting for the second player...", "connecting");
      updateControls();
    };
    socket.onmessage = event => {
      let message;
      try { message = JSON.parse(event.data); } catch (_) { return; }
      handleSignal(message);
    };
    socket.onerror = () => {
      connecting = false;
      status("Could not reach the signaling server. Check the Worker URL, deployment and allowed app origin.", "error");
      updateControls();
    };
    socket.onclose = () => {
      if (leaving) return;
      connected = false;
      connecting = false;
      cleanPeer();
      closeMedia();
      updateControls();
      status("The signaling connection closed. Check the room code and server status.", "error");
    };
  }

  function showOnline() {
    $("start").classList.add("hidden");
    $("how").classList.add("hidden");
    $("online").classList.remove("hidden");
    if (!config.signalingUrl) {
      status("Online is not configured yet. The offline campaign works; deploy the signaling Worker and set config.js first.", "error");
    } else {
      status("Server URL is configured. Create a room or join a friend's 8-character code.", "idle");
    }
    updateControls();
  }

  $("onlineBtn").addEventListener("click", showOnline);
  $("createRoomBtn").addEventListener("click", () => connect("host"));
  $("joinRoomBtn").addEventListener("click", () => connect("join"));
  $("disconnectBtn").addEventListener("click", () => disconnect());
  $("muteBtn").addEventListener("click", () => {
    if (!localStream) return;
    muted = !muted;
    localStream.getAudioTracks().forEach(track => { track.enabled = !muted; });
    status(muted ? "Microphone muted. Game connection remains active." : "Microphone unmuted.", "connected");
    updateControls();
  });
  $("startOnlineBtn").addEventListener("click", () => {
    if (!dataChannel || dataChannel.readyState !== "open") return;
    $("online").classList.add("hidden");
    window.dispatchEvent(new Event("savash:start-online"));
  });
  $("onlineBackBtn").addEventListener("click", () => {
    disconnect();
    $("online").classList.add("hidden");
    $("start").classList.remove("hidden");
  });

  window.SavashNet = {
    isConnected: () => !!(dataChannel && dataChannel.readyState === "open"),
    sendGameState: state => sendData({
      type: "state",
      x: state.x,
      y: state.y,
      hp: state.hp,
      firing: !!state.firing
    }),
    sendHit: damage => sendData({ type: "hit", damage: Math.max(0, Math.min(40, Number(damage) || 0)) }),
    getRemoteState: () => {
      if (!remoteState || Date.now() - remoteState.receivedAt > 3000) return null;
      return remoteState;
    },
    disconnect
  };

  updateControls();
})();