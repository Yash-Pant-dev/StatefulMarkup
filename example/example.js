const StatefulMarkup = new StatefulMarkupClient("Example.js")

function fetchName() {
    setTimeout(() => {
        StatefulMarkup.publish({ var: "name", val: "Yash" })
    }, 0)
    setTimeout(() => {
        StatefulMarkup.publish({ var: "gender", val: "male" })
    }, 0)
}

function changeColor() {
    setTimeout(() => {
        StatefulMarkup.publish({ var: "color", val: "blueCSS" })
    }, 0)
    setTimeout(() => {

        eventListenerSetup()

    }, 500)

    setTimeout(() => {
        StatefulMarkup.publish({ var: "color", val: "redCSS" })
    }, 1400)
}

fetchName()
changeColor()

function eventListenerSetup() {
    let elements = Array.from(document.getElementsByClassName("blueCSS"))
    elements.forEach((e) => {
        e.addEventListener("click", function () {
            console.log("clickable")
        })
    })
}
// console.log(typeof getElementsByClassName("asd"))
function demo() {
    console.log("clickable")
}

// StatefulMarkup.bindEventListeners(eventListenerSetup)
// StatefulMarkup._unsafe_bindEventListeners()
// function f() {
//     addEventListener
// }

// setTimeout(() => {document.getElementById("redCSS").addEventListener("click", () => {
//     console.log("el")
// })}, 2000)
StatefulMarkup.addListener("#redCSS",
    "click",
    () => { console.log("el") },
    {})