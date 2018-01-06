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


// Cleans up Ajax using regex
// Passes parameters to callback function (dataToPopup)
// Calls dataToPopup when the response is parsed
function cleanAjax(raw, counter, urls, callback) {
    var pattern = new RegExp(/<code id="templates\/desktop\/profile\/profile_streaming-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}-content"><!--/, 'gim');
    var start_code = pattern.exec(resp);
    if (start_code !== null && start_code.length > 0) {
        var re = /--><\/code>/gim;
        re.lastIndex = start_code.index + start_code[0].length;
        var end_code = re.exec(raw);
        if (end_code !== null && end_code.length > 0) {
            var code = JSON.parse(raw.substring(start_code.index + start_code[0].length, end_code.index));
        }
    }
    if (code) {
        datastore.push(code);
        callback(code, counter, urls); // Code is parsed, callback will send it to popup.js
    }
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
            cleanAjax(response, counter, urls, dataToPopup); // Callback called when response is received
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









