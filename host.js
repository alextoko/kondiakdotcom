import { db } from "./firebase.js";

import {
    ref,
    set,
    update
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

/* =====================================
   GLOBAL
===================================== */

const programVideo =
document.getElementById("programVideo");

const selectedName =
document.getElementById("selectedName");

const currentTypeLabel =
document.getElementById("currentType");

const liveTitle =
document.getElementById("liveTitle");

let selectedVideo = "";
let selectedType = "";

let currentType = "";

let movieUrl = "";
let moviePosition = 0;

let hls = null;

/* =====================================
   HLS / MP4 LOADER
===================================== */

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
            hls.attachMedia(programVideo);

        }
        else{

            programVideo.src = url;

        }

    }else{

        programVideo.src = url;

    }
}

/* =====================================
   FIREBASE UPDATE
===================================== */

async function sendBroadcast(
    url,
    playing,
    currentTime,
    type
){

    await set(
        ref(db,"broadcast"),
        {
            activeVideo:url,
            playing,
            currentTime,
            type,
            updatedAt:Date.now()
        }
    );
}

/* =====================================
   PLAY PROGRAM
===================================== */

async function playProgramSource(
    url,
    position,
    type,
    title
){

    currentType = type;

    loadVideo(url);

    programVideo.addEventListener(
        "loadedmetadata",
        ()=>{

            if(position > 0){

                programVideo.currentTime =
                position;

            }

        },
        { once:true }
    );

    liveTitle.textContent =
    title;

    try{

        await programVideo.play();

    }catch(err){

        console.error(err);

    }

    await sendBroadcast(
        url,
        true,
        position,
        type
    );
}

/* =====================================
   SELECT PREVIEW
===================================== */

window.selectVideo = (
    card,
    url,
    name,
    type
)=>{

    document
        .querySelectorAll(".preview")
        .forEach(item =>
            item.classList.remove("active")
        );

    card.classList.add("active");

    selectedVideo = url;
    selectedType = type;

    if(type === "movie"){

        movieUrl = url;

    }

    selectedName.textContent =
    name;

    currentTypeLabel.textContent =
    name;
};

/* =====================================
   TAKE
===================================== */

window.takeProgram = async ()=>{

    if(!selectedVideo) return;

    if(
        currentType === "movie" &&
        !programVideo.paused
    ){

        moviePosition =
        programVideo.currentTime;

    }

    if(selectedType === "movie"){

        await playProgramSource(
            selectedVideo,
            moviePosition,
            "movie",
            "Film"
        );

        return;
    }

    await playProgramSource(
        selectedVideo,
        0,
        selectedType,
        selectedName.textContent
    );
};

/* =====================================
   PLAY
===================================== */

window.playProgram = async ()=>{

    try{

        await programVideo.play();

    }catch(err){

        console.error(err);

    }

    await update(
        ref(db,"broadcast"),
        {
            playing:true,
            updatedAt:Date.now()
        }
    );
};

/* =====================================
   PAUSE
===================================== */

window.pauseProgram = async ()=>{

    programVideo.pause();

    await update(
        ref(db,"broadcast"),
        {
            playing:false,
            updatedAt:Date.now()
        }
    );
};

/* =====================================
   STOP
===================================== */

window.stopProgram = async ()=>{

    programVideo.pause();

    if(hls){

        hls.destroy();
        hls = null;

    }

    programVideo.removeAttribute("src");
    programVideo.load();

    currentType = "";

    await update(
        ref(db,"broadcast"),
        {
            playing:false,
            currentTime:0,
            updatedAt:Date.now()
        }
    );
};

/* =====================================
   CURRENT TIME SYNC
===================================== */

setInterval(async()=>{

    if(
        !programVideo.src ||
        programVideo.paused
    ) return;

    if(currentType === "movie"){

        moviePosition =
        programVideo.currentTime;

    }

    await update(
        ref(db,"broadcast"),
        {
            currentTime:
            programVideo.currentTime
        }
    );

},2000);

/* =====================================
   AUTO NEXT
===================================== */

programVideo.addEventListener(
    "ended",
    async()=>{

        if(!movieUrl) return;

        /* TRAILER → FILM */

        if(currentType === "trailer"){

            await playProgramSource(
                movieUrl,
                0,
                "movie",
                "Film"
            );

            return;
        }

        /* IKLAN → FILM */

        if(currentType === "ads"){

            await playProgramSource(
                movieUrl,
                moviePosition,
                "movie",
                "Film"
            );

        }

    }
);

/* =====================================
   AUTOPLAY PREVIEW
===================================== */

window.addEventListener(
    "load",
    ()=>{

        document
            .querySelectorAll(
                ".preview video"
            )
            .forEach(video=>{

                video.play()
                .catch(()=>{});

            });

    }
);

/* =====================================
   DEFAULT SELECT
===================================== */

window.addEventListener(
    "load",
    ()=>{

        const firstPreview =
        document.querySelector(
            ".preview"
        );

        if(firstPreview){

            firstPreview.click();

        }

    }
);