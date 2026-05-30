import { joinRoom } from 'trystero/nostr';

const APP_ID = 'cockroach-call-appid'; // Have a static value; DON'T Randomize

const RTC_CONFIG = { iceServers: [
      {
        urls: [
              'stun:stun.l.google.com:19302',
              'stun:stun.apple.com:3478',
              'stun:stun.services.apple.com:3478'
        ]
      },
      // {
      //   urls: "turn:global.relay.metered.ca:80",
      //   username: "as-given",
      //   credential: "as-given",
      // },
      // {
      //   urls: "turn:global.relay.metered.ca:80?transport=tcp",
      //   username: "as-given",
      //   credential: "as-given",
      // },
      // {
      //   urls: "turn:global.relay.metered.ca:443",
      //   username: "as-given",
      //   credential: "as-given",
      // },
      // {
      //   urls: "turns:global.relay.metered.ca:443?transport=tcp",
      //   username: "as-given",
      //   credential: "as-given",
      // },
] };

const lobby = document.getElementById('lobby');
const callView = document.getElementById('call');
const createBtn = document.getElementById('createBtn');
const joinBtn = document.getElementById('joinBtn');
const joinInput = document.getElementById('joinInput');
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const statusEl = document.getElementById('status');
const muteBtn = document.getElementById('muteBtn');
const videoBtn = document.getElementById('videoBtn');
const leaveBtn = document.getElementById('leaveBtn');
const inviteLink = document.getElementById('inviteLink');
const copyBtn = document.getElementById('copyBtn');

let room = null;
let localStream = null;
let partnerId = null; 

function setStatus(text) {
  statusEl.textContent = text;
}

if (!window.isSecureContext) {
  createBtn.disabled = true;
  joinBtn.disabled = true;
  const notice = document.createElement('p');
  notice.className = 'tagline';
  notice.style.color = '#e0564b';
  notice.textContent =
    'Camera access is blocked: this page is not on a secure origin. Open it ' +
    'at http://localhost:<port> — not 0.0.0.0 or a LAN IP — or serve it over HTTPS.';
  document.querySelector('.tagline').after(notice);
}

// ---------------------------------------------------------------------------
// Routing — the room key lives in the URL hash, so it is never sent to a
// server (there is no server) and never appears in any request log.
// ---------------------------------------------------------------------------
function route() {
  const roomId = location.hash.slice(1);
  if (roomId) {
    enterRoom(roomId);
  } else {
    lobby.hidden = false;
    callView.hidden = true;
  }
}
window.addEventListener('hashchange', route);

createBtn.addEventListener('click', () => {
  location.hash = crypto.randomUUID();
});

joinBtn.addEventListener('click', () => {
  const key = joinInput.value.trim();
  if (key) location.hash = key;
});

async function enterRoom(roomId) {
  lobby.hidden = true;
  callView.hidden = false;
  // Relative invite link, so it works wherever the static files are hosted.
  inviteLink.value = `${location.origin}${location.pathname}#${roomId}`;
  setStatus('Requesting camera and microphone access…');

  try {
    localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
  } catch (err) {
    setStatus(`Cannot access camera/microphone: ${err.message}`);
    return;
  }
  localVideo.srcObject = localStream;

  connectRoom(roomId);
}

function connectRoom(roomId) {
  setStatus('Waiting for the other person to join…');

  room = joinRoom({ appId: APP_ID, rtcConfig: RTC_CONFIG }, roomId);

  // Send our camera/mic to peers. Trystero's addStream() only reaches peers
  // connected at call time, so this single call covers anyone already in the
  // room when we arrive...
  room.addStream(localStream);

  room.onPeerJoin((peerId) => {
    // ...and this covers peers who join after us. Re-adding the stream per
    // new peer is required — without it the peers connect but no media is
    // ever attached to the connection, so nothing plays.
    room.addStream(localStream, peerId);

    // The room is meant for two; the first peer we meet becomes our partner.
    if (!partnerId) {
      partnerId = peerId;
      setStatus('Peer found — connecting…');
    }
  });

  room.onPeerStream((stream, peerId) => {
    // Adopt the first peer we hear from if onPeerJoin has not landed yet.
    if (!partnerId) partnerId = peerId;
    if (peerId !== partnerId) return;
    remoteVideo.srcObject = stream;
    setStatus('Connected — your call is now direct, peer-to-peer.');
  });

  room.onPeerLeave((peerId) => {
    if (peerId !== partnerId) return;
    partnerId = null;
    remoteVideo.srcObject = null;
    setStatus('The other person left the call.');
  });
}

// ---------------------------------------------------------------------------
// In-call controls
// ---------------------------------------------------------------------------
muteBtn.addEventListener('click', () => {
  const track = localStream && localStream.getAudioTracks()[0];
  if (!track) return;
  track.enabled = !track.enabled;
  muteBtn.textContent = track.enabled ? 'Mute' : 'Unmute';
});

videoBtn.addEventListener('click', () => {
  const track = localStream && localStream.getVideoTracks()[0];
  if (!track) return;
  track.enabled = !track.enabled;
  videoBtn.textContent = track.enabled ? 'Stop Video' : 'Start Video';
});

leaveBtn.addEventListener('click', () => {
  if (room) room.leave();
  if (localStream) localStream.getTracks().forEach((track) => track.stop());
  window.location.href = location.pathname; 
});

copyBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(inviteLink.value);
    copyBtn.textContent = 'Copied!';
    setTimeout(() => { copyBtn.textContent = 'Copy'; }, 1500);
  } catch {
    inviteLink.select();
    document.execCommand('copy');
  }
});

route();
