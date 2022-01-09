// code for InjectCode extension: https://chrome.google.com/webstore/detail/injectcode/flhghpihapijancfhnicbnjifdodohpi

var cursor = document.createElement("img");
cursor.src = 'https://media.geeksforgeeks.org/wp-content/uploads/20200319212118/cursor2.png';
cursor.style.pointerEvents = 'none';
cursor.style.width = '30px';
cursor.style.height = '30px';
cursor.style.zIndex = '10';
cursor.style.position = 'absolute';
document.body.appendChild(cursor);

var x, y;

// Create WebSocket connection.
const socket = new WebSocket('ws://localhost:6969');

// Listen for messages
socket.addEventListener('message', function (event) {
    const data = JSON.parse(event.data);
    // Gets the x,y position of the mouse cursor
    x = data.message.x;
    y = data.message.y;
    // console.log(x, y);
    // sets the image cursor to new relative position
    cursor.style.left = x + 'px';
    cursor.style.top = y + 'px';
    // console.log(cursor);

    if (data.message.click) {
        onReceivedClick();
    }
});

function onReceivedClick() {
    // gets the object on image cursor position
    var element = document.elementFromPoint(x, y); 
    console.log("clicked on: ", element);
    element.click();
}

window.addEventListener("click", (e) => {
    if (e.isTrusted) {
        console.log("Blocking click of real mouse");
        e.preventDefault();
    }
});