// background.js

/*

GLOBALS
=======

*/
// Global var to store the tab id where extract was called
var active_tab = null;
var extracting_active = false;
var token = null;
var messages = [];

/*
Background.js takes passive strategy to ports.

When popup opens it will open a port to background. Background listens for this
event. When detected:
    Add onDisconnect listener to incoming port
    Open outgoing port to Popup

When popup closes, messaging on the outgoing port will raise exception if
messaging is attempted.

When incoming port is disconnected, clear the outgoing port. If this outgoing
port is null, then messsages to popup should be skipped.


*/
var port_to_popup = null;
var port_from_popup = null;

chrome.runtime.onConnect.addListener(function(port) {
    if (port.name === 'popup > background') {
        console.log("Popup connected");
        port_from_popup = port;
        // Setup outgoing port, port_to_popup
        port_to_popup = chrome.runtime.connect({
            name: 'background > popup'
        });

        port_from_popup.onDisconnect.addListener(function(msg) {
            console.log("Popup disconnected");
            port_from_popup = null;
            port_to_popup = null;
        });

        port_from_popup.onMessage.addListener(function(msg) {
            switch (msg.action) {
                case 'checked_profiles':
                    // Begins cascade of events
                    // Starts with asking server what profiles are duplicates
                    // Server responds with duplicates removed
                    // Current cart is retrieved from storage
                    // Current cart has new profiles appended
                    // New cart is then written to storage
                    retrieve_token(prunePages, msg.checked);
                    var user_checked_message = "Selected " + msg.checked.length + " to extract";
                    save_new_message(user_checked_message);
                    break;
                case 'check messages':
                    messagePopup({
                        action: 'show all messages',
                        messages: messages
                    });
                    break;
                case 'logout':
                    token = null;
                    break;
                case 'extract_signal':
                    switch (msg.content) {
                        case 'start_extract':
                            extracting_active = true;
                            save_new_message("Starting Extract");
                            if (active_tab) { // paceExtract has timeout. get active tab now
                                paceExtract();
                            } else {
                                chrome.tabs.query({
                                    highlighted: true,

                                }, function(tabs) { // Query returns active tab
                                    active_tab = tabs[0];
                                    paceExtract();
                                });
                            }
                            break;
                        case 'stop_extract':
                            extracting_active = false;
                            save_new_message("Extract Paused");
                            break;
                        case 'clear_extract':
                            store_cart(); // calling with params effectively clears cart
                            save_new_message("Cart emptied");
                            messagePopup({
                                action: 'cart cleared'
                            });
                            break;
                    }
                    break;
            }
        });
    }
});

function messagePopup(message) {
    console.log(message);
    console.log(port_to_popup);
    if (port_to_popup) { // Popup is open and listening
        try {
            port_to_popup.postMessage(message);
        } catch (e) {
            console.log(e);
        }
    }
}

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
// TODO User Activity API
/*

----------
END GLOBALS

*/


/*

LOGIN HANDLERS
==============

 */
// token
/*
1. Global token is intended to store valid token
2. Token may become invalid
3. Global token may be cleared, yet token remains valid

Scenarios for token
1. Popup asks if it should show login or actions?
2. Any requests to external server

Design decisions
1. If global token, assume it is valid until decided otherwise
    a. Reduces traffic
    b. Reduces chrome.storage calls which have rate limits

2. If no global token, assume session token would be invalid
*/

function handle_token_check(callback) {
    if (token) {
        show_action_page(callback);
    } else {
        show_login(callback);
    }
}

//  Function that base64 encodes username:password to use in Authentication header
function doEncoding(auth_string, sendResponse) {
    var auth_encoded = btoa(auth_string);
    getAuth(auth_encoded, sendResponse);
}

// requests api_key/token from external server
// callback on success
function getAuth(auth_encoded, sendResponse) {
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
            console.log(token);
            show_login_success(sendResponse);
        },
        error: function(data) {
            show_login_error(sendResponse);
        }
    });
}

// User is logged in, display action buttons
function show_action_page(callback) {
    try {
        callback({
            action: 'show actions'
        });
    } catch (e) {
        console.log(e);
    }
}

function show_login(callback) {
    token = null;
    try {
        callback({
            action: 'show login'
        });
    } catch (e) {
        console.log(e);
    }
}

function show_login_success(callback) {
    try {
        callback({
            action: 'login success'
        });
    } catch (e) {
        console.log(e);
    }
}

function show_login_error(callback) {
    token = null;
    try {
        callback({
            action: 'login fail'
        });
    } catch (e) {
        console.log(e);
    }
}

