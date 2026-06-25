import { db } from "./firebase.js";

import {
    ref,
    set,
    onValue,
    onDisconnect
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

import {
    hostNameInput,
    userList,
    onlineCount
} from "./elements.js";

// ===========================
// JOIN USER
// ===========================

export function joinUser(currentRoomGetter, uid) {

    const currentRoom = currentRoomGetter();

    const username = hostNameInput?.value.trim() || "Host";

    const userRef = ref(
        db,
        `rooms/${currentRoom}/users/${uid}`
    );

    set(
        userRef,
        {
            name: username,
            host: true
        }
    );

    onDisconnect(userRef).remove();

}

// ===========================
// LOAD USERS
// ===========================

export function loadUsers(currentRoomGetter) {

    const currentRoom = currentRoomGetter();

    const usersRef =
        ref(
            db,
            `rooms/${currentRoom}/users`
        );

    onValue(
        usersRef,
        snap => {

            userList.innerHTML = "";

            let count = 0;

            const users = [];

            snap.forEach(child => {

                count++;

                users.push(
                    child.val()
                );

            });

            // HOST selalu di atas
            users.sort(
                (a, b) => {

                    if (a.host && !b.host) return -1;

                    if (!a.host && b.host) return 1;

                    return 0;

                }
            );

            users.forEach(user => {

                const div =
                    document.createElement("div");

                div.className =
                    "user-item";

                div.innerHTML = `
                <div class="user-avatar">
                ${user.name.charAt(0).toUpperCase()}
                </div>

                <div class="user-name">
                ${user.name}
                </div>

                <div class="user-role ${user.host ? "host" : "viewer"}">
                ${user.host ? "HOST" : "VIEWER"}
                </div>
                `;

                userList.appendChild(div);

            });

            onlineCount.textContent =
                "Online : " + count;

        }
    );

}