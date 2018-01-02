// background.js

// Destination URL, comment/uncomment as needed

// var url = "http://127.0.0.1:5000/api/v1/profiles";
var url = "http://estasney1.pythonanywhere.com/api/v1/profiles";

// Event listener that waits for message received from inject.js
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === "new_clip") {
        // if it's passing in new data...
        console.log("New message received");
        // Call function postData
        postData(url, request.id, request.purl, request.raw_html);
        // No sendResponse needed, send empty object
        sendResponse();
        }
});


// Function that passes data from browser to specified url
function postData(url, id, purl, raw_html) {
    var xhttp;
    xhttp=new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
        if (this.readyState === 4 && this.status === 200) {
            console.log("Message success");
        }
    };
    xhttp.open("POST", url, true);
    xhttp.setRequestHeader("Content-type", "application/json");
    // id: member_id
    // purl: page url
    // raw_html: the page source html from inject.js
    var data = JSON.stringify({"id": id, "purl": purl, "raw_html": raw_html});
    xhttp.send(data);
}









