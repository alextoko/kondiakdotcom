import { db } from "./firebase.js";
import {ref,set,onValue} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import {videoPlayer} from "./elements.js";
import {initHostForm,initCreateRoom} from "./room.js";
import {joinUser,loadUsers} from "./users.js";
import {initChat,loadChat} from "./chat.js";
import {initFullscreen,initCopyRoom,initEndRoom} from "./ui.js";
import { log, warn, error } from "./logger.js";

log("Firebase Connected");
log(db);

set(ref(db, "test"), {
status: "online",
time: Date.now()
}).then(() => {
log("Firebase Write Success");
});

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

log("UID =", uid);

initHostForm();
initChat(() => currentRoom);
initFullscreen();
initCopyRoom(() => currentRoom);
initEndRoom(() => currentRoom);
initCreateRoom(() => currentRoom,(room) => currentRoom = room,uid,() => joinUser(() => currentRoom, uid),() => loadUsers(() => currentRoom),() => loadChat(() => currentRoom),loadVideo,setupVideoSync);

function loadVideo() {
const videoRef =
    ref(
        db,
        `rooms/${currentRoom}/videoUrl`
    );

onValue(videoRef, snap => {
    if(!snap.exists()) return;
    const videoSrc = snap.val();
    log("Video SRC :", videoSrc);

    if(hls){

        hls.destroy();
        hls = null;

    }

    videoPlayer.pause();

    if(
        videoSrc.includes(".m3u8")
    ){

        log("Loading HLS Stream");

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

                    log("HLS READY");

                }
            );

            hls.on(
                Hls.Events.ERROR,
                (event, data) => {

                    error(
                        "========== HLS ERROR =========="
                    );

                    error(
                        "TYPE :",
                        data.type
                    );

                    error(
                        "DETAILS :",
                        data.details
                    );

                    error(
                        "FATAL :",
                        data.fatal
                    );

                    error(
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

videoPlayer.addEventListener(
"loadedmetadata",
() => {
    log( "Video Loaded");
    log( "Duration:", videoPlayer.duration);
}
);

videoPlayer.addEventListener(
"canplay",
() => {
    log( "Video Ready" );
}
);

videoPlayer.addEventListener(
"error",
() => {
    error( "VIDEO ERROR");
    error( "CODE :", videoPlayer.error?.code );
    error( "MESSAGE :", videoPlayer.error );
}
);

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

setInterval(
async () => {
    if(!isHost) return;
    if(!currentRoom) return;
    if( videoPlayer.readyState < 2) return;
    log( "HOST SEND:", videoPlayer.currentTime );
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

videoPlayer.addEventListener(
"play",
async ()=>{
    log( "PLAY EVENT" );
    log( "isHost =", isHost );
    log( "currentRoom =", currentRoom );

    if(!isHost) return;
    if(ignoreSync) return;
    await set( ref( db, `rooms/${currentRoom}/state` ),
        {
            playing:true,
            currentTime: videoPlayer.currentTime,
            updatedAt: Date.now()
        }
    );
    log( "STATE UPDATED" );
}
);

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
