// popup.js



chrome.runtime.sendMessage(
    {action: "get user state"},
    function (response) {
        handleUserState(response)
    });


/*

View Functions
==============

onmessage event listener
    - calls appropriate view function based on message

show_login()
    - Appends a login form to the mainPoup

handleUserState()
    - Calls appropriate cascade of functions based on user's current authentication state

*/

function handleUserState(response){
    if (response.action === "show login") {
        show_login();
    } else if (response.action === 'show actions') {
        show_action();
    } else if (response.action === 'show login error') {
        show_login_error();
    }
}

function handleLoginResponse(response){
    if (response) {
        if (response.action === 'login success') {
            new_login();
        } else if(response.action === 'login fail') {
            show_login_error();
        }
    } else {
        show_login_error();
    }
}


/*

DOM Manipulation
================

 */
function show_login() {

    var form = $.parseHTML("<form id='login_form'> <div class='form-group row d-flex justify-content-center'> <div class='col-sm-10'> <input class='form-control' id='user_id' placeholder='User ID'> </div> </div> <div class='form-group row d-flex justify-content-center'> <div class='col-sm-10'> <input type='password' class='form-control' id='user_pass' placeholder='Password'> </div> </div> <div class='form-group row d-flex justify-content-center'></div></form><div class='row d-flex justify-content-center'><button class='btn btn-primary' id='login_button'>Login</button></div>");
    append_html('#mainPopup', form, function (){
        $('#login_button').on('click', doLogin);
    });
}

function append_html(id, html, callback) {
    $(id).append(html);
    callback();
}



function show_action() {
    var action_buttons = $.parseHTML("<div id='action_buttons' class='btn-toolbar d-flex justify-content-center' role='toolbar'> <div class='btn-group mr-2' role='group'> <button type='button' class='btn btn-primary' id='select_profiles_button'>Select Profiles</button> <button type='button' class='btn btn-secondary' id='extract_profiles_button'>Extract Profiles</button> </div>  <button type='button' class='btn btn-light' id='logout_button'>Logout</button> </div> </div>");
    $('#actions').append(action_buttons);
    // TODO Add event listens for the extract button
    $('#logout_button').on('click', doLogout);
    $('#select_profiles_button').on('click', requestResults);
}

function show_login_error() {
    var error_alert = $.parseHTML("<div class='alert alert-warning alert-dismissible fade show' role='alert'> Your credentials were not accepted <button type='button' class='close' data-dismiss='alert' aria-label='Close'> <span aria-hidden='true'>&times;</span> </button></div>");
    $('#login_form').append(error_alert);
}

function new_login() {
    $('#login_form').remove();
    $('#login_button').remove();
    show_action();
}

function new_logout() {
    $('#action_buttons').remove();
    show_login();
}

/*

/*

Messaging Functions
===================

doLogin - event listener for user pressing login button
doLogout - event listener for user pressing logout button. Sets 'token' to null in chrome storage and changes popup to login


credToBackground - sends the values to background.js for handling

requestResults() - sends message intended for inject.js to get the results from page
 */

function doLogin() {
    var username = $('#user_id').val();
    var password = $('#user_pass').val();
    var auth_string = username + ":" + password;
    credToBackground(auth_string);
}

function doLogout() {
    chrome.storage.sync.set({'token': null});
    new_logout();
}

function credToBackground(auth_string){
    chrome.runtime.sendMessage(
        {action: "user login submit", data:auth_string},
        function (response) {
            handleLoginResponse(response);
        });
}



function requestResults() {
    chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
        chrome.tabs.sendMessage(
            tabs[0].id, {action: "fetch_results"},
            function (response) {
            });
    });
}

// Awaits message from inject.js. Message contains SearchResults
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === "new_results") {
        styleResults(request.results); // Response Data to HTML
        sendResponse();
    } else if (request.action === 'new_ajax') {
        styleAjax(request.data); // Parsed JSON
    }
});

// TODO Get this in Bootstrap form
function styleAjax(data){
    $(".result").remove(); // Remove any result elements making room for responses
    $("<p/>", {
        'id': 'ajax_result',
        'text': data
    }).appendTo('#people_holder');
}


// Receives SearchResult object from inject.js
// Generates HTML on popup.html from objects
function styleResults(SearchResults){

    // The table is 'invisible' unhide it
    $('#results_table').prop('class', 'table');
    for (var i = 0; i < SearchResults.length; i++) {
        var i_result = SearchResults[i];

        var row_id_attr = 'row-' + i.toString();
        var row_id_sel = '#row-' + i.toString();

        var row_html = "<tr>" +
            "<th scope='row' id='" + row_id_attr + "'><input type='checkbox' checked></th>" +
            "<td class='name_link' href='" + i_result.profile_url + "'>" + i_result.fullName + "</td>" +
            "<td>" + i_result.job_title + "</td>" +
            "<td>" + i_result.employer + "</td>" +
            "</tr>";

        $('#results_body').append(row_html)

    }
}

// After styleResults is called, make Begin Extraction Available


function cleanURL(old_url) {
    var newURL = "https://www.linkedin.com/recruiter/profile/";
    var profile_pointer = old_url.split("?")[0].split("profile/")[1];
    newURL = newURL + profile_pointer;
    return newURL;
}

// Gets the URLS the user has selected
// These are passed to background.js

function makeExtractList (){
    // Generate array of URL's that have been selected
    var checked_profiles = [];
    var popup_profiles = $("#people_holder").find("div");
    var popup_checkboxes = $("input");
    var popup_name_links = $("a.person_name");

    for (var i = 0; i < popup_profiles.length; i++) {
        var i_profile = popup_profiles[i];
        var i_checkbox = popup_checkboxes.eq(i);
        if (i_checkbox.prop('checked') === true) {
            // if checkbox is checked
            // get the post_data_url so we can make a request
            var i_url = cleanURL(popup_name_links.eq(i).prop('href'));
            checked_profiles.push(i_url);
        }
        // only send list when complete
        if (i === popup_profiles.length - 1) {
            sendPageList(checked_profiles);
        }
    }
}


// Function that passes checked URLs
function sendPageList(checked_profiles)  {
    chrome.runtime.sendMessage(
        // message - JSON
        // Action is new_clip to ensure we use the correct background.js event listener
        {action: "checked_profiles", checked:checked_profiles},
        // responseCallback
        function (response) {
            // console.log(response);
        });
}
// Function that handles button

function handleButton() {
    // fetch the people
    requestResults();
}

// Event listener that listens for list button being clicked

