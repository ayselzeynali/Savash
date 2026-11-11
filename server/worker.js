const ROOM_CODE = /^[A-HJ-NP-Z2-9]{8}$/;
const MAX_SIGNAL_BYTES = 16000;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const match = url.pathname.match(/^\/room\/([A-HJ-NP-Z2-9]{8})$/);
    if (!match) return new Response("SAVASH signaling service. Connect to /room/ROOMCODE.", { status: 404 });

    const origin = request.headers.get("Origin") || "";
    const allowedOrigins = String(env.ALLOWED_ORIGINS || "")
      .split(",").map(value => value.trim()).filter(Boolean);
    if (!origin || !allowedOrigins.includes(origin)) {
      return new Response("Origin is not allowed. Configure ALLOWED_ORIGINS in wrangler.toml.", { status: 403 });
    }
    if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
      return new Response("WebSocket upgrade required.", { status: 426 });
    }

    const code = match[1];
    const role = url.searchParams.get("role");
    if (!ROOM_CODE.test(code) || (role !== "host" && role !== "join")) {
      return new Response("Invalid room code or role.", { status: 400 });
    }

    const id = env.ROOMS.idFromName(code);
    return env.ROOMS.get(id).fetch(request);
  }
};

export class Room {
  constructor(ctx) {
    this.ctx = ctx;
  }

  async fetch(request) {
    if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
      return new Response("WebSocket upgrade required.", { status: 426 });
    }

    const url = new URL(request.url);
    const role = url.searchParams.get("role");
    if (role !== "host" && role !== "join") {
      return new Response("Invalid room role.", { status: 400 });
    }

    const activeSockets = this.ctx.getWebSockets();
    const activeRoles = activeSockets.map(socket => {
      try { return socket.deserializeAttachment()?.role || ""; } catch (_) { return ""; }
    });
    if (activeSockets.length >= 2 || activeRoles.includes(role)) {
      return new Response("Room is full or this role is already connected.", { status: 409 });
    }

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ role });

    try {
      server.send(JSON.stringify({ type: activeSockets.length ? "room-ready" : "waiting" }));
      if (activeSockets.length) {
        activeSockets[0].send(JSON.stringify({ type: "peer-joined", role }));
      }
    } catch (_) {
      try { server.close(1011, "Room initialization failed"); } catch (_) {}
      return new Response("Could not initialize room.", { status: 500 });
    }

    return new Response(null, { status: 101, webSocket: client });
  }

  webSocketMessage(socket, rawMessage) {
    if (typeof rawMessage !== "string" || new TextEncoder().encode(rawMessage).length > MAX_SIGNAL_BYTES) {
      this.sendError(socket, "Signal message is too large or invalid.");
      return;
    }

    let message;
    try { message = JSON.parse(rawMessage); } catch (_) {
      this.sendError(socket, "Signal message must be valid JSON.");
      return;
    }

    const allowed = ["offer", "answer", "ice-candidate", "leave"];
    if (!message || !allowed.includes(message.type)) {
      this.sendError(socket, "Unsupported signaling message.");
      return;
    }
    if ((message.type === "offer" || message.type === "answer") &&
        (!message.sdp || typeof message.sdp.sdp !== "string")) {
      this.sendError(socket, "Session description is missing.");
      return;
    }
    if (message.type === "ice-candidate" &&
        (!message.candidate || typeof message.candidate.candidate !== "string")) {
      this.sendError(socket, "ICE candidate is missing.");
      return;
    }

    const role = (() => {
      try { return socket.deserializeAttachment()?.role || ""; } catch (_) { return ""; }
    })();

    if (message.type === "leave") {
      this.broadcast(socket, { type: "peer-left" });
      try { socket.close(1000, "Player left"); } catch (_) {}
      return;
    }

    const relay = {
      type: message.type,
      role,
      ...(message.sdp ? { sdp: message.sdp } : {}),
      ...(message.candidate ? { candidate: message.candidate } : {})
    };
    this.broadcast(socket, relay);
  }

  webSocketClose(socket) {
    this.broadcast(socket, { type: "peer-left" });
  }

  webSocketError(socket) {
    this.broadcast(socket, { type: "peer-left" });
  }

  broadcast(sender, message) {
    const encoded = JSON.stringify(message);
    for (const socket of this.ctx.getWebSockets()) {
      if (socket === sender) continue;
      try { socket.send(encoded); } catch (_) {}
    }
  }

  sendError(socket, message) {
    try { socket.send(JSON.stringify({ type: "error", message })); } catch (_) {}
  }
}
