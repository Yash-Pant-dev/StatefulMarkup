const StatefulMarkup = new StatefulMarkupClient("Example.js")
StatefulMarkupConfig.DEBUG_MODE = true


function fetchName() {
    setTimeout(() => {
        StatefulMarkup.publish({ var: "name", val: "Yash" })
    }, 0)
    setTimeout(() => {
        StatefulMarkup.publish({ type: "update", var: "gender", val: "male" })
    }, 0)
}

function changeColor() {
    setTimeout(() => {
        StatefulMarkup.publish({ type: "update", var: "color", val: "blueCSS" })
    }, 0)
    setTimeout(() => {
        eventListenerSetup()
    }, 500)

    setTimeout(() => {
        StatefulMarkup.publish({ type: "update", var: "color", val: "redCSS" })
        setTimeout(() => {
            StatefulMarkup.publish({ var: "name", val: "YashP" })
        }, 100)
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
setTimeout(() => {

    StatefulMarkup.addListener("#redCSS",
        "click",
        () => { console.log("Shard mirror") },
        {})
}, 2500)

StatefulMarkup.addListener("#male",
    "click",
    () => { console.log("conditional listener") },
    {})

// External Manipulation 
// Example : Editing the dom.
StatefulMarkup.addExternalManipulation(".intro", function (element) {
    element.innerHTML = "Updated DOM using external manipulation. My name is @name."
})