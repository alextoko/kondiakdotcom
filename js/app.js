import { db } from "./firebase.js";

import {
    ref,
    set,
    get,
    push,
    onValue,
    onChildAdded,
    onDisconnect
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

console.log("Firebase Connected");
console.log(db);

set(ref(db, "test"), {
    status: "online",
    time: Date.now()
}).then(() => {
    console.log("Firebase Write Success");
});

// ===========================
// ELEMENT
// ===========================

const roomIdInput = document.getElementById("roomId");
const roomPasswordInput = document.getElementById("roomPassword");
const videoUrlInput = document.getElementById("videoUrl");
const hostNameInput = document.getElementById("hostName");
const joinRoomInput = document.getElementById("joinRoomId");
const joinPasswordInput = document.getElementById("joinPassword");
const usernameInput = document.getElementById("username");
const createRoomBtn = document.getElementById("createRoomBtn");
const joinRoomBtn = document.getElementById("joinRoomBtn");
const roomDisplay = document.getElementById("roomDisplay");
const onlineCount = document.getElementById("onlineCount");
const chatMessages = document.getElementById("chatMessages");
const chatInput = document.getElementById("chatInput");
const sendMessageBtn = document.getElementById("sendMessageBtn");
const userList = document.getElementById("userList");
const fullscreenBtn = document.getElementById("fullscreenBtn");
const copyRoomBtn = document.getElementById("copyRoomBtn");
const videoPlayer = document.getElementById("videoPlayer");
const hostPanel = document.getElementById("hostPanel");
const joinPanel = document.getElementById("joinPanel");
const isHostPage = window.location.href.includes("host.html");

if(isHostPage){

    createRoomBtn.disabled = true;

    function checkHostForm(){

        createRoomBtn.disabled =
            !hostNameInput?.value.trim() ||
            !roomIdInput?.value.trim() ||
            !roomPasswordInput?.value.trim() ||
            !videoUrlInput?.value.trim();

    }

    hostNameInput?.addEventListener(
        "input",
        checkHostForm
    );

    roomIdInput?.addEventListener(
        "input",
        checkHostForm
    );

    roomPasswordInput?.addEventListener(
        "input",
        checkHostForm
    );

    videoUrlInput?.addEventListener(
        "input",
        checkHostForm
    );

    checkHostForm();

}else if(
    usernameInput &&
    joinRoomInput &&
    joinPasswordInput
){

    function checkJoinForm(){

        joinRoomBtn.disabled =
            !usernameInput.value.trim() ||
            !joinRoomInput.value.trim() ||
            !joinPasswordInput.value.trim();

    }

    usernameInput.addEventListener(
        "input",
        checkJoinForm
    );

    joinRoomInput.addEventListener(
        "input",
        checkJoinForm
    );

    joinPasswordInput.addEventListener(
        "input",
        checkJoinForm
    );

    checkJoinForm();

}

// ===========================
// VARIABLE
// ===========================

let currentRoom = "";
let isHost = false;
let ignoreSync = false;
let hostStarted = false;
let hls = null;

let uid = localStorage.getItem("uid");

if (!uid) {

    uid =
        "user_" +
        Math.random()
        .toString(36)
        .substring(2, 10);

    localStorage.setItem(
        "uid",
        uid
    );

}

console.log("UID =", uid);

// ===========================
// CREATE ROOM
// ===========================

createRoomBtn?.addEventListener("click", async () => {

    const roomId =
        roomIdInput.value.trim();

    const password =
        roomPasswordInput.value.trim();

    const videoUrl =
        videoUrlInput.value.trim();

    const hostName =
        hostNameInput.value.trim() ||
        "Host";

    if (!hostNameInput.value.trim()) {
        alert("Nama Host kosong");
        return;
    }

    if (!roomId) {
        alert("Room ID kosong");
        return;
    }

    if (!password) {
        alert("Password Room kosong");
        return;
    }

    if (!videoUrl) {
        alert("Link video kosong");
        return;
    }

    await set(
        ref(db, `rooms/${roomId}`),
        {
            hostName,
            password,
            videoUrl,
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

    isHost = true;

    console.log("HOST CREATED");
    console.log("isHost =", isHost);
    console.log("room =", roomId);

    localStorage.setItem(
        `host_${roomId}`,
        "true"
    );

    updateHostUI();

    roomDisplay.textContent =
        "Room : " + roomId;

    joinUser();
    loadRoom();

    alert("Room berhasil dibuat");

});

// ===========================
// JOIN ROOM
// ===========================

joinRoomBtn?.addEventListener("click", async () => {

    const roomId =
        joinRoomInput.value.trim();

    const password =
        joinPasswordInput.value.trim();

    if (!roomId) {
        alert("Masukkan Room ID");
        return;
    }

    const snap = await get(
        ref(db, `rooms/${roomId}`)
    );

    if (!snap.exists()) {
        alert("Room tidak ditemukan");
        return;
    }

    const room = snap.val();

    if (room.password !== password) {
        alert("Password salah");
        return;
    }

    currentRoom = roomId;

    roomDisplay.textContent =
        "Room : " + roomId;

    isHost = false;

    updateHostUI();

    joinUser();
    loadRoom();
    lockViewer();

});

// ===========================
// JOIN USER
// ===========================

function joinUser() {

    let username;

    if(isHostPage){

        username =
            hostNameInput?.value.trim() ||
            "Host";

    }else{

        username =
            usernameInput?.value.trim() ||
            "Guest";

    }

    const userRef =
        ref(
            db,
            `rooms/${currentRoom}/users/${uid}`
        );

    set(userRef,{
        name:username,
        host:isHost
    });

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

    onValue(usersRef, snap => {

        userList.innerHTML = "";

        let count = 0;

        snap.forEach(child => {

            count++;

            const user =
                child.val();

            const div =
                document.createElement("div");

            div.className =
                "user-item";

            div.innerHTML = `
            <div class="user-avatar">
            ${user.name.charAt(0).toUpperCase()}
            </div>

            <div class="user-name">
            ${user.host ? "👑 " : ""}
            ${user.name}
            </div>
            `;

            userList.appendChild(div);

        });

        onlineCount.textContent =
            "Online : " + count;

    });

}

// ===========================
// CHAT
// ===========================

sendMessageBtn?.addEventListener(
    "click",
    sendMessage
);

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

    const text =
        chatInput.value.trim();

    if (!text) return;

    let username;

    if(isHostPage){

        username =
            hostNameInput?.value.trim() ||
            "Host";

    }else{

        username =
            usernameInput?.value.trim() ||
            "Guest";

    }

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
                document.createElement("div");

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

            chatMessages.appendChild(div);

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

        // Bersihkan player lama
        if(hls){

            hls.destroy();
            hls = null;

        }

        videoPlayer.pause();

        // ==========================
        // HLS (.m3u8)
        // ==========================

        if(
            videoSrc.includes(".m3u8")
        ){

            console.log("Loading HLS Stream");

            if(
                Hls.isSupported()
            ){

                hls = new Hls({

                    enableWorker:true,
                    lowLatencyMode:true

                });

                hls.loadSource(videoSrc);

                hls.attachMedia(videoPlayer);

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

                        console.error("========== HLS ERROR ==========");
                        console.error("TYPE :", data.type);
                        console.error("DETAILS :", data.details);
                        console.error("FATAL :", data.fatal);
                        console.error(data);

                    }
);

            }
            else if(
                videoPlayer.canPlayType(
                    "application/vnd.apple.mpegurl"
                )
            ){

                videoPlayer.src =
                    videoSrc;

            }

        }

        // ==========================
        // MP4 / WEBM
        // ==========================

        else{

            videoPlayer.src =
                videoSrc;

            videoPlayer.load();

        }

    });

    videoPlayer.addEventListener(
        "loadedmetadata",
        async () => {

            if(isHost) return;

            const snap = await get(
                ref(
                    db,
                    `rooms/${currentRoom}/state`
                )
            );

            if(!snap.exists()) return;

            const state = snap.val();

            ignoreSync = true;

            videoPlayer.currentTime =
                state.currentTime;

            if(state.playing){

                await videoPlayer
                    .play()
                    .catch(()=>{});

            }else{

                videoPlayer.pause();

            }

            setTimeout(() => {

                ignoreSync = false;

            },1000);

        }
    );

}

