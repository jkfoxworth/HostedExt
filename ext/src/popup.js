// popup.js

var profiles_on_deck = [];


chrome.runtime.sendMessage({
    action: "get user state"
  },
  function(response) {
    handleUserState(response);
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

function handleUserState(response) {
  if (response.action === "show login") {
    show_login();
  } else if (response.action === 'show actions') {
    show_action();
  } else if (response.action === 'show login error') {
    show_login_error();
  }
}

function handleLoginResponse(response) {
  if (response) {
    if (response.action === 'login success') {
      new_login();
    } else if (response.action === 'login fail') {
      show_login_error();
    }
  } else {
    show_login_error();
  }
}

// Check sync storage for messages from background
function checkMessages(callback) {
  chrome.storage.sync.get('hermes_messages', function(items) {
    callback(items.hermes_messages);
  });
}

/*

DOM Manipulation
================

 */
function unhide_element(selector) {
  var current_class = $(selector).prop('class');
  var new_class = current_class.replace('hidden', '').trim();
  $(selector).prop('class', new_class);
}

function hide_element(selector) {
  var current_class = $(selector).prop('class');
  var new_class = current_class + " hidden";
  $(selector).prop('class', new_class);
}


function show_login() {
  $('#login_button').on('click', doLogin);
  unhide_element('#login');
}


function show_action() {
  $('#logout_button').on('click', doLogout);
  $('#select_button_dropdown').on('click', requestResults);
  unhide_element('#actions');
  checkMessages(show_messages); // Fetch and display messages
}

function show_login_error() {
  unhide_element('#login_alert');
}

function new_login() {
  hide_element('#login');
  show_action();
}

function new_logout() {
  hide_element('#actions');
  hide_element('#results');
  show_login();
}

function show_messages(messages) {
  unhide_element('#messages');
  $('.message_item').remove();
  for (var i = 0; i < messages.length; i++) {
    var message_element = $("<div>", {
      id: ("message_" + i.toString()),
      class: "card card-block message_item",
      text: messages[i]
    });
    $('#collapseMessages').append(message_element);
  }
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
  chrome.storage.sync.set({
    'token': null
  });
  new_logout();
}

function credToBackground(auth_string) {
  chrome.runtime.sendMessage({
      action: "user login submit",
      data: auth_string
    },
    function(response) {
      handleLoginResponse(response);
    });
}

function requestResults() {
  chrome.tabs.query({
    active: true,
    currentWindow: true
  }, function(tabs) {
    chrome.tabs.sendMessage(
      tabs[0].id, {
        action: "fetch_results"
      },
      function(response) {});
  });
}

// Awaits message from inject.js. Message contains SearchResults
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === "new_results") {
    styleResults(request.results); // Response Data to HTML
    sendResponse();
  }
});

// Awaits message from background. Message notifies that new message arrived.
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === "new_message") {
    checkMessages(show_messages);
  }
});

// Receives SearchResult object from inject.js
// Stores urls in global
// Counts urls and displays as badge in add to Cart

function updateCartCount(count) {
  $('#add_to_cart_count').text = count;
}

function styleResults(SearchResults) {

  // Show number in badge
  updateCartCount(SearchResults.length.toString());

  for (var i = 0; i < SearchResults.length; i++) {
    profiles_on_deck.push(SearchResults.profile_url);
  }
}
// These are passed to background.js

function makeExtractList() {
  // Generate array of URL's that have been pushed to global
  sendPageList(profiles_on_deck);
  // TODO User feedback

  // Clear the global
  profiles_on_deck = [];
}


// Function that passes checked URLs
function sendPageList(checked_profiles) {
  chrome.runtime.sendMessage(
    // message - JSON
    // Action is new_clip to ensure we use the correct background.js event listener
    {
      action: "checked_profiles",
      checked: checked_profiles
    },
    // responseCallback
    function(response) {
      // console.log(response);
    });
}
