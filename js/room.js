import { db } from "./firebase.js";

import {
    ref,
    set
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

import {
    roomIdInput,
    roomPasswordInput,
    videoUrlInput,
    hostNameInput,
    createRoomBtn,
    endRoomBtn,
    roomDisplay,
    videoPlayer
} from "./elements.js";

// ===========================
// HOST FORM
// ===========================

export function initHostForm() {

    createRoomBtn.style.display = "block";
    endRoomBtn.style.display = "none";
    createRoomBtn.disabled = true;

    function checkHostForm() {

        createRoomBtn.disabled =
            !hostNameInput?.value.trim() ||
            !roomIdInput?.value.trim() ||
            !roomPasswordInput?.value.trim() ||
            !videoUrlInput?.value.trim();

    }

    hostNameInput?.addEventListener("input", checkHostForm);
    roomIdInput?.addEventListener("input", checkHostForm);
    roomPasswordInput?.addEventListener("input", checkHostForm);
    videoUrlInput?.addEventListener("input", checkHostForm);

    checkHostForm();

}

// ===========================
// HOST UI
// ===========================

export function updateHostUI() {

    videoPlayer.controls = true;
    videoPlayer.style.pointerEvents = "auto";

}

// ===========================
// LOAD ROOM
// ===========================

export function loadRoom(
    loadUsers,
    loadChat,
    loadVideo,
    setupVideoSync
) {

    loadUsers();
    loadChat();
    loadVideo();
    setupVideoSync();

}

// ===========================
// CREATE ROOM
// ===========================

export function initCreateRoom(
    currentRoomGetter,
    currentRoomSetter,
    uid,
    joinUser,
    loadUsers,
    loadChat,
    loadVideo,
    setupVideoSync
) {

    createRoomBtn?.addEventListener(
        "click",
        async () => {

            const roomId = roomIdInput.value.trim();
            const password = roomPasswordInput.value.trim();
            const videoUrl = videoUrlInput.value.trim();
            const hostName = hostNameInput.value.trim() || "Host";

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

            currentRoomSetter(roomId);

            createRoomBtn.style.display = "none";
            endRoomBtn.style.display = "block";

            console.log("HOST CREATED");
            console.log("room =", roomId);

            localStorage.setItem(
                `host_${roomId}`,
                "true"
            );

            updateHostUI();

            roomDisplay.textContent =
                "Room : " + currentRoomGetter();

            joinUser();
            loadRoom(
                loadUsers,
                loadChat,
                loadVideo,
                setupVideoSync
            );

            alert("Room berhasil dibuat");

        }
    );

}