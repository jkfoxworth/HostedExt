// inject.js

// This will await the document response that it is complete
// Calls callback function once page is loaded
// Prevents running inject.js too early
function pageStatus(callback) {
  setTimeout(function() {
    var x = document.readyState;
    if (x !== "complete") {
      timeout();
    } else {
      // alert($("h1.searchable").text());
      console.log("Page Loaded");
      callback();
    }
  }, 2000);
}


// This function can be used to append a button that calls clipIt()
// Not currently used
function addButton () {
  $("#topcard > div.module-body > div > div.profile-info").append("<button id='clipit'>Clip It</button>");
  console.log("Appending");
  $("#clipit").button();
  $("#clipit").css({
    'margin-left': 'auto',
    'margin-right': 'auto',
    'font-size': '14px',
    'width': '240px',
    'height': '20px'
  });
  $("#clipit").on("click", clipIt);
}


// Function that parses the data from the page

function clipIt() {
    // Member ID. Used as a global unique identifier
    var pid = $("#context-data-form > input[type='hidden']:nth-child(3)").attr("value");
    // The raw_html from the relevant section of the page.
    var rhtml = $("#lira-profile")["0"].innerHTML;
    // The url of the page
    var purl = window.location.href;
    // Create an object with attributes
    var profile = {
        id: pid,
        purl: purl,
        raw_html: rhtml
    };
    if (profile) {
        chrome.runtime.sendMessage(
            // message - JSON
            // Action is new_clip to ensure we use the correct background.js event listener
            {action: "new_clip", id: profile.id, purl: profile.purl, raw_html: profile.raw_html},
            // responseCallback
            function (response) {
                console.log("this is inject's callback");
                console.log(response);
            });
    }
}

// Function for parsing page results

function SearchResult(fullName, profile_url, job_title_employer, metro_location, picture_url) {
    this.fullName = fullName;
    this.profile_url = profile_url;
    this.job_title_employer = job_title_employer;
    this.metro_location = metro_location;
    this.picture_url = picture_url;
}

function fetchResultData(callback) {
    var profile_elements = $('.search-result');
    var results = [];

    for (var i = 0; i < profile_elements.length; i++) {
        var i_element = profile_elements[i];
        var fullname = i_element.querySelector(".search-result-profile-link").text;
        var profile_url = i_element.querySelector(".search-result-profile-link").getAttribute("href");
        var job_title = function (i_element) {
            // If no job title, use headline
            var current_job_element = i_element.querySelector(".curr-positions li:nth-child(1)");
            if (current_job_element === null) {
                current_job_element = i_element.querySelector('.headline');
            }
            var job_text = current_job_element.innerHTML.split("<span")[0];
            return job_text
        };
        var metro_location = i_element.querySelector('.location span:nth-child(1)').textContent;
        var picture_url = i_element.querySelector('.profile-img').getAttribute('src');

        var new_person = new SearchResult(fullname, profile_url, job_title(i_element), metro_location, picture_url);
        results.push(new_person);
    }
    callback(results);
}

function sendResults(ResultData) {
    chrome.runtime.sendMessage(
            // message - JSON
            // Action is new_results to ensure we use the correct popup.js event listener
            {action: "new_results", results:ResultData},
            // responseCallback
            function (response) {
                console.log("Sent");
                console.log(response);
            });
    }



// Uncomment addButton to append a button to the page
// pageStatus(addButton);

// Determine what page url is and run appropriate script

var current_url = window.location.href;
if (current_url.indexOf("profile") >= 0) {
    pageStatus(clipIt);
} else if(current_url.indexOf("smartsearch") >= 0) {
    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
        if (request.action === "fetch_results") {
            // if it's passing in new data...
            console.log("Results Requested");
            // Call function postData
            fetchResultData(sendResults);
            // No sendResponse needed, send empty object
            sendResponse();
        }
    });
}

