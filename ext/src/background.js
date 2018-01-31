// background.js

/*

GLOBALS
=======

*/
// Global var to store the tab id where extract was called
var active_tab;

var token;

// Uncomment as needed for local/live
// run devMode() in background.js console to set all global urls to local

function devMode() {
  post_data_url = "http://127.0.0.1:5000/api/v1/profiles";
  auth_url = "http://127.0.0.1:5000/api/v1/token";
  confirm_auth_url = "http://127.0.0.1:5000/api/v1/test_token";
  prune_url = "http://127.0.0.1:5000/api/v1/prune";
  console.log("Dev Mode On, endpoints set to:");
  console.log(post_data_url);
  console.log(auth_url);
  console.log(confirm_auth_url);
  console.log(prune_url);
}

var post_data_url = "https://estasney1.pythonanywhere.com/api/v1/profiles";
var auth_url = "https://estasney1.pythonanywhere.com/api/v1/token";
var confirm_auth_url = "https://estasney1.pythonanywhere.com/api/v1/test_token";
var prune_url = "https://estasney1.pythonanywhere.com/api/v1/prune";


// TODO API Endpoint that creates and lists all user session names


/*

----------
END GLOBALS

*/


/*

LOGIN HANDLERS
==============

 */


function handle_token_check(token, callback) {
  if (token === false) {
    show_login(callback); // No user token found, popup.js show login page
  } else { // A token is found in storage. Is it valid?
    (function() {
      chrome.storage.sync.get('token', function(items) {
        validateToken(items.token, callback); // Token validation
      });
    })();
  }
}

// confirms valid token with server

function validateToken(token, callback) {
  $.ajax({
    type: 'GET',
    async: true,
    timeout: 10000,
    url: confirm_auth_url,
    dataType: 'json',
    statusCode: {
      404: function() {
        show_login(callback); // Token not accepted, popup show login
        // clear stored token
        chrome.storage.sync.set({
          'token': null
        });
        token = undefined;
      }
    },
    beforeSend: function(xhr) {
      xhr.setRequestHeader('Accept', 'application/json, text/javascript, */*; q=0.01');
      xhr.setRequestHeader('Accept-Language', 'en-US,en;q=0.8');
      xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
      xhr.setRequestHeader('Api-Key', token);
    },
    success: function() {
      show_action_page(callback); // Token accepted, show action buttons
      token = token;
    },
    error: function(data) {
      show_login(callback); // Catchall for errors, show login
      chrome.storage.sync.set({
        'token': null
      });
      token = undefined;
    }
  });
}

//  Function that base64 encodes username:password to use in Authentication header
function doEncoding(auth_string, sendResponse) {
  var auth_encoded = btoa(auth_string);
  getAuth(auth_encoded, store_token, sendResponse);
}


// requests api_key/token from external server
// callback on success
function getAuth(auth_encoded, callback, sendResponse) {
  $.ajax({
    type: 'POST',
    async: true,
    timeout: 10000,
    url: auth_url,
    dataType: 'json',
    statusCode: {
      404: function(data) {
        show_login_error(sendResponse); // Credentials are incorrect
      }
    },
    beforeSend: function(xhr) {
      xhr.setRequestHeader('Accept', 'application/json, text/javascript, */*; q=0.01');
      xhr.setRequestHeader('Accept-Language', 'en-US,en;q=0.8');
      xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
      xhr.setRequestHeader('Authorization', 'Basic ' + auth_encoded); // "Basic username:password" (base64)
    },
    success: function(data) {
      var json_data = JSON.stringify(data);
      token = JSON.parse(json_data)['token']; // Store the token in global var, token
      callback(json_data, sendResponse); // Store the token to chrome storage on receipt
    },
    error: function(data) {
      show_login_error(sendResponse);
    }
  });
}

// User is logged in, display action buttons
function show_action_page(callback) {
  callback({
    action: 'show actions'
  });
}

function show_login(callback) {
  callback({
    action: 'show login'
  });
}

function show_login_error(callback) {
  console.log('telling popup of error');
  save_new_message('Error logging in');
  callback({
    action: 'login fail'
  });
}


/*

Login Event Listeners
====================

*/

// Called when popup is opened
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === "get user state") {
    check_token(handle_token_check, sendResponse);
    return true;
  } else if (request.action === "user login submit") {
    doEncoding(request.data, sendResponse);
    return true;
  }
});

/*

Storage Functions
================

 */
function retrieve_token(json_data) {
  if (token) {
    postData(json_data, token);
  } else {
    chrome.storage.sync.get('token', function(items) {
      postData(json_data, items.token);
    });
  }
}


// Check for user state
function check_token(callback, responsecallback) {
  chrome.storage.sync.get('token', function(items) {
    if (items) {
      try {
        if (items.token.length !== null) {
          callback(items.token, responsecallback);
        } else {
          callback(false, responsecallback);
        }
      } catch (e) {
        callback(false, responsecallback);
      }


    } else {
      callback(false, responsecallback);
    }
  });
}

// Set user state
function store_token(token_value, sendResponse) {
  token_value = JSON.parse(token_value)['token'];
  chrome.storage.sync.set({
    'token': token_value
  });
  token = token_value;
  console.log("Setting new token");
  save_new_message('Login success');
  sendResponse({
    'action': 'login success'
  });
}

