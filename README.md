# SAVASH

SAVASH is a mobile-first squad-combat game. The offline campaign has 20 waves, a five-soldier squad, touch controls, pause/resume, and a boss on every fifth wave. The existing SAVASH artwork remains the menu and battlefield background.

## Current game modes

- **Offline campaign:** runs locally in the browser or Capacitor Android wrapper.
- **Private online duel prototype:** two players join an 8-character room code. WebRTC DataChannel exchanges player position, health and hit events; a WebRTC audio track carries voice directly between the two devices.
- There is no public matchmaking, account system, authoritative game server, anti-cheat, or persistent leaderboard yet. In this first peer-to-peer duel, each device simulates its own local game state, so it is suitable for a prototype rather than ranked play.

## Run the static game

Open \`index.html\` from a local web server or GitHub Pages. Microphone access and WebRTC require a secure context (HTTPS, or the secure localhost origin in the Android wrapper). The offline campaign does not require a backend.

## Enable real online rooms and voice

The client deliberately does **not** pretend to be online while the server URL is blank.

1. Create a Cloudflare account and deploy the signaling Worker in \`server/\`:
   - Install Wrangler and authenticate with \`npx wrangler login\`.
   - Edit \`server/wrangler.toml\`: replace \`https://YOUR-APP-DOMAIN\` with the exact web-app origin. Keep \`https://localhost\` for the Capacitor Android WebView origin.
   - From the \`server\` directory run \`npx wrangler deploy\`.
2. Copy the deployed Worker host into \`config.js\` as \`signalingUrl\`, for example \`https://savash-signaling.YOUR-SUBDOMAIN.workers.dev\`. The client converts HTTPS to WSS and appends the room path.
3. The default ICE configuration uses a public STUN server. Some mobile networks and restrictive NATs require a TURN relay. Configure a TURN provider and short-lived TURN credentials in the client build/runtime configuration if needed. **Do not commit permanent TURN usernames, passwords, API tokens, or Cloudflare secrets to this public repository.**
4. Rebuild the Android app or refresh the hosted web app. One player creates a room and shares the 8-character code; the other joins it. Both players must grant microphone permission for two-way voice.

### What the signaling Worker does

The Cloudflare Durable Object accepts at most two WebSocket participants per room and relays only WebRTC offer/answer and ICE-candidate messages. Voice audio and duel state travel peer-to-peer between the devices; the Worker does not receive or record audio.

Room codes act as bearer invitations. Share them privately. The prototype has no user authentication or server-authoritative hit validation; a production competitive mode needs authenticated players, server-authoritative simulation, abuse controls, and monitoring.

## Build and checks

- \`npm run check\` checks JavaScript syntax and verifies the required local assets and script references.
- The GitHub Actions workflow builds a debug APK and uploads it as a workflow artifact on pull requests and configured branch pushes.
- The Cloudflare Worker is **not deployed by GitHub Actions**. Deployment requires the owner's Cloudflare account and explicit setup of the allowed origins.

## Current setup blockers

- No Cloudflare account binding, Worker deployment URL, or deployment credentials are present in this repository.
- The allowed web origin must be confirmed and entered in \`server/wrangler.toml\`.
- TURN credentials/service are not configured. Direct WebRTC may work with STUN alone, but some networks will need TURN.