// ===========================
// VIDEO EVENT
// ===========================

videoPlayer.addEventListener(
    "loadedmetadata",
    () => {

        console.log("Video Loaded");
        console.log(
            "Duration:",
            videoPlayer.duration
        );

    }
);

videoPlayer.addEventListener(
    "canplay",
    () => {

        console.log("Video Ready");

    }
);

videoPlayer.addEventListener(
    "error",
    () => {

        console.error("VIDEO ERROR");

        console.error(
            "CODE :",
            videoPlayer.error?.code
        );

        console.error(
            "MESSAGE :",
            videoPlayer.error
        );

    }
);

function setupVideoSync(){

    const stateRef =
        ref(db, `rooms/${currentRoom}/state`);

    onValue(stateRef, snap => {

        if(!snap.exists()) return;
        if(isHost) return;

        const state = snap.val();

        hostStarted = state.playing;

        if(videoPlayer.readyState < 1){
            return;
        }

        ignoreSync = true;

        const drift =
            Math.abs(
                videoPlayer.currentTime -
                state.currentTime
            );

        if(drift > 0.5){

            videoPlayer.currentTime =
                state.currentTime;

        }

        if(state.playing){

            videoPlayer.play()
            .catch(()=>{});

        }else{

            videoPlayer.pause();

        }

        setTimeout(() => {

            ignoreSync = false;

        },300);

    });

}

