// background.js

/*

GLOBALS
=======

*/
// Global var to store the tab id where extract was called
var active_tab;
var extracting_active = false;
var token;

// Port to message Popup
var pop_port = chrome.runtime.connect({
  name: 'background > popup'
});

var pop_in_port = null;

// Listening
chrome.runtime.onConnect.addListener(function(port) {
  if (port.name === 'popup > background') {
    pop_in_port = port;
    pop_in_port.onMessage.addListener(function(msg) {
      switch (msg.action) {
        case 'checked_profiles':
          // Begins cascade of events
          // Starts with asking server what profiles are duplicates
          // Server responds with duplicates removed
          // Current cart is retrieved from storage
          // Current cart has new profiles appended
          // New cart is then written to storage
          prunePages(msg.checked);
          var user_checked_message = "Selected " + msg.checked.length + " to extract";
          console.log(user_checked_message);
          break;
        case 'extract_signal':
          switch (msg.content) {
            case 'start_extract':
              extracting_active = true;
              save_new_message("Starting Extract");
              paceExtract();
              break;
            case 'stop_extract':
              extracting_active = false;
              save_new_message("Extract Paused");
              break;
            case 'clear_extract':
              store_cart(); // calling with params effectively clears cart
              save_new_message("Cart emptied");
              break;
          }
          break;

      }
    });
  }
});

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
    }
  });
}


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
      token = JSON.parse(json_data).token; // Store the token in global var, token
      callback(json_data, sendResponse);
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
  token = undefined;
  try {
    chrome.storage.sync.set({
      'token': null
    });
  } catch (e) {
    console.log(e);
  }
  if (callback) {
    callback({
      action: 'show login'
    });
  } else {
    try {
      pop_port.postMessage({
        action: 'show login'
      });
    } catch (e) {
      console.log(e);
    }
  }
}

function show_login_error(callback) {
  callback({
    action: 'login fail'
  });
  try {
    chrome.storage.sync.set({
      'token': null
    });
  } catch (e) {
    console.log(e);
  }
  token = undefined;
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
  token_value = JSON.parse(token_value).token;
  chrome.storage.sync.set({
    'token': token_value
  });
  token = token_value;
  console.log("Setting new token");
  sendResponse({
    action: 'login success'
  });
  return true;
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
  var queue;
  if (old_messages) {
    queue = old_messages;
  } else {
    write_message([new_message]);
    return;
  }
  queue.push(new_message);
  if (old_messages.length <= 10) {
    write_message(queue);
  } else {
    queue.shift(); // The oldest message is removed
    write_message(queue);
  }
}

function write_message(messages) {
  function announce_message() {
    pop_port.postMessage({
      action: 'new_message'
    });
  }
  chrome.storage.sync.set({
      'hermes_messages': messages
    },
    function() {
      announce_message();
    });
}

// Prune URLs cascade ends here
function store_cart(cart) {
  if (cart) {
    chrome.storage.sync.set({
      'hermes_cart': cart
    });
  } else {
    extracting_active = false; // cart is empty no extracting
    chrome.storage.sync.set({
      'hermes_cart': [],
    });
  }
}

// write pruned urls to hermes_cart in storage
function append_to_cart(new_data) {
  // get 'hermes_cart' and once complete run anon function
  chrome.storage.sync.get('hermes_cart', function(items) {
    var old_cart = items.hermes_cart;
    // define function here to ensure appending complete before proceeding
    function appendThenCall(new_data, old_cart, callback) {
      try {
        for (var i = 0; i < new_data.length; i++) {
          old_cart.push(new_data[i]);
          if (i === (new_data.length - 1)) {
            callback(old_cart);
          }
        }

      } catch (e) {
        callback(new_data);
      }
    }
    appendThenCall(new_data, old_cart, store_cart);
  });
}

function pull_from_cart(callback) {
  var pulled;
  var new_cart_count;
  chrome.storage.sync.get('hermes_cart', function(items) {
    var cart = items.hermes_cart;
    try {
      pulled = cart.shift();
      new_cart_count = cart.length;
    } catch (e) { // Catches if hermes_cart is empty
      extracting_active = false;
      save_new_message("Cart empty");
      pulled = null;
      new_cart_count = 0;
      return;
    }
    // pulled is passed to callback
    callback(pulled);
    // put cart back in modified state
    store_cart(cart);
    // TODO Announce - 1
    pop_port.postMessage({
      action: 'cart count',
      count: new_cart_count
    });
    console.log("Items remaining in cart: " + new_cart_count);
  });
}
// Event Listeners

/*
Sender: Popup.js
Content: Array of URLS
On Message: call requestPages()
Response Sent: None
 */



/* Function Chain That Handles Parsing AJAX ResponseText


startPattern
finishPattern
startJSON
finishJSON
filter_json
retrieve_token
postData

 */
