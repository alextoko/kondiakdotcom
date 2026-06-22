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
            lowLatencyMode:true
        });

        hls.loadSource(url);

        hls.attachMedia(player);

        hls.on(
            Hls.Events.MANIFEST_PARSED,
            ()=>{

                if(!isOffAir){

                    player.play()
                    .catch(()=>{});

                }

            }
        );

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

        const drift =
        Math.abs(
            player.currentTime -
            (room.currentTime || 0)
        );

        if(
            room.currentTime &&
            drift > 10
        ){

            player.currentTime =
            room.currentTime;

        }

    }
);

/*
|--------------------------------------------------------------------------
| FULLSCREEN
|--------------------------------------------------------------------------
*/

fullscreenBtn?.addEventListener(
    "click",
    ()=>{

        if(!document.fullscreenElement){

            player.requestFullscreen()
            .catch(()=>{});

        }else{

            document.exitFullscreen();

        }

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

        console.log(
            "SYNC SEEK:",
            player.currentTime
        );

    }
);

console.log(
    "WATCH READY"
);