// ===========================
// HOST TIME SYNC
// ===========================

setInterval(async () => {

    if(!isHost) return;
    if(!currentRoom) return;
    if(videoPlayer.readyState < 2) return;

    console.log(
        "HOST SEND:",
        videoPlayer.currentTime
    );

    await set(
        ref(db, `rooms/${currentRoom}/state`),
        {
            playing: !videoPlayer.paused,
            currentTime: videoPlayer.currentTime,
            updatedAt: Date.now()
        }
    );

}, 500);

function updateHostUI(){

    if(isHost){

        videoPlayer.controls = true;

        videoPlayer.style.pointerEvents = "auto";

        return;
    }

    videoPlayer.controls = false;

    videoPlayer.style.pointerEvents = "none";

}

// ===========================
// FULLSCREEN
// ===========================

fullscreenBtn.addEventListener(
    "click",
    () => {

        videoPlayer.requestFullscreen();

    }
);

// ===========================
// COPY ROOM LINK
// ===========================

copyRoomBtn?.addEventListener(
    "click",
    () => {

        if (!currentRoom) {
            alert("Belum masuk room");
            return;
        }

        const url =`${location.origin}/index.html?room=${currentRoom}`;

        navigator.clipboard.writeText(url);

        alert("Link room berhasil disalin");

    }
);

// ===========================
// AUTO JOIN URL
// ===========================

videoPlayer.addEventListener("play", async ()=>{

    console.log("PLAY EVENT");
    console.log("isHost =", isHost);
    console.log("currentRoom =", currentRoom);

    if(!isHost) return;
    if(ignoreSync) return;

    await set(
        ref(db, `rooms/${currentRoom}/state`),
        {
            playing:true,
            currentTime:videoPlayer.currentTime,
            updatedAt:Date.now()
        }
    );

    console.log("STATE UPDATED");

});

videoPlayer.addEventListener("pause", async ()=>{

    if(!isHost) return;
    if(ignoreSync) return;

    await set(
        ref(db, `rooms/${currentRoom}/state`),
        {
            playing:false,
            currentTime:videoPlayer.currentTime,
            updatedAt:Date.now()
        }
    );

});

videoPlayer.addEventListener("seeked", async ()=>{

    if(!isHost) return;
    if(ignoreSync) return;

    await set(
        ref(db, `rooms/${currentRoom}/state`),
        {
            playing:!videoPlayer.paused,
            currentTime:videoPlayer.currentTime,
            updatedAt:Date.now()
        }
    );

});

const params =
    new URLSearchParams(
        location.search
    );

const roomParam =
    params.get("room");

if (
    roomParam &&
    joinRoomInput
) {

    joinRoomInput.value =
        roomParam;

}

function lockViewer(){

    if(isHost) return;

    videoPlayer.controls = false;

    // cegah play manual
    videoPlayer.addEventListener("play", () => {

        if(ignoreSync) return;

        if(!hostStarted){

            videoPlayer.pause();

        }

    });

    // cegah pause manual
    videoPlayer.addEventListener("pause", () => {

        if(ignoreSync) return;

        get(
            ref(db, `rooms/${currentRoom}/state`)
        ).then(snap => {

            if(!snap.exists()) return;

            const state = snap.val();

            if(state.playing){

                ignoreSync = true;

                videoPlayer.play()
                .catch(()=>{});

                setTimeout(() => {

                    ignoreSync = false;

                },300);

            }

        });

    });

    // cegah seek manual
    videoPlayer.addEventListener("seeking", () => {

        if(ignoreSync) return;

        get(
            ref(db, `rooms/${currentRoom}/state`)
        ).then(snap => {

            if(!snap.exists()) return;

            const state = snap.val();

            ignoreSync = true;

            videoPlayer.currentTime =
                state.currentTime;

            setTimeout(() => {

                ignoreSync = false;

            },300);

        });

    });

}