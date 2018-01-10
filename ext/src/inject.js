// inject.js

// This will await the document response that it is complete
// Calls callback function once page is loaded


function pageStatus(callback) {
  setTimeout(function() {
    var x = document.readyState;
    if (x !== "complete") {
      timeout();
    } else {
    callback();
    }
  }, 2000);
}

// Constructor for Search Results
function SearchResult(fullName, profile_url, job_title_employer, metro_location, picture_url) {
    this.fullName = fullName;
    this.profile_url = profile_url;
    this.job_title_employer = job_title_employer;
    this.metro_location = metro_location;
    this.picture_url = picture_url;
}

// Function for parsing page results from search page
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

function ajaxGet(url, callback){
    console.log("fetching " + url);
    $.ajax({
        type: 'GET',
        async: true,
        timeout: 10000,
        url: url,
        beforeSend: function (xhr) {
            xhr.setRequestHeader('Accept', 'application/json, text/javascript, */*; q=0.01');
            xhr.setRequestHeader('Accept-Language', 'en-US,en;q=0.8');
            xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
        },
        complete: function (data){
            callback({'action': 'ajax_done', 'data': data.responseText});
        }
    });
}

// Sending search results to popup.js
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

    // Determine what page url is and run appropriate script
var current_url = window.location.href;
if(current_url.indexOf("smartsearch") >= 0) {
    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
        if (request.action === "fetch_results") {
            // if it's requesting results on page.

            // Call function postData
            fetchResultData(sendResults);
            // No sendResponse needed, send empty object
            sendResponse();
        } else if (request.action === 'get_page') {
            // Use callback

            console.log(request.target);
            ajaxGet(request.target, sendResponse);
            return true; // return true recommended from chrome extension
            }
        })
    }


