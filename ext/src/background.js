// background.js

// Destination URL, comment/uncomment as needed

// var url = "http://127.0.0.1:5000/api/v1/profiles";
var url = "http://estasney1.pythonanywhere.com/api/v1/profiles";

// Event listener that waits for message received from inject.js
// Data is from profile page

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.action === "new_clip") {
        // if it's passing in new data...
        console.log("New message received");
        // Call function postData
        postData(url, request.id, request.purl, request.raw_html);
        // No sendResponse needed, send empty object
        sendResponse();
    }
});


// Event Listener that waits for popup.js to pass a list of Urls
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.action === "checked_profiles") {
        // if it's passing a list of profiles
        console.log("Received list of profiles");
        console.log(request.checked);
        requestPages(0, request.checked);
        sendResponse();
    }
});


function dataToPopup(response, counter, urls) {
    var end_counter = urls.length;
    chrome.runtime.sendMessage(
        {action: "new_ajax", data: response},
        // responseCallback
        function (response) {
        });

    // Call requestPages as soon as message is sent
    counter++;
    if (counter < end_counter) {
        requestPages(counter, urls);
    } else {
        console.log("Done with AJAX Pages");
    }

}

function requestPages(counter, urls) {
    var url_length = url.length;
    chrome.tabs.query({}, function (tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {action: 'get_page', target: urls[counter]}, function (response) {
            console.log("Received AJAX from Inject");
            dataToPopup(response);
        });
    });
}


// Function that passes data from browser to specified url
function postData(url, id, purl, raw_html) {
    var xhttp;
    xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function () {
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