function startPattern(raw) {
  try {
    var pattern = new RegExp(/<code id="templates\/desktop\/profile\/profile_streaming-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}-content"><!--/, 'gim');
    var start_code = function() {
      var sc = pattern.exec(raw);
      finishPattern(raw, sc);
    };
    start_code();
  } catch (e) {
    extracting_active = false;
  }
}

function finishPattern(raw, start_code) {
  try {
    var re = /--><\/code>/gim;
    var end_code = function() {
      re.lastIndex = start_code.index + start_code[0].length;
      var end_code = re.exec(raw);
      startJSON(raw, start_code, end_code);
    };
    end_code();
  } catch (e) {
    extracting_active = false;
  }
}

function startJSON(raw, start_code, end_code) {
  try {
    var json_code = function() {
      var code = JSON.parse(raw.substring(start_code.index + start_code[0].length, end_code.index));
      // console.log(code);
      finishJSON(code);
    };
    json_code();
  } catch (e) {
    extracting_active = false;
  }
}

function finishJSON(code, counter, urls) {
  try {
    var s = function() {
      var c = JSON.stringify(code);
      filter_json(c, retrieve_token);
    };
    s();
  } catch (e) {
    extracting_active = false;
  }
}

// Filtering AJAX response to send to server
// Once complete, send to postData
function filter_json(code, callback) {
  try {
    var mydata, positions, profile;
    code = JSON.parse(code);
    positions = code.data.positions || false;
    profile = code.data.profile || false;
    mydata = {};
    if (positions) {
      mydata.positions = positions;
    }
    if (profile) {
      mydata.profile = profile;
    }
    callback(mydata);
  } catch (e) {
    extracting_active = false;
  }
}



/* Called from Event Listener.
Counter - Int : Defaults to 0. Corresponds to index position of Array
Urls - Array : Array of Urls
 */

// Popup.js is sending 25 or fewer profile_streaming
// Before adding to our cart, ask server if any are duplicates

function prunePages(request) {
  var server_says;
  var xhttp;
  var user_request_len = request.length;
  xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function() {
    if (this.readyState === 4 && this.status === 201) {

      console.log(this.responseText);
      var urls_to_request = JSON.parse(this.responseText).data;
      if (urls_to_request.length > 0 && urls_to_request.length !== user_request_len) {
        // Response is from server with non-duplicate Urls
        // Save them to cart
        append_to_cart(urls_to_request);
        server_says = "You added " + user_request_len.toString() + " to cart. " + urls_to_request.length.toString() + " items will be extracted. Remainder are present on server, added to your active file.";
      } else if (urls_to_request.length === 0) {
        server_says = "You added " + user_request_len.toString() + " to cart. All are present on server and are now in your active file.";
      } else if (urls_to_request.length > 0 && urls_to_request.length === user_request_len) {
        server_says = "You added " + user_request_len.toString() + " to cart. None present on server.";
      } else {
        server_says = "You added " + user_request_len.toString() + " to cart.";
      }
      console.log(server_says);
      save_new_message(server_says);
      pop_port.postMessage({
        action: 'prune_results',
        count: urls_to_request.len
      });

    } else if (this.status === 400 || this.status === 401 || this.status === 404) {
      server_says = "Server rejected pruning request";
      console.log(server_says);
      save_new_message(server_says);
      token = undefined;
      show_login();
    } else if (this.status === 500) {
      server_says = "Server error occured during pruning request";
      console.log(server_says);
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

function paceExtract() {
  function smartWait() {
    var wait_time = getRandomInt(5, 10);
    setTimeout(function() {
      pull_from_cart(doExtract);
    }, wait_time);
    if (extracting_active) {
      smartWait();
    }
  }
}

function doExtract(target) {
  if (active_tab) { // global
    chrome.tabs.sendMessage(active_tab.id, {
      action: 'get_page',
      target: target
    }, function(response) {
      startPattern(response.data); // Starts cascade, ends with postData
    });
  } else {
    chrome.tabs.query({
      active: true,
      currentWindow: true
    }, function(tabs) { // Query returns active tab
      active_tab = tabs[0];
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'get_page',
        target: target
      }, function(response) {
        startPattern(response.data); // Starts cascade, ends with postData
      });
    });
  }
}

function postData(filtered_ajax, user_token) {
  var server_says;
  var xhttp;
  xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function() {
    if (this.readyState === 4 && this.status === 201) {
      paceExtract(); // recursion
      // TODO message popup, cart minus -1

    } else if (this.status === 400 || this.status === 401 | this.status === 404) {
      token = undefined;
      server_says = "Server rejected posting to profile";
      save_new_message(server_says);
      show_login();
    } else if (this.status === 500) {
      server_says = "Server error while posting profile";
      // TODO add back to queue
      save_new_message(server_says);
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
