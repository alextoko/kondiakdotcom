import { db } from "./firebase.js";
import {ref,set,get,push,onValue,onChildAdded,onDisconnect} 
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

console.log("Firebase Connected");
console.log(db);

set(ref(db, "test"), {
status: "online",
time: Date.now()
}).then(() => {
console.log("Firebase Write Success");
});

// ===========================
// ELEMENT HOST
// ===========================

const roomIdInput = document.getElementById("roomId");
const roomPasswordInput = document.getElementById("roomPassword");
const videoUrlInput = document.getElementById("videoUrl");
const hostNameInput = document.getElementById("hostName");
const createRoomBtn = document.getElementById("createRoomBtn");
const roomDisplay = document.getElementById("roomDisplay");
const onlineCount = document.getElementById("onlineCount");
const chatMessages = document.getElementById("chatMessages");
const chatInput = document.getElementById("chatInput");
const sendMessageBtn = document.getElementById("sendMessageBtn");
const userList = document.getElementById("userList");
const fullscreenBtn = document.getElementById("fullscreenBtn");
const copyRoomBtn = document.getElementById("copyRoomBtn");
const endRoomBtn = document.getElementById("endRoomBtn");
const videoPlayer = document.getElementById("videoPlayer");

// ===========================
// HOST FORM
// ===========================

createRoomBtn.style.display ="block";
endRoomBtn.style.display ="none";
createRoomBtn.disabled = true;

function checkHostForm(){
createRoomBtn.disabled =
    !hostNameInput?.value.trim() ||
    !roomIdInput?.value.trim() ||
    !roomPasswordInput?.value.trim() ||
    !videoUrlInput?.value.trim();
}

hostNameInput?.addEventListener("input",checkHostForm);
roomIdInput?.addEventListener("input",checkHostForm);
roomPasswordInput?.addEventListener("input",checkHostForm);
videoUrlInput?.addEventListener("input",checkHostForm);
checkHostForm();

// ===========================
// VARIABLE
// ===========================

let currentRoom = "";
let isHost = true;
let ignoreSync = false;
let hostStarted = false;
let hls = null;
let uid = localStorage.getItem("uid");

if (!uid) {
uid = "user_" + Math.random().toString(36).substring(2, 10);
localStorage.setItem("uid",uid);
}

console.log("UID =", uid);

// ===========================
// CREATE ROOM
// ===========================

createRoomBtn?.addEventListener(
"click",
async () => {
    const roomId = roomIdInput.value.trim();
    const password = roomPasswordInput.value.trim();
    const videoUrl = videoUrlInput.value.trim();
    const hostName = hostNameInput.value.trim() || "Host";

    if (!hostNameInput.value.trim()) {alert("Nama Host kosong");
        return;
    }

    if (!roomId) {alert("Room ID kosong");
        return;
    }

    if (!password) {alert("Password Room kosong");
        return;
    }

    if (!videoUrl) {alert("Link video kosong");
        return;
    }

    await set(
        ref(db, `rooms/${roomId}`),
        {
            hostName,password, videoUrl,
            host: uid,
            state: {
                playing: false,
                currentTime: 0,
                updatedAt: Date.now()
            },

            createdAt: Date.now()
        }
    );

    currentRoom = roomId;
    createRoomBtn.style.display = "none";
    endRoomBtn.style.display = "block";
    console.log("HOST CREATED");
    console.log("room =", roomId);

    localStorage.setItem(
        `host_${roomId}`,
        "true"
    );

    updateHostUI();
    roomDisplay.textContent = "Room : " + roomId;
    joinUser();
    loadRoom();
    alert("Room berhasil dibuat");
}

);

// ===========================
// JOIN USER
// ===========================

function joinUser() {
const username = hostNameInput?.value.trim() || "Host";
const userRef = ref( db, `rooms/${currentRoom}/users/${uid}`);

set(
    userRef,
    {
        name: username,
        host: true
    }
);

onDisconnect(userRef).remove();

}

