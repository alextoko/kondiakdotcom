import { db } from "./firebase.js";

import {
    ref,
    onValue
}
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

/* =========================
   ELEMENT
========================= */

const player =
document.getElementById("player");

const statusText =
document.getElementById("statusText");

const loading =
document.getElementById("loading");

/* =========================
   GLOBAL
========================= */

let currentVideo = "";
let hls = null;

/* =========================
   LOAD VIDEO
========================= */

function loadVideo(url){

    if(hls){

        hls.destroy();
        hls = null;

    }

    if(url.endsWith(".m3u8")){

        if(window.Hls && Hls.isSupported()){

            hls = new Hls({
                enableWorker:true,
                lowLatencyMode:true
            });

            hls.loadSource(url);

            hls.attachMedia(player);

        }else{

            player.src = url;

        }

    }else{

        player.src = url;

    }
}

/* =========================
   FIREBASE LISTENER
========================= */

onValue(
    ref(db,"broadcast"),
    async(snapshot)=>{

        const data =
        snapshot.val();

        if(!data) return;

        statusText.textContent =
        "ON AIR";

        loading.style.display =
        "none";

        /* VIDEO BERUBAH */

        if(
            data.activeVideo &&
            data.activeVideo !== currentVideo
        ){

            currentVideo =
            data.activeVideo;

            loadVideo(
                data.activeVideo
            );

            try{

                await player.play();

            }catch(err){

                console.log(err);

            }

            return;
        }

        /* PLAY / PAUSE */

        if(data.playing){

            if(player.paused){

                try{

                    await player.play();

                }catch(err){

                    console.log(err);

                }

            }

        }else{

            player.pause();

        }

        /* SYNC TIME */

        const diff =
        Math.abs(
            player.currentTime -
            (data.currentTime || 0)
        );

        if(diff > 5){

            player.currentTime =
            data.currentTime || 0;

        }

    }
);

/* =========================
   BLOK CONTROL USER
========================= */

player.controls = false;

player.disablePictureInPicture = true;

player.controlsList =
"nodownload noplaybackrate nofullscreen";

/* klik kanan */

player.addEventListener(
    "contextmenu",
    e=>e.preventDefault()
);

/* drag */

document.addEventListener(
    "dragstart",
    e=>e.preventDefault()
);

/* keyboard */

document.addEventListener(
    "keydown",
    e=>{

        e.preventDefault();

    }
);

/* double click */

player.addEventListener(
    "dblclick",
    e=>e.preventDefault()
);

/* blok seek */

player.addEventListener(
    "seeking",
    ()=>{

        if(player.readyState > 0){

            player.currentTime =
            player.currentTime;

        }

    }
);

/* =========================
   CLEANUP
========================= */

window.addEventListener(
    "beforeunload",
    ()=>{

        if(hls){

            hls.destroy();

        }

    }
);