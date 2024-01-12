const StatefulMarkup = new StatefulMarkupClient("example.js")
StatefulMarkupConfig.DEBUG_MODE = true


function fetchName() {
    setTimeout(() => {
        StatefulMarkup.publish({ var: "name", val: "Yash" })
    }, 0)
    setTimeout(() => {
        StatefulMarkup.publish({ type: "update_p", var: "gender", val: "male" })
    }, 0)
    setTimeout(() => {
        StatefulMarkup.publish({ var: "list", val: `[{"name": "yash"}]` })
    }, 0)
}

function changeColor() {
    setTimeout(() => {
        StatefulMarkup.publish({ type: "update", var: "color", val: "blueCSS" })
    }, 0)
    setTimeout(() => {
        eventListenerSetup()
    }, 0)

    setTimeout(() => {
        StatefulMarkup.publish({ type: "update", var: "color", val: "redCSS" })
        setTimeout(() => {
            StatefulMarkup.publish({ var: "name", val: "YashP" })
        }, 0)
        StatefulMarkup.addExternalManipulation(".intro", function (element) {
            element.innerHTML = "Updated DOM using external manipulation. My name is @name."
        })
    }, 2000)
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

function demo() {
    console.log("clickable")
}

setTimeout(() => {
    StatefulMarkup.addListener("#redCSS",
        "click",
        () => { console.log("Shard mirror") },
        {})
}, 0)

StatefulMarkup.addListener("#male",
    "click",
    () => { console.log("conditional listener") },
    {})

// External Manipulation 
// Example : Editing the dom.
StatefulMarkup.addExternalManipulation(".intro", function (element) {
    element.innerHTML = "Updated DOM using external manipulation. My name is @name."
})

let a = setInterval(()=> {
    StatefulMarkupClient._dumpLogs()
}, 1000)

setTimeout(() => {
    clearInterval(a)
}, 2000)