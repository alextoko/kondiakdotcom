import { db } from "./firebase.js";

import {
    ref,
    onValue,
    set,
    onDisconnect
}
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const ROOM_ID = "2451";

/*
|--------------------------------------------------------------------------
| ELEMENTS
|--------------------------------------------------------------------------
*/

const player =
document.getElementById("watchPlayer");

player.addEventListener(
    "waiting",
    ()=>{

        console.log("BUFFERING");

    }
);

player.addEventListener(
    "playing",
    ()=>{

        console.log("PLAYING");

    }
);

player.addEventListener(
    "stalled",
    ()=>{

        console.log("STALLED");

    }
);

player.addEventListener(
    "canplay",
    ()=>{

        console.log("CAN PLAY");

    }
);

player.controls = false;
player.removeAttribute("controls");
player.disablePictureInPicture = true;

player.autoplay = true;
player.playsInline = true;
player.preload = "auto";

const viewerCount =
document.getElementById("viewerCount");

const roomId =
document.getElementById("roomId");

const fullscreenBtn =
document.getElementById("fullscreenBtn");

const offlineScreen =
document.getElementById("offlineScreen");

roomId.textContent =
"#" + ROOM_ID;

/*
|--------------------------------------------------------------------------
| VARIABLES
|--------------------------------------------------------------------------
*/
let lastHostTime = 0;
let hls = null;
let currentUrl = "";
let isOffAir = false;

/*
|--------------------------------------------------------------------------
| VIEWER ONLINE
|--------------------------------------------------------------------------
*/

const viewerId =
"viewer_" +
Date.now() +
"_" +
Math.floor(Math.random() * 100000);

const viewerRef =
ref(
    db,
    `rooms/${ROOM_ID}/viewers/${viewerId}`
);

set(viewerRef,{
    joinedAt: Date.now()
});

onDisconnect(viewerRef).remove();

/*
|--------------------------------------------------------------------------
| VIEWER COUNT
|--------------------------------------------------------------------------
*/

onValue(
    ref(db,`rooms/${ROOM_ID}/viewers`),
    snapshot => {

        const data =
        snapshot.val();

        const count =
        data
        ? Object.keys(data).length
        : 0;

        viewerCount.textContent =
        count;

    }
);

/*
|--------------------------------------------------------------------------
| LOAD STREAM
|--------------------------------------------------------------------------
*/

function loadStream(url){

    if(!url) return;

    if(url === currentUrl) return;

    currentUrl = url;

    if(hls){

        hls.destroy();
        hls = null;

    }

    if(Hls.isSupported()){

        hls = new Hls({
            enableWorker:true,
            maxBufferLength:30,
            maxMaxBufferLength:60
        });

        hls.on(
            Hls.Events.ERROR,
            (event,data)=>{

                console.log(
                    "HLS ERROR:",
                    data.type,
                    data.details
                );

            }
        );

        hls.loadSource(url);

        hls.attachMedia(player);

    }else{

        player.src = url;

        if(!isOffAir){
            
            player.play()
            .catch(()=>{});

        }

    }

}

/*
|--------------------------------------------------------------------------
| ROOM SYNC
|--------------------------------------------------------------------------
*/

onValue(
    ref(db,`rooms/${ROOM_ID}`),
    snapshot=>{

        const room =
        snapshot.val();

        if(!room) return;

        /*
        -------------------------
        OFF AIR
        -------------------------
        */

        if(room.status === "OFF_AIR"){

            isOffAir = true;

            player.pause();

            if(offlineScreen){

                offlineScreen.classList
                .remove("hidden");

            }

            return;

        }


        /*
        -------------------------
        ON AIR
        -------------------------
        */

        isOffAir = false;

        if(offlineScreen){

            offlineScreen.classList
            .add("hidden");

        }

        /*
        -------------------------
        LOAD VIDEO
        -------------------------
        */

        if(room.activeVideo){

            loadStream(
                room.activeVideo
            );

        }

        /*
        -------------------------
        PLAY / PAUSE
        -------------------------
        */

        if(room.playing){

            if(player.paused){

                player.play()
                .catch(()=>{});

            }

        }else{

            if(!player.paused){

                player.pause();

            }

        }

        /*
        -------------------------
        TIME SYNC
        -------------------------
        */
/*
        if(room.currentTime !== undefined){

            console.log(
                "HOST:",
                room.currentTime,
                "VIEWER:",
                player.currentTime
            );

            lastHostTime =
            room.currentTime;

            const drift =
            Math.abs(
                player.currentTime -
                room.currentTime
            );

            if(drift > 1){

                player.currentTime =
                room.currentTime;

            }

        }*/

    }
);



/*
|--------------------------------------------------------------------------
| FULLSCREEN
|--------------------------------------------------------------------------
*/
fullscreenBtn?.addEventListener(
    "click",
    async ()=>{

        try{

            const videoFrame =
            document.querySelector(".video-frame");

            if(!document.fullscreenElement){

                await videoFrame
                .requestFullscreen();

            }else{

                await document
                .exitFullscreen();

            }

        }catch(err){

            console.error(
                "Fullscreen Error:",
                err
            );

        }

    }
);

fullscreenBtn?.addEventListener(
    "click",
    ()=>{
        console.log("FULLSCREEN CLICK");
    }
);

/*
|--------------------------------------------------------------------------
| DEBUG
|--------------------------------------------------------------------------
*/

player.addEventListener(
    "seeking",
    ()=>{

        player.currentTime =
        lastHostTime;

    }
);

console.log(
    "WATCH READY"
);

player.addEventListener(
    "click",
    e=>{

        e.preventDefault();

    }
);

document.addEventListener(
    "keydown",
    e=>{

        const blocked = [

            " ",
            "ArrowLeft",
            "ArrowRight",
            "ArrowUp",
            "ArrowDown",
            "MediaPlayPause"

        ];

        if(blocked.includes(e.key)){

            e.preventDefault();

        }

    }
);

player.addEventListener(
    "contextmenu",
    e=>{

        e.preventDefault();

    }
);

player.addEventListener(
    "pause",
    ()=>{

        if(!isOffAir){

            player.play()
            .catch(()=>{});

        }

    }
);

player.addEventListener(
    "ratechange",
    ()=>{

        player.playbackRate = 1;

    }
);


