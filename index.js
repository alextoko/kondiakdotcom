document
.querySelectorAll(".input-card .thumb")
.forEach(thumb => {

    thumb.addEventListener("click", () => {

        const card = thumb.closest(".input-card");

        document
        .querySelectorAll(".input-card")
        .forEach(i => i.classList.remove("active"));

        card.classList.add("active");

    });

});