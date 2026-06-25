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

// ===========================
// ELEMENT VIEWER
// ===========================

const joinRoomInput =
document.getElementById("joinRoomId");

const joinPasswordInput =
document.getElementById("joinPassword");

const usernameInput =
document.getElementById("username");

const joinRoomBtn =
document.getElementById("joinRoomBtn");

const roomDisplay =
document.getElementById("roomDisplay");

const onlineCount =
document.getElementById("onlineCount");

const chatMessages =
document.getElementById("chatMessages");

const chatInput =
document.getElementById("chatInput");

const sendMessageBtn =
document.getElementById("sendMessageBtn");

const userList =
document.getElementById("userList");

const fullscreenBtn =
document.getElementById("fullscreenBtn");

const videoPlayer =
document.getElementById("videoPlayer");

// ===========================
// FORM JOIN
// ===========================

joinRoomBtn.disabled = true;

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

// ===========================
// VARIABLE
// ===========================

let currentRoom = "";
let isHost = false;
let ignoreSync = false;
let hostStarted = false;
let hls = null;

let uid =
localStorage.getItem("uid");

if(!uid){


uid =
    "user_" +
    Math.random()
    .toString(36)
    .substring(2,10);

localStorage.setItem(
    "uid",
    uid
);


}

// ===========================
// JOIN ROOM
// ===========================

joinRoomBtn.addEventListener(
"click",
async () => {


    const roomId =
        joinRoomInput.value.trim();

    const password =
        joinPasswordInput.value.trim();

    if(!roomId){

        alert(
            "Masukkan Room ID"
        );

        return;

    }

    const snap =
        await get(
            ref(
                db,
                `rooms/${roomId}`
            )
        );

    if(!snap.exists()){

        alert(
            "Room tidak ditemukan"
        );

        return;

    }

    const room =
        snap.val();

    if(
        room.password !==
        password
    ){

        alert(
            "Password salah"
        );

        return;

    }

    currentRoom =
        roomId;

    roomDisplay.textContent =
        "Room : " + roomId;

    updateViewerUI();

    joinUser();
    loadRoom();
    lockViewer();
    watchRoomEnded();
}


);

function watchRoomEnded(){

    onValue(
        ref(
            db,
            `rooms/${currentRoom}/ended`
        ),
        snap => {

            if(!snap.exists()) return;

            if(!snap.val()) return;

            alert(
                "Host telah mengakhiri room"
            );

            location.reload();

        }
    );

}

// ===========================
// JOIN USER
// ===========================

function joinUser(){


const username =
    usernameInput.value.trim() ||
    "Guest";

const userRef =
    ref(
        db,
        `rooms/${currentRoom}/users/${uid}`
    );

set(
    userRef,
    {
        name:username,
        host:false
    }
);

onDisconnect(userRef).remove();


}

// ===========================
// LOAD ROOM
// ===========================

function loadRoom(){


loadUsers();
loadChat();
loadVideo();
setupVideoSync();


}

// ===========================
// USERS
// ===========================

function loadUsers(){


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

sendMessageBtn.addEventListener(
"click",
sendMessage
);

chatInput.addEventListener(
"keypress",
e => {


    if(e.key === "Enter"){

        sendMessage();

    }

}

);

function sendMessage(){

if(!currentRoom) return;

const text =
    chatInput.value.trim();

if(!text) return;

const username =
    usernameInput.value.trim() ||
    "Guest";

push(
    ref(
        db,
        `rooms/${currentRoom}/chat`
    ),
    {
        user:username,
        text,
        time:Date.now()
    }
);

chatInput.value = "";


}

// ===========================
// LOAD CHAT
// ===========================

function loadChat(){


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

function loadVideo(){


const videoRef =
    ref(
        db,
        `rooms/${currentRoom}/videoUrl`
    );

onValue(
    videoRef,
    snap => {

        if(!snap.exists()) return;

        const videoSrc =
            snap.val();

        console.log(
            "Video SRC :",
            videoSrc
        );

        if(hls){

            hls.destroy();
            hls = null;

        }

        videoPlayer.pause();

        if(
            videoSrc.includes(
                ".m3u8"
            )
        ){

            if(
                Hls.isSupported()
            ){

                hls =
                    new Hls({

                    enableWorker:true,
                    lowLatencyMode:true

                });

                hls.loadSource(
                    videoSrc
                );

                hls.attachMedia(
                    videoPlayer
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

        }else{

            videoPlayer.src =
                videoSrc;

            videoPlayer.load();

        }

    }
);

videoPlayer.addEventListener(
    "loadedmetadata",
    async () => {

        const snap =
            await get(
                ref(
                    db,
                    `rooms/${currentRoom}/state`
                )
            );

        if(!snap.exists()) return;

        const state =
            snap.val();

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

        setTimeout(
            () => {

                ignoreSync = false;

            },
            1000
        );

    }
);


}

// ===========================
// VIDEO SYNC
// ===========================

function setupVideoSync(){


const stateRef =
    ref(
        db,
        `rooms/${currentRoom}/state`
    );

onValue(
    stateRef,
    snap => {

        if(!snap.exists()) return;

        const state =
            snap.val();

        hostStarted =
            state.playing;

        if(
            videoPlayer.readyState < 1
        ){
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

            videoPlayer
                .play()
                .catch(()=>{});

        }else{

            videoPlayer.pause();

        }

        setTimeout(
            () => {

                ignoreSync = false;

            },
            300
        );

    }
);


}

// ===========================
// VIEWER UI
// ===========================

function updateViewerUI(){


videoPlayer.controls =
    false;

videoPlayer.style.pointerEvents =
    "none";


}

// ===========================
// FULLSCREEN
// ===========================

fullscreenBtn?.addEventListener(
"click",
() => {


    videoPlayer
        .requestFullscreen();

}


);

// ===========================
// AUTO JOIN URL
// ===========================

const params =
new URLSearchParams(
location.search
);

const roomParam =
params.get("room");

if(
roomParam &&
joinRoomInput
){


joinRoomInput.value =
    roomParam;


}

// ===========================
// LOCK VIEWER
// ===========================

function lockViewer(){


videoPlayer.controls =
    false;

videoPlayer.addEventListener(
    "play",
    () => {

        if(ignoreSync) return;

        if(!hostStarted){

            videoPlayer.pause();

        }

    }
);

videoPlayer.addEventListener(
    "pause",
    () => {

        if(ignoreSync) return;

        get(
            ref(
                db,
                `rooms/${currentRoom}/state`
            )
        ).then(
            snap => {

                if(!snap.exists()) return;

                const state =
                    snap.val();

                if(state.playing){

                    ignoreSync =
                        true;

                    videoPlayer
                        .play()
                        .catch(()=>{});

                    setTimeout(
                        () => {

                            ignoreSync =
                                false;

                        },
                        300
                    );

                }

            }
        );

    }
);

videoPlayer.addEventListener(
    "seeking",
    () => {

        if(ignoreSync) return;

        get(
            ref(
                db,
                `rooms/${currentRoom}/state`
            )
        ).then(
            snap => {

                if(!snap.exists()) return;

                const state =
                    snap.val();

                ignoreSync =
                    true;

                videoPlayer.currentTime =
                    state.currentTime;

                setTimeout(
                    () => {

                        ignoreSync =
                            false;

                    },
                    300
                );

            }
        );

    }
);


}
