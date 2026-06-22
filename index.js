document
.querySelectorAll(".input-card")
.forEach(card=>{

    card.addEventListener("click",()=>{

        document
        .querySelectorAll(".input-card")
        .forEach(i=>i.classList.remove("active"));

        card.classList.add("active");

    });

});

