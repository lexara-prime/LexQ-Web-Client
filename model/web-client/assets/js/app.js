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

function state() {
    return {
        nextPrompt: "",
        items: [
            {
                id: Math.random(),
                prompt: "What is javascript",
                completion: "JavaScript (JS) is a lightweight interpreted (or just-in-time compiled) programming language with first-class functions. ",
                loading: false,
                markdownCompletion: `###Javascript is a high-level, dynamic, and weakly-typed programming language that is primarily used for enhancing web interactivity and creating web applications. It was created by Brendan Eich in 1995 while he was working at Netscape Communications Corporation.

                Initially, Javascript was intended to be a lightweight scripting language for adding client-side functionality to HTML pages, allowing developers to create interactive elements like form validation, animations, and other dynamic content without requiring a page refresh. Over time, it has evolved into a powerful language that can be used for much more than just client-side web development.`,
            }
        ],
        info: { backlog: 0, num_total_runners: 0 },
        callApi() {
            console.log(this.nextPrompt);
            if (!this.nextPrompt) return;

            let item = {
                id: Math.random(),
                prompt: this.nextPrompt,
                completion: "",
                loading: true,
                markdownCompletion: "",
            };
            this.nextPrompt = "";
            this.items.push(item);
            const eventSource = new EventSource(
                `/completion/${encodeURIComponent(item.prompt)}`,
            );

            console.log("Created event source ...");

            eventSource.onmessage = (event) => {
                item.completion += JSON.parse(event.data).text;
                item.markdownCompletion = marked.parse(item.completion, { mangle: false, headerIds: false });
                // Hacky way to notify element to update
                this.items = this.items.map((i) =>
                    i.id === item.id ? { ...item } : i,
                );
            };

            eventSource.onerror = (event) => {
                eventSource.close();
                item.loading = false;
                this.items = this.items.map((i) =>
                    i.id === item.id ? { ...item } : i,
                );
                console.log(item.completion);
            };
        },
        refreshInfo() {
            fetch("/stats")
                .then((response) => response.json())
                .then((data) => {
                    this.info = { ...data, loaded: true };
                })
                .catch((error) => console.log(error));
        },
    };
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