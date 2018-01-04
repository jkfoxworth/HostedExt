// popup.js

var port = chrome.runtime.connect({
    name: 'popup > background'
});


// Sends message to the active tab
// Passes a request to call script from inject.js
function requestResults() {
    chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
        chrome.tabs.sendMessage(
            tabs[0].id, {action: "fetch_results"},
            function (response) {
                console.log(response);
            });
    });
}

// Awaits a response from the extension
// Awaits message from inject.js. Message contains SearchResults
port.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === "new_results") {
        // if it's passing in new results...
        console.log("New results received");
        // Call function postData
        styleResults(request.results);
        // No sendResponse needed, send empty object
        sendResponse();
    }
});

// Receives SearchResult object from inject.js
// Generates HTML on popup.html from objects
function styleResults(SearchResults){

    for (var i = 0; i < SearchResults.length; i++) {
        var i_result = SearchResults[i];

        var i_selector_css = 'result-' + i.toString();
        var i_selector = '#result-' + i.toString();

        $("<div/>", {
            'id' : i_selector_css,
            'class' : 'result'
        }).appendTo('#people_holder');

        $("<input/>", {
            'type': 'checkbox'
        }).prop('checked', true).appendTo(i_selector);

        $("<a/>", {
            'class': 'person_name',
            'text' : i_result.fullName,
            'href': i_result.profile_url
        }).appendTo(i_selector);

        $("<div/>", {
            'class': 'job_title',
            'text': i_result.job_title_employer
        }).appendTo(i_selector);

        $("<div/>", {
            'class': 'metro',
            'text': i_result.metro_location
        }).appendTo(i_selector);

        $("<img>", {
            'class': 'picture',
            'src': i_result.picture_url
        }).appendTo(i_selector);

    }
    allowExtraction();
}

// After styleResults is called, make Begin Extraction Available

function allowExtraction() {
    $("<button/>", {
        'id': 'extract',
        'text': 'Begin Extraction'
    }).appendTo('#buttonDiv').addEventListener('click', makeExtractList);
}


function cleanURL(old_url) {
    var newURL = "https://www.linkedin.com/recruiter/profile/";
    var profile_pointer = old_url.split("?")[0].split("profile/")[1];
    newURL = newURL + profile_pointer;
    return newURL;
}

// Gets the URLS the user has selected
// These are passed to background.js

function makeExtractList (){
    // Generate array of URL's that have checkmark
    var checked_profiles = [];
    var popup_profiles = $("#people_holder").find("div");
    var popup_checkboxes = $("input");
    var popup_name_links = $("a.person_name");

    for (var i = 0; i < popup_profiles.length; i++) {
        var i_profile = popup_profiles[i];
        var i_checkbox = popup_checkboxes.eq(i);
        if (i_checkbox.prop('checked') === true) {
            // if checkbox is checked
            // get the url so we can make a request
            var i_url = cleanURL(popup_name_links.eq(i).prop('href'));
            checked_profiles.push(i_url);
        }
    }
    sendPageList(checked_profiles);
}


// Function that passes checked URLs
function sendPageList(checked_profiles) {
    port.postMessage({action: "checked_profiles", checked:checked_profiles});
}
// Function that handles button

function handleButton() {
    // fetch the people
    requestResults();
}

// Event listener that listens for list button being clicked
document.getElementById('list').addEventListener('click', handleButton);
