import { db } from "./firebase.js";

import {
    ref,
    set,
    update,
    onDisconnect
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const ROOM_ID = "2451";

const hostRef =
ref(
    db,
    `rooms/${ROOM_ID}/host`
);

set(hostRef,{
    online:true
});

onDisconnect(hostRef).set({
    online:false
});

const player = document.getElementById("programPlayer");
const previewPlayer =
document.getElementById("previewPlayer");

const takeBtn =
document.getElementById("takeBtn");

let previewInput = 0;
let liveInput = 0;
let isOnAir = false;
let previewHls = null;

const inputUrl = document.getElementById("inputUrl");


const onAirBtn = document.getElementById("onAirBtn");
const fullscreenBtn = document.getElementById("fullscreenBtn");

const currentInputText =
document.getElementById("currentInput");

const broadcastStatus =
document.getElementById("broadcastStatus");

let hls = null;

/*
|--------------------------------------------------------------------------
| INPUT SOURCES
|--------------------------------------------------------------------------
|
| Ganti URL sesuai channel m3u8 Anda
|
*/

const inputs = [

    "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",

    "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",

    "https://vz-685584a0-ec9.b-cdn.net/628decdf-29f3-4abc-b083-90f3a16bcad2/playlist.m3u8",

    "https://test-streams.mux.dev/dai-discontinuity-deltatre/manifest.m3u8"

];

/*
|--------------------------------------------------------------------------
| LOAD STREAM
|--------------------------------------------------------------------------
*/

function loadStream(url){

    if(!url) return;

    if(hls){

        hls.destroy();

        hls = null;

    }

    if(Hls.isSupported()){

        hls = new Hls();

        hls.loadSource(url);

        hls.attachMedia(player);

        hls.on(Hls.Events.MANIFEST_PARSED,()=>{

            player.play()
            .catch(err=>console.log(err));

        });

    }else if(
        player.canPlayType(
            "application/vnd.apple.mpegurl"
        )
    ){

        player.src = url;

        player.addEventListener(
            "loadedmetadata",
            ()=>{

                player.play();

            }
        );

    }else{

        alert("Browser tidak mendukung HLS");

    }

}

function loadPreview(url){

    if(previewHls){

        previewHls.destroy();

        previewHls = null;

    }

    if(Hls.isSupported()){

        previewHls = new Hls();

        previewHls.loadSource(url);

        previewHls.attachMedia(
            previewPlayer
        );

        previewHls.on(
            Hls.Events.MANIFEST_PARSED,
            ()=>{

                previewPlayer.play();

            }
        );

    }

}

/*
|--------------------------------------------------------------------------
| UPDATE ACTIVE INPUT
|--------------------------------------------------------------------------
*/

function setPreviewInput(index){

    previewInput = index;

    document
    .querySelectorAll(".input-card")
    .forEach(card=>{

        card.classList.remove("active");

    });

    document
    .querySelector(
        `.input-card[data-input="${index}"]`
    )
    ?.classList.add("active");

    currentInputText.textContent =
    `Preview Input ${index+1}`;

    loadPreview(
        inputs[index]
    );

}

/*
|--------------------------------------------------------------------------
| INPUT CLICK
|--------------------------------------------------------------------------
*/

document
.querySelectorAll(".input-card")
.forEach(card=>{

    card.addEventListener("click",()=>{

        const index =
        parseInt(card.dataset.input);

        setPreviewInput(index);

    });

});

takeBtn.addEventListener(
    "click",
    
    async()=>{

        liveInput =
        previewInput;

        loadStream(
            inputs[liveInput]
        );

        currentInputText.textContent =
        `Input ${liveInput+1}`;

        await update(
            ref(
                db,
                `rooms/${ROOM_ID}`
            ),
            {

                activeInput:
                liveInput,

                activeVideo:
                inputs[liveInput],

                playing:
                !player.paused,

                currentTime:
                player.currentTime,

                updatedAt:
                Date.now()

            }
        );

    }
);

/*
|--------------------------------------------------------------------------
| LOAD CUSTOM URL
|--------------------------------------------------------------------------
*/
inputUrl.addEventListener(
    "keydown",
    (e)=>{

        if(e.key !== "Enter") return;

        const url =
        inputUrl.value.trim();

        if(!url) return;

        inputs[previewInput] = url;

        loadPreview(url);

    }
);

/*
|--------------------------------------------------------------------------
| FULLSCREEN
|--------------------------------------------------------------------------
*/
fullscreenBtn.onclick = ()=>{

    if(!document.fullscreenElement){

        player.requestFullscreen();

    }else{

        document.exitFullscreen();

    }

};

document.addEventListener(
    "fullscreenchange",
    ()=>{

        if(
            document.fullscreenElement &&
            player.paused
        ){

            player.play()
            .catch(()=>{});

        }

    }
);

/*
|--------------------------------------------------------------------------
| ON AIR
|--------------------------------------------------------------------------
*/

onAirBtn.onclick = async()=>{

    isOnAir = !isOnAir;

    if(isOnAir){

        await update(
            ref(db,`rooms/${ROOM_ID}`),
            {
                status:"ON_AIR",
                activeInput:liveInput,
                activeVideo:inputs[liveInput],
                playing:!player.paused,
                currentTime:player.currentTime,
                updatedAt:Date.now()
            }
        );

        onAirBtn.innerHTML =
        "🔴 ON AIR";

        broadcastStatus.textContent =
        "ON AIR";

        broadcastStatus.classList.remove("red");
        broadcastStatus.classList.add("green");

    }else{

        await update(
            ref(db,`rooms/${ROOM_ID}`),
            {
                status:"OFF_AIR",
                playing:false,
                updatedAt:Date.now()
            }
        );

        onAirBtn.innerHTML =
        "⚫ OFF AIR";

        broadcastStatus.textContent =
        "OFF AIR";

        broadcastStatus.classList.remove("green");
        broadcastStatus.classList.add("red");

    }

};

/*
|--------------------------------------------------------------------------
| SYNC POSITION
|--------------------------------------------------------------------------
*/
setInterval(async()=>{

    if(player.paused) return;

    if(!isOnAir) return;

    try{

        await update(
            ref(
                db,
                `rooms/${ROOM_ID}`
            ),
            {

                activeInput:
                liveInput,

                activeVideo:
                inputs[liveInput],

                playing:
                !player.paused,

                currentTime:
                player.currentTime,

                status:
                isOnAir ? "ON_AIR" : "OFF_AIR",

                updatedAt:
                Date.now()

            }
        );

    }catch(err){

        console.error(err);

    }

},500);

/*
|--------------------------------------------------------------------------
| AUTO LOAD INPUT 1
|--------------------------------------------------------------------------
*/

setPreviewInput(0);

player.removeAttribute("src");
player.load();

console.log(
    "HOST READY"
);

document
.getElementById("previewPlay")
.onclick = () =>
previewPlayer.play();

document
.getElementById("previewPause")
.onclick = () =>
previewPlayer.pause();

document
.getElementById("previewBack")
.onclick = () =>
previewPlayer.currentTime =
Math.max(0, previewPlayer.currentTime - 10);

document
.getElementById("previewForward")
.onclick = () =>
previewPlayer.currentTime += 10;

document
.getElementById("livePlay")
.onclick = async()=>{

    player.play();

    if(!isOnAir) return;

    await update(
        ref(db,`rooms/${ROOM_ID}`),
        {
            playing:true,
            currentTime:
            player.currentTime
        }
    );

};

document
.getElementById("livePause")
.onclick = async()=>{

    player.pause();

    if(!isOnAir) return;

    await update(
        ref(db,`rooms/${ROOM_ID}`),
        {
            playing:false,
            currentTime:
            player.currentTime
        }
    );

};

document
.getElementById("liveBack")
.onclick = async()=>{

    player.currentTime =
    Math.max(0, player.currentTime - 10);

    if(!isOnAir) return;

    await update(
        ref(db,`rooms/${ROOM_ID}`),
        {
            currentTime:
            player.currentTime
        }
    );

};

document
.getElementById("liveForward")
.onclick = async()=>{

    player.currentTime += 10;

    if(!isOnAir) return;

    await update(
        ref(db,`rooms/${ROOM_ID}`),
        {
            currentTime:
            player.currentTime
        }
    );

};

document
.getElementById("previewStop")
.onclick = ()=>{

    previewPlayer.pause();

    previewPlayer.currentTime = 0;

};

document
.getElementById("liveStop")
.onclick = async()=>{

    player.pause();

    player.currentTime = 0;

    if(!isOnAir) return;

    await update(
        ref(db,`rooms/${ROOM_ID}`),
        {
            playing:false,
            currentTime:0
        }
    );

};