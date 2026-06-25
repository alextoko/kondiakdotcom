import { db } from "./firebase.js";

import {
    ref,
    push,
    onChildAdded
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

import {
    chatMessages,
    chatInput,
    sendMessageBtn,
    hostNameInput
} from "./elements.js";

// ===========================
// CHAT
// ===========================

export function initChat(currentRoomGetter) {

    sendMessageBtn?.addEventListener("click", () => {
        sendMessage(currentRoomGetter);
    });

    chatInput?.addEventListener(
        "keypress",
        e => {

            if (e.key === "Enter") {
                sendMessage(currentRoomGetter);
            }

        }
    );

}

export function sendMessage(currentRoomGetter) {

    const currentRoom = currentRoomGetter();

    if (!currentRoom) return;

    const text = chatInput.value.trim();

    if (!text) return;

    const username = hostNameInput?.value.trim() || "Host";

    push(
        ref(
            db,
            `rooms/${currentRoom}/chat`
        ),
        {
            user: username,
            text,
            time: Date.now()
        }
    );

    chatInput.value = "";

}

export function loadChat(currentRoomGetter) {

    const currentRoom = currentRoomGetter();

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