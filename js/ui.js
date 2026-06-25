import { db } from "./firebase.js";

import {
    ref,
    set
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

import {
    fullscreenBtn,
    copyRoomBtn,
    endRoomBtn,
    videoPlayer
} from "./elements.js";

// ===========================
// FULLSCREEN
// ===========================

export function initFullscreen() {

    fullscreenBtn?.addEventListener(
        "click",
        () => {

            videoPlayer.requestFullscreen();

        }
    );

}

// ===========================
// COPY ROOM LINK
// ===========================

export function initCopyRoom(currentRoomGetter) {

    copyRoomBtn?.addEventListener(
        "click",
        () => {

            const currentRoom = currentRoomGetter();

            if (!currentRoom) {

                alert("Belum masuk room");
                return;

            }

            const url =
                `${location.origin}/index.html?room=${currentRoom}`;

            navigator.clipboard.writeText(url);

            alert("Link room berhasil disalin");

        }
    );

}

// ===========================
// END ROOM
// ===========================

export function initEndRoom(currentRoomGetter) {

    endRoomBtn?.addEventListener(
        "click",
        async () => {

            const currentRoom = currentRoomGetter();

            if (!currentRoom) {

                alert("Belum ada room aktif");
                return;

            }

            const ok =
                confirm("Yakin ingin mengakhiri room?");

            if (!ok) return;

            await set(
                ref(
                    db,
                    `rooms/${currentRoom}/ended`
                ),
                true
            );

            alert("Room telah diakhiri");

        }
    );

}