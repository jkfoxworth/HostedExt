// background.js
var url = "http://127.0.0.1:5000/api/v1/profiles";

// pass content script data to external API
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === "new_clip") {
        // if it's passing in new data...
        console.log("New message received")
        postData(url, request.id, request.purl, request.raw_html);
        // No sendResponse needed, send empty object
        sendResponse();
        }
});

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
    var data = JSON.stringify({"id": id, "purl": purl, "raw_html": raw_html});
    xhttp.send(data);
}









