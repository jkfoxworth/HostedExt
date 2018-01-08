// background.js

// Destination URL
// Local testing with Flask
// var url = "http://127.0.0.1:5000/api/v1/profiles";
var url = "http://estasney1.pythonanywhere.com/api/v1/profiles";

// Hold the AJAX responses in background.js
// TODO Write Constructor That Accepts JSON, parses to Object
var datastore = [];

// Event Listeners

/*
Sender: Inject.js
Content: Raw HTML of Profile Page
On Message: Call postData()
Response Sent: None
 */
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.action === "new_clip") {
        // console.log("New message received");
        // Call function postData
        postData(url, request.id, request.purl, request.raw_html);
        // No sendResponse needed, send empty object
        sendResponse();
    }
});

/*
Sender: Popup.js
Content: Array of URLS
On Message: call requestPages()
Response Sent: None
 */

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.action === "checked_profiles") {
        // if it's passing a list of profiles
        // console.log("Received list of profiles");
        requestPages(0, request.checked);
        sendResponse();
    }
});



/* Function Chain That Handles Parsing AJAX ResponseText


startPattern
finishPattern
startJSON
finishJSON
dataToPopup

 */
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
        // console.log(code);
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

    counter++; // Increase counter by 1.
    // Timeout to set random interval between requests
    setTimeout(function () {
        if (counter < end_counter) {
            requestPages(counter, urls);
        } else {
            // console.log("Done with AJAX Pages");
        }
    }, getRandomInt(5, 8));
}


/* Called from Event Listener.
Counter - Int : Defaults to 0. Corresponds to index position of Array
Urls - Array : Array of Urls
 */
function requestPages(counter, urls) {
    chrome.tabs.query({}, function (tabs) { // Empty query that returns all tabs open in Chrome
        chrome.tabs.sendMessage(tabs[0].id, {action: 'get_page', target: urls[counter]}, function (response) {
            startPattern(response.data, counter, urls); // Callback called when response is received
        });
    });
}

/*
Sends XMLRequest to External URL
Url - String : Global defined at top of fil
ID - String : Member ID parsed from HTML
purl - String : Profile URL
raw_html - String : Raw HTML
*/

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

// TODO Function that passes AJAX requested profiles to url

function getRandomInt(min, max) {
    min = Math.ceil(min)*1000;
    max = Math.floor(max)*1000;
    var calc = Math.floor(Math.random() * (max - min)) + min;
    return calc;
}