// ===========================
// LOAD ROOM
// ===========================

function loadRoom() {
loadUsers();
loadChat();
loadVideo();
setupVideoSync();
}

// ===========================
// LOAD USERS
// ===========================

function loadUsers() {
const usersRef =
    ref(
        db,
        `rooms/${currentRoom}/users`
    );

onValue(
    usersRef,
    snap => {

        userList.innerHTML = "";

        let count = 0;
        const users = [];

        snap.forEach(child => {

            count++;

            users.push(
                child.val()
            );

        });

        // HOST selalu di atas
        users.sort(
            (a,b) => {
                if(a.host && !b.host) return -1;
                if(!a.host && b.host) return 1;
                return 0;
            }
        );

        users.forEach(user => {

            const div =
                document.createElement("div");

            div.className =
                "user-item";

            div.innerHTML = `
            <div class="user-avatar">
            ${user.name.charAt(0).toUpperCase()}
            </div>

            <div class="user-name">
            ${user.name}
            </div>

            <div class="user-role ${user.host ? "host" : "viewer"}">
            ${user.host ? "HOST" : "VIEWER"}
            </div>
            `;

            userList.appendChild(div);

        });

        onlineCount.textContent =
            "Online : " + count;
    }
);

}

// ===========================
// CHAT
// ===========================

sendMessageBtn?.addEventListener("click",sendMessage);
chatInput?.addEventListener(
"keypress",
e => {

    if (e.key === "Enter") {
        sendMessage();
    }
}

);

function sendMessage() {
if (!currentRoom) return;
const text = chatInput.value.trim();
if (!text) return;
const username = hostNameInput?.value.trim() || "Host";

push(
    ref(
        db,
        `rooms/${currentRoom}/chat`
    ),
    {
        user: username,
        text,
        time: Date.now()
    }
);

chatInput.value = "";
}

function loadChat() {
chatMessages.innerHTML = "";

const chatRef =
    ref(
        db,
        `rooms/${currentRoom}/chat`
    );

onChildAdded(
    chatRef,
    snap => {

        const msg =
            snap.val();

        const div =
            document.createElement(
                "div"
            );

        div.className =
            "chat-message";

        div.innerHTML = `
        <div class="chat-user">
        ${msg.user}
        </div>

        <div class="chat-text">
        ${msg.text}
        </div>
        `;

        chatMessages.appendChild(
            div
        );

        chatMessages.scrollTop =
            chatMessages.scrollHeight;
    }
);
}

// ===========================
// LOAD VIDEO
// ===========================

function loadVideo() {
const videoRef =
    ref(
        db,
        `rooms/${currentRoom}/videoUrl`
    );

onValue(videoRef, snap => {
    if(!snap.exists()) return;
    const videoSrc = snap.val();
    console.log("Video SRC :", videoSrc);

    if(hls){

        hls.destroy();
        hls = null;

    }

    videoPlayer.pause();

    if(
        videoSrc.includes(".m3u8")
    ){

        console.log(
            "Loading HLS Stream"
        );

        if(
            Hls.isSupported()
        ){

            hls = new Hls({

                enableWorker:true,
                lowLatencyMode:true

            });

            hls.loadSource(
                videoSrc
            );

            hls.attachMedia(
                videoPlayer
            );

            hls.on(
                Hls.Events.MANIFEST_PARSED,
                () => {

                    console.log(
                        "HLS READY"
                    );

                }
            );

            hls.on(
                Hls.Events.ERROR,
                (event, data) => {

                    console.error(
                        "========== HLS ERROR =========="
                    );

                    console.error(
                        "TYPE :",
                        data.type
                    );

                    console.error(
                        "DETAILS :",
                        data.details
                    );

                    console.error(
                        "FATAL :",
                        data.fatal
                    );

                    console.error(
                        data
                    );
                }
            );
        }
        else if(
            videoPlayer.canPlayType(
                "application/vnd.apple.mpegurl"
            )
        ){
            videoPlayer.src = videoSrc;
        }

    }else{

        videoPlayer.src = videoSrc;
        videoPlayer.load();
    }
});
}

