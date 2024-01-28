// SELECTORS

// User input
const inputQuery = document.querySelector("#user-input");
// Side bar
const sideBar = document.querySelector(".side-bar");
// Side bar header
const sideBarHeader = document.querySelector(".side-bar-header");
// Side bar content
const sideBarContent = document.querySelector(".side-bar-content");
// Profile info
const profileInfo = document.querySelector(".profile-info");

// Side bar content
const chatContent = document.querySelector(".chat");


// OPEN SIDE BAR
function fn_OPEN_SIDE_BAR() {
    sideBar.classList.toggle("collapsed");
    sideBar.classList.toggle("hidden");
    sideBarHeader.classList.toggle("hidden");
    sideBarContent.classList.toggle("hidden");

    setTimeout(() => {
        profileInfo.classList.toggle("hidden");
    }, 150);
}

// CLOSE SIDE BAR
function fn_CLOSE_SIDE_BAR() {
    sideBar.classList.toggle("collapsed");
    sideBar.classList.toggle("hidden");
    sideBarHeader.classList.toggle("hidden");
    sideBarContent.classList.toggle("hidden");
    profileInfo.classList.toggle("hidden");
}

// TRUNCATE CHAT LENGTH
function fn_TRUNCATE_STRING_CONTENT() {
    let content = chatContent.textContent.trim();
    let maxLength = 12;

    // Trim string content with the provided range
    let trimmedContent = content.substring(0, maxLength);

    // Re-trim content in case we're in the middle of a word
    trimmedContent = trimmedContent.substring(0, Math.min(trimmedContent.length, trimmedContent.lastIndexOf(" ")));

    console.log(trimmedContent);

    // Alternatively
    // document.write("100: " + content.replace(/^(.{100}[^\s]*).*/, "$1") + "\n");
}

// REVEAL CONTENT ON SCROLL
function fn_REVEAL() {
    var reveals = document.querySelectorAll(".reveal");

    for (var i = 0; i < reveals.length; i++) {

        let windowHeight = window.innerHeight;
        let elementTop = reveals[i].getBoundingClientRect().top;
        let elementVisible = 150;

        if (elementTop < windowHeight - elementVisible) {
            reveals[i].classList.add("active");
        } else {
            reveals[i].classList.remove("active");
        }
    }
}

window.addEventListener("scroll", fn_REVEAL);