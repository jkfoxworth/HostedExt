// popup.js

// Once popup.js opened, fetches all available search urls

// function fetchAllUrls() {
//     base_domain = "https://www.linkedin.com";
//     result_elements = $('.search-result-profile-link');
//     links = [];
//     for (var i=0; i < result_elements.length; i++) {
//         el_link = result_elements[i].getAttribute('href');
//         link_trimmed = base_domain + el_link.split("?")[0];
//         links.push(link_trimmed)
//     }
//     return links
// }

function requestResults() {
    // chrome.runtime.sendMessage(
    //     // message - JSON
    //     // Action is new_results to ensure we use the correct popup.js event listener
    //     {action: "fetch_results"},
    //     // responseCallback
    //     function (response) {
    //         console.log("Received response");
    //     });

    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(
            tabs[0].id, {action: "fetch_results"},
            function(response) {
                console.log(response);
        });
    });




}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === "new_results") {
        // if it's passing in new results...
        console.log("New results received");
        // Call function postData
        styleResults(request.results);
        // No sendResponse needed, send empty object
        sendResponse();
    }
});


// // Object Constructor for Search Results
// function SearchResult(fullName, profile_url, job_title_employer, metro_location, picture_url) {
//     this.fullName = fullName;
//     this.profile_url = profile_url;
//     this.job_title_employer = job_title_employer;
//     this.metro_location = metro_location;
//     this.picture_url = picture_url;
// }

// // Get the search results as an array of SearchResult objects
// function fetchResultData(callback) {
//     var profile_elements = $('.search-result');
//     var results = [];
//
//     for (var i = 0; i < profile_elements.length; i++) {
//         var i_element = profile_elements[i];
//         var fullname = i_element.querySelector(".search-result-profile-link").text;
//         var profile_url = i_element.querySelector(".search-result-profile-link").getAttribute("href");
//         var job_title = function (i_element) {
//             // If no job title, use headline
//             var current_job_element = i_element.querySelector(".curr-positions li:nth-child(1)");
//             if (current_job_element === null) {
//                 current_job_element = i_element.querySelector('.headline');
//             }
//             var job_text = current_job_element.innerHTML.split("<span")[0];
//             return job_text
//         };
//         var metro_location = i_element.querySelector('.location span:nth-child(1)').textContent;
//         var picture_url = i_element.querySelector('.profile-img').getAttribute('src');
//
//         var new_person = new SearchResult(fullname, profile_url, job_title(i_element), metro_location, picture_url);
//         results.push(new_person);
//     }
//     callback(results);
// }

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
            'type': 'checkbox',
            'checked': ''
        }).appendTo(i_selector);

        $("<div/>", {
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
}
// Function that handles button

function handleButton() {
    // fetch the people
    requestResults();
}

// Event listener that listens for button being clicked from popup
document.getElementById('clickme').addEventListener('click', handleButton);