// Save messages to Storage
function save_new_message(new_message) {
  chrome.storage.sync.get('hermes_messages', function(items) {
    if (items) {
      queue_message(new_message, items.hermes_messages);
    } else {
      queue_message(new_message, []);
    }
  });
}

function queue_message(new_message, old_messages) {
  var queue = old_messages;
  queue.push(new_message);
  if (old_messages.length <= 10) {
    write_message(queue);
  } else {
    queue.shift(); // The oldest message is removed
    write_message(queue);
  }
}

function write_message(messages) {
  chrome.storage.sync.set({
      'hermes_messages': messages,
      function() { // announce that new message is written
        chrome.runtime.sendMessage({
            action: "new_message"
          },
          function(response) {});
      }
    });
  }

  // Filtering AJAX response to send to server
  // Callback will be to send AJAX once parsed
  function filter_json(code, callback) {
    var mydata, positions, profile;
    code = JSON.parse(code);
    positions = code['data']["positions"] || false;
    profile = code['data']["profile"] || false;
    mydata = {};
    if (positions) {
      mydata["positions"] = positions;
    }
    if (profile) {
      mydata["profile"] = profile;
    }
    callback(mydata);
  }


  // Event Listeners

  /*
  Sender: Popup.js
  Content: Array of URLS
  On Message: call requestPages()
  Response Sent: None
   */

  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === "checked_profiles") {
      // if it's passing a list of profiles
      // console.log("Received list of profiles");
      // clear active_tab in case of failed requests earlier
      active_tab = undefined;
      prunePages(request.checked);
      var user_checked_message = "Selected " + request.checked.length + " to extract";
      console.log(user_checked_message);
      save_new_message(user_checked_message);
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
    var end_code = function() {
      re.lastIndex = start_code.index + start_code[0].length;
      var end_code = re.exec(raw);
      startJSON(raw, start_code, end_code, counter, urls);
    };
    end_code();
  }

  function startJSON(raw, start_code, end_code, counter, urls) {
    var json_code = function() {
      var code = JSON.parse(raw.substring(start_code.index + start_code[0].length, end_code.index));
      // console.log(code);
      finishJSON(code, counter, urls);
    };
    json_code();
  }

  function finishJSON(code, counter, urls) {
    var s = function() {
      var c = JSON.stringify(code);
      dataToPopup(c, counter, urls);
      filter_json(c, retrieve_token);
    };
    s();

  }


  function dataToPopup(response, counter, urls) {
    var end_counter = urls.length;
    chrome.runtime.sendMessage({
        action: "new_ajax",
        data: response
      }, // Sends message to popup.js
      // responseCallback
      function(response) { // Empty function, do nothing with response
      });

    counter++; // Increase counter by 1.
    // Timeout to set random interval between requests
    setTimeout(function() {
      if (counter < end_counter) {
        requestPages(counter, urls);
      } else {
        active_tab = undefined;
      }
    }, getRandomInt(5, 8));
  }


  /* Called from Event Listener.
  Counter - Int : Defaults to 0. Corresponds to index position of Array
  Urls - Array : Array of Urls
   */
  function prunePages(request) {
    var xhttp;
    xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
      if (this.readyState === 4 && this.status === 201) {
        console.log(this.responseText);
        var urls_to_request = JSON.parse(this.responseText)['data'];
        if (urls_to_request.length > 0) {
          requestPages(0, urls_to_request);
        }
        var server_says = "Server says extract " + urls_to_request.length;
        console.log(server_says);
        save_new_message(server_says);
      } else if (this.status === 400 || this.status === 401 || this.status === 404) {
        var server_says = "Session expired";
        console.log("server_says");
        save_new_message(server_says);
      }
    };
    xhttp.open("POST", prune_url, true);
    xhttp.setRequestHeader("Content-type", "application/json");
    xhttp.setRequestHeader('Api-Key', token);

    var data = JSON.stringify({
      'data': request
    });
    xhttp.send(data);
  }

  function requestPages(counter, urls) {
    if (active_tab) {
      chrome.tabs.sendMessage(active_tab.id, {
        action: 'get_page',
        target: urls[counter]
      }, function(response) {
        startPattern(response.data, counter, urls); // Callback called when response is received
      });
    } else {
      chrome.tabs.query({
        active: true,
        currentWindow: true
      }, function(tabs) { // Query returns active tab
        active_tab = tabs[0];
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'get_page',
          target: urls[counter]
        }, function(response) {
          startPattern(response.data, counter, urls); // Callback called when response is received
        });
      });
    }
  }

  function postData(filtered_ajax, user_token) {
    var xhttp;
    xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
      if (this.readyState === 4 && this.status === 201) {
        // TODO Update user progress
      }
    };
    xhttp.open("POST", post_data_url, true);
    xhttp.setRequestHeader("Content-type", "application/json");
    xhttp.setRequestHeader('Api-Key', user_token);

    var data = JSON.stringify({
      'data': filtered_ajax
    });
    xhttp.send(data);
  }

  function getRandomInt(min, max) {
    min = Math.ceil(min) * 1000;
    max = Math.floor(max) * 1000;
    var calc = Math.floor(Math.random() * (max - min)) + min;
    return calc;
  }
