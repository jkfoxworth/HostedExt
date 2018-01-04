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

// Event Listener that waits for popup.js to pass a list of URLS


chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === "checked_profiles") {
        // if it's passing a list of profiles
        console.log("Received list of profiles");
        // Call function postData
        requestPages(request.checked);
        // No sendResponse needed, send empty object
        sendResponse();
    }
});

function requestPages(checked_profiles){
    // expect multiple pages
    var page_results = [];
    for (var i = 0; i < checked_profiles.length; i++) {
        var i_page = checked_profiles[i];

        // messaging

        chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
            chrome.tabs.sendMessage(
                tabs[0].id, {action: "ajax_page", target: i_page},
                // What to do with the response received
                function (response) {
                    page_results.push(response.content);
                });
        });
    }


}



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