function show_abnormal_auth() {
    try {
        messagePopup({
            action: 'show auth error'
        });
    } catch (e) {
        console.log(e);
    }
}



/*

Login Event Listeners
====================

*/

// Called when popup is opened
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === "get user state") {
        handle_token_check(sendResponse);
        return true;
    } else if (request.action === "user login submit") {
        doEncoding(request.data, sendResponse);
        return true;
    }
});

/*

Token after initial login
================

 */
function retrieve_token(callback, data) {
    if (token) {
        callback(data, token);
    } else {
        show_login();
    }
}



// Save messages to Storage
function save_new_message(new_message) {
    console.log(new_message);
    queue_message(new_message);
}

function queue_message(new_message) {
    var queue;
    var old_messages = messages;
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

function write_message(queue) {
    messages = queue;

    function announce_message() {
        try {
            messagePopup({
                action: 'new_message'
            });
        } catch (e) {
            console.log(e);
        }
    }
}

// Prune URLs cascade ends here
function store_cart(cart) {
    console.log("Storing cart " + cart);

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
        try {
            var old_cart = items.hermes_cart;
            var all_cart = old_cart.concat(new_data);
            var unique_cart = [];
            $.each(all_cart, function(i, el) {
                if ($.inArray(el, unique_cart) === -1) unique_cart.push(el);
            });
            store_cart(unique_cart);
            try {
                messagePopup({
                    action: 'prune_results',
                    count: unique_cart.length - old_cart.length
                });
            } catch (e) {
                console.log(e);
            }
        } catch (e) { // No cart found, likely
            console.log(e);
            store_cart(new_data);
            try {
                messagePopup({
                    action: 'prune_results',
                    count: new_data.length
                });
            } catch (e) {
                console.log(e);
            }
        }
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
        try {
            messagePopup({
                action: 'cart count',
                count: new_cart_count
            });
        } catch (e) {
            console.log(e);
        }
        save_new_message("Items remaining in cart: " + new_cart_count);
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
        console.log(e);
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
        console.log(e);
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
        console.log(e);
        extracting_active = false;
    }
}

function finishJSON(code, counter, urls) {
    try {
        var s = function() {
            var c = JSON.stringify(code);
            filter_json(retrieve_token, c);
        };
        s();
    } catch (e) {
        console.log(e);
        extracting_active = false;
    }
}

// Filtering AJAX response to send to server
// Once complete, send to postData
function filter_json(callback, code) {
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
        callback(postData, mydata);
    } catch (e) {
        console.log(e);
        extracting_active = false;
    }
}



/* Called from Event Listener.
Counter - Int : Defaults to 0. Corresponds to index position of Array
Urls - Array : Array of Urls
 */

// Popup.js is sending 25 or fewer profile_streaming
// Before adding to our cart, ask server if any are duplicates

function prunePages(request, user_token) {
    var server_says;
    var xhttp;
    var user_request_len = request.length;
    xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
        if (this.readyState === 4 && this.status === 201) {
            var urls_to_request = JSON.parse(this.responseText).data;
            if (urls_to_request.length > 0 && urls_to_request.length !== user_request_len) {
                // Response is from server with non-duplicate Urls
                // Save them to cart
                append_to_cart(urls_to_request);
                server_says = "You added " + user_request_len.toString() + " to cart. " + urls_to_request.length.toString() + " items will be extracted. Remainder are present on server, added to your active file.";
            } else if (urls_to_request.length === 0) {
                server_says = "You added " + user_request_len.toString() + " to cart. All are present on server and are now in your active file.";
            } else if (urls_to_request.length > 0 && urls_to_request.length === user_request_len) {
                append_to_cart(urls_to_request);
                server_says = "You added " + user_request_len.toString() + " to cart. None present on server.";
            } else {
                append_to_cart(urls_to_request);
                server_says = "You added " + user_request_len.toString() + " to cart.";
            }
            save_new_message(server_says);


        } else if (this.status === 400 || this.status === 401 || this.status === 404) {
            server_says = "Server rejected pruning request";
            save_new_message(server_says);
            show_abnormal_auth();
        } else if (this.status === 500) {
            server_says = "Server error occured during pruning request";
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
    }
    if (extracting_active) {
        smartWait();
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
            highlighted: true,

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
            var shake_cart_message = {
                action: 'shake cart',
                count: -1
            };
            try {
                messagePopup(shake_cart_message);
            } catch (e) {
                console.log(e);
            }
        } else if (this.status === 400 || this.status === 401 | this.status === 404) {
            server_says = "Server rejected posting to profile";
            save_new_message(server_says);
            show_abnormal_auth();
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