// ===========================
// VIDEO EVENT
// ===========================

videoPlayer.addEventListener(
"loadedmetadata",
() => {
    console.log( "Video Loaded");
    console.log( "Duration:", videoPlayer.duration);
}
);

videoPlayer.addEventListener(
"canplay",
() => {
    console.log( "Video Ready" );
}
);

videoPlayer.addEventListener(
"error",
() => {
    console.error( "VIDEO ERROR");
    console.error( "CODE :", videoPlayer.error?.code );
    console.error( "MESSAGE :", videoPlayer.error );
}
);

// ===========================
// VIDEO SYNC
// ===========================

function setupVideoSync(){
const stateRef = ref( db, `rooms/${currentRoom}/state` );

onValue(
    stateRef,
    snap => {
        if(!snap.exists()) return;
        const state = snap.val();
        hostStarted = state.playing;
    }
);
}

// ===========================
// HOST TIME SYNC
// ===========================

setInterval(
async () => {
    if(!isHost) return;
    if(!currentRoom) return;
    if( videoPlayer.readyState < 2) return;
    console.log( "HOST SEND:", videoPlayer.currentTime );
    await set( ref( db, `rooms/${currentRoom}/state` ),
        {
            playing: !videoPlayer.paused,
            currentTime: videoPlayer.currentTime,
            updatedAt: Date.now()
        }
    );
},
500
);

// ===========================
// HOST UI
// ===========================

function updateHostUI(){
videoPlayer.controls = true;
videoPlayer.style.pointerEvents = "auto";
}

// ===========================
// FULLSCREEN
// ===========================

fullscreenBtn?.addEventListener("click",() => { videoPlayer .requestFullscreen();});

// ===========================
// END ROOM
// ===========================

endRoomBtn?.addEventListener("click",
async () => {

        if(!currentRoom){ alert("Belum ada room aktif");
             return;
        }

        const ok = confirm("Yakin ingin mengakhiri room?");

        if(!ok) return;

        await set(
            ref(db,
            `rooms/${currentRoom}/ended` ),
            true);

        alert( "Room telah diakhiri");
    }
);

// ===========================
// COPY ROOM LINK
// ===========================

copyRoomBtn?.addEventListener(
"click",
() => {

    if (!currentRoom) {
        alert( "Belum masuk room");
        return;
    }

    const url = `${location.origin}/index.html?room=${currentRoom}`;
    navigator.clipboard .writeText(url)
    alert( "Link room berhasil disalin" );
}
);

// ===========================
// HOST PLAY SYNC
// ===========================

videoPlayer.addEventListener(
"play",
async ()=>{
    console.log( "PLAY EVENT" );
    console.log( "isHost =", isHost );
    console.log( "currentRoom =", currentRoom );

    if(!isHost) return;
    if(ignoreSync) return;
    await set( ref( db, `rooms/${currentRoom}/state` ),
        {
            playing:true,
            currentTime: videoPlayer.currentTime,
            updatedAt: Date.now()
        }
    );
    console.log( "STATE UPDATED" );
}
);

// ===========================
// HOST PAUSE SYNC
// ===========================

videoPlayer.addEventListener("pause",
async ()=>{
    if(!isHost) return;
    if(ignoreSync) return;
    await set(
        ref( db, `rooms/${currentRoom}/state` ),
        {
            playing:false,
            currentTime: videoPlayer.currentTime,
            updatedAt: Date.now()
        }
    );
}
);

// ===========================
// HOST SEEK SYNC
// ===========================

videoPlayer.addEventListener(
"seeked",
async ()=>{
    if(!isHost) return;
    if(ignoreSync) return;
    await set(
        ref( db, `rooms/${currentRoom}/state` ),
        {
            playing: !videoPlayer.paused,
            currentTime: videoPlayer.currentTime,
            updatedAt: Date.now()
        }
    );
}
);
