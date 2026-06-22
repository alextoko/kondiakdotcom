import { db } from "./firebase.js";

import {
    ref,
    onValue,
    set,
    remove,
    onDisconnect
}
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const ROOM_ID = "2451";

const player =
document.getElementById("watchPlayer");

const viewerCount =
document.getElementById("viewerCount");

const roomId =
document.getElementById("roomId");

const fullscreenBtn =
document.getElementById("fullscreenBtn");

roomId.textContent =
"#" + ROOM_ID;

let hls = null;
let currentUrl = "";

/*
|--------------------------------------------------------------------------
| VIEWER ONLINE
|--------------------------------------------------------------------------
*/

const viewerId =
"viewer_" +
Date.now() +
"_" +
Math.floor(Math.random()*10000);

const viewerRef =
ref(
    db,
    `rooms/${ROOM_ID}/viewers/${viewerId}`
);

set(viewerRef,{
    joinedAt:Date.now()
});

onDisconnect(viewerRef).remove();

/*
|--------------------------------------------------------------------------
| COUNT VIEWERS
|--------------------------------------------------------------------------
*/

onValue(
    ref(db,`rooms/${ROOM_ID}/viewers`),
    snapshot=>{

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

        hls = new Hls();

        hls.loadSource(url);

        hls.attachMedia(player);

        hls.on(
            Hls.Events.MANIFEST_PARSED,
            ()=>{

                player.play()
                .catch(()=>{});

            }
        );

    }else{

        player.src = url;

        player.play()
        .catch(()=>{});

    }

}

/*
|--------------------------------------------------------------------------
| WATCH ROOM
|--------------------------------------------------------------------------
*/

onValue(
    ref(db,`rooms/${ROOM_ID}`),
    snapshot=>{

        const room =
        snapshot.val();

        if(!room) return;

        if(room.activeVideo){

            loadStream(
                room.activeVideo
            );

        }

        if(room.playing){

            player.play()
            .catch(()=>{});

        }else{

            player.pause();

        }

        if(
            room.currentTime &&
            Math.abs(
                player.currentTime -
                room.currentTime
            ) > 3
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

fullscreenBtn.addEventListener(
    "click",
    ()=>{

        if(!document.fullscreenElement){

            player.requestFullscreen();

        }else{

            document.exitFullscreen();

        }

    }
);

player.addEventListener(
    "pause",
    ()=>{

        player.play();

    }
);

console.log(
    "WATCH READY"
);