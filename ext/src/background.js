// background.js

// Destination URL, comment/uncomment as needed

// var url = "http://127.0.0.1:5000/api/v1/profiles";
var url = "http://estasney1.pythonanywhere.com/api/v1/profiles";

// Hold the AJAX responses in background.js
// Background.js is persistent
var datastore = [];

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
// Routes them to inject.js
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.action === "checked_profiles") {
        // if it's passing a list of profiles
        console.log("Received list of profiles");
        console.log(request.checked);
        requestPages(0, request.checked);
        sendResponse();
    }
});

function startPattern(raw, counter, urls) {
    var pattern = new RegExp(/<code id="templates\/desktop\/profile\/profile_streaming-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}-content"><!--/, 'gim');
    var start_code = function() {
        var sc = pattern.exec(raw);
        finishPattern(raw, sc, counter, urls);
    };
    start_code();
}

function finishPattern(raw, start_code, counter, urls) {
    var re = /--><\/code>/gim;
    var end_code = function () {
        re.lastIndex = start_code.index + start_code[0].length;
        var end_code = re.exec(raw);
        startJSON(raw, start_code, end_code, counter, urls);
    };
    end_code();
}

function startJSON(raw, start_code, end_code, counter, urls){
    var json_code = function () {
        var code = JSON.parse(raw.substring(start_code.index + start_code[0].length, end_code.index));
        console.log(code);
        finishJSON(code, counter, urls);
    };
    json_code();
}

function finishJSON(code, counter, urls) {
    datastore.push(code);
    var s = function () {
        var c = JSON.stringify(code);
        dataToPopup(c, counter, urls);
    };
    s();

}


function dataToPopup(response, counter, urls) {
    var end_counter = urls.length;
    chrome.runtime.sendMessage(
        {action: "new_ajax", data: response}, // Sends message to popup.js
        // responseCallback
        function (response) { // Empty function, do nothing with response
        });

    // Call requestPages as soon as message is sent
    counter++;

    // Intent is to call requestPages every 8 seconds
    setTimeout(function () {

        if (counter < end_counter) {
            requestPages(counter, urls);
        } else {
            console.log("Done with AJAX Pages");
        }
    }, 8000);
}


// Called from event listener. Expects counter - int, and urls - []
function requestPages(counter, urls) {

    chrome.tabs.query({}, function (tabs) { // Empty query that returns all tabs open in Chrome
        chrome.tabs.sendMessage(tabs[0].id, {action: 'get_page', target: urls[counter]}, function (response) {
            console.log("Received AJAX from Inject");
            startPattern(response.data, counter, urls); // Callback called when response is received
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









