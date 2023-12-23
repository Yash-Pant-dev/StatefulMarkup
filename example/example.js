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

StatefulMarkup.bindEventListener(eventListenerSetup)