// popup.js

var profiles_on_deck = [];
var port_to_background = null;
var port_from_background = null;
var radial = null;

// Run Immediately on Load Popup.js
(function() {
    chrome.runtime.sendMessage({
            action: "get user state"
        },
        function(response) {
            handleUserState(response);
        });

    function handleUserState(response) {
        if (response.action === "show login") {
            show_login();
        } else if (response.action === 'show actions') {
            show_action();
        } else if (response.action === 'show login error') {
            show_login_error();
        }
    }

    // Listen for background setting up a port to popup
    chrome.runtime.onConnect.addListener(function(port) {
        if (port.name === 'background > popup') {
            // A port was just opened to speak with popup
            if (port_from_background) { // This port is now dead
                port_from_background.disconnect();
                port_from_background = port;
            }
            port.onMessage.addListener(function(msg) {
                switch (msg.action) { // action will determine reaction
                    case 'show auth error': // If server returns 400 sometime after login
                        doLogout();
                        break;
                    case 'prune_results':
                        profiles_on_deck = [];
                        var len_of_prune = msg.count;
                        if (len_of_prune > 0) {
                            update_cart_qty(len_of_prune);
                        } else {
                          flashCart();
                        }
                        break;
                    case 'shake cart': // Animation showing new cart qty
                        update_cart_qty(msg.count);
                        break;
                    case 'shake radial':
                        shakeRadial(msg.count);
                        break;
                    case 'show all messages':
                        show_messages(msg.messages);
                        break;
                    case 'cart cleared':
                        update_cart_qty(-999);
                        break;
                    case 'activity request':
                        showAllowance(msg.data);
                        break;
                    case 'cart max':
                      flashCart();
                      break;
                    case 'flash cart':
                      flashCart();
                      break;
                }
            });
        }
    });
})();
/*

Messaging
========

*/

// Our port to message background
function messageBackground(message) {
    console.log("Message to background");
    console.log(message);
    try {
        port_to_background.postMessage(message);
    } catch (e) {
        port_to_background = chrome.runtime.connect({
            name: 'popup > background'
        });
        port_to_background.onDisconnect.addListener(function(msg) {
            port_to_background = null;
            port_from_background = null;
        });
        port_to_background.postMessage(message);
    }
}

function setupBackgroundPort() {
    port_to_background = chrome.runtime.connect({
        name: 'popup > background'
    });
    port_to_background.onDisconnect.addListener(function(msg) {
        port_to_background = null;
        port_from_background = null;
    });
}


/*

DOM Manipulation
================

 */
function unhide_element(selector) {
    var current_class = $(selector).prop('class');
    var new_class = current_class.replace(/hidden/g, '').trim();
    $(selector).prop('class', new_class);
}

function hide_element(selector) {
    var current_class = $(selector).prop('class');
    if (current_class.indexOf("hidden") === -1) {
        var new_class = current_class + " hidden";
        $(selector).prop('class', new_class);
    }
}

function show_login() {
    setupBackgroundPort();
    $('#login_button').on('click', doLogin);
    hide_element('#actions');
    hide_element('#messages');
    unhide_element('#login');
}

function show_action() {
    setupBackgroundPort();
    unhide_element('#actions');
    $('#logout_button').on('click', doLogout);
    $('#select_button_dropdown').on('click', requestResults);
    $('#start_extract').on('click', signalStartExtract);
    $('#pause_extract').on('click', signalStopExtract);
    $('#clear_extract').on('click', signalClearExtract);
    $('#open_log_button').on('click', checkMessages);
    $('#open_log_button').on('click', flip_log_button_text);
    checkCartSize(quietSetMasterCartSize);
    askAllowance();
    // TODO Check Allowance
}

//
function quietSetMasterCartSize(cart_size) {
    $cart = $('#shopping-cart-btn .badge');
    $cart.html(cart_size);
}

function askAllowance() {
    messageBackground({
        action: 'need activity'
    });
}

function showAllowance(activity) {
    if (radial) {
        radial.update(activity.allowance_remain);
    } else {
        radial = initRadial(".cartvis", activity.allowance_remain, activity.allowance);
        unhide_element('#d3div');
    }
}

function update_cart_qty(new_qty) {
    // update global
    $cart = $('#shopping-cart-btn .badge');
    $cartIcon = $('#shopping-cart-btn .glyphicon');
    $cartQty = parseInt($cart.html());
    $cartQty += parseInt(new_qty);
    if ($cartQty < 0) {
        $cartQty = 0;
    }
    $cart.html($cartQty.toString());
    $cartIcon.addClass('cart-run');
    $cart.addClass('shake');
    $('#shopping-cart-btn').addClass('glow');
    setTimeout(function() {
        $cartIcon.removeClass('cart-run');
        $cart.removeClass('shake');
        $('#shopping-cart-btn').removeClass('glow');
    }, 800);
}

function flashCart(){
  $cart = $('#shopping-cart-btn .badge');
  $cart.addClass('flash');
  setTimeout(function() {
      $cart.removeClass('flash');
  }, 3000);
}

function handleOpenLog() {
    // TODO setInterval updates
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
    hide_element('#d3div');
    show_login();
}

function flip_log_button_text() {
    var new_text;
    var current_text = $('#open_log_button').prop('textContent');
    if (current_text.indexOf("Open") === -1) { // It says close
        new_text = "Open Log";
    } else {
        new_text = "Close Log";
    }
    $('#open_log_button').prop('textContent', new_text);
}

function show_messages(messages) {
    unhide_element('#messages');

    $('.message_item').remove();
    try {
        for (var i = 0; i < messages.length; i++) {
            var message_element = $("<div>", {
                id: ("message_" + i.toString()),
                class: "card card-block message_item",
                text: messages[i]
            });
            $('#collapseMessages').append(message_element);
        }
    } catch (e) {
        var no_messages = $("<div>", {
            id: "message_0",
            class: "card card-block message_item",
            text: "...Nothing found in logs..."
        });
        $('#collapseMessages').append(no_messages);
        console.log(e);
    }
}

function updateItemsAvailable(count) {
    $('#add_to_cart_count').prop('textContent', count);
    unhide_element('#add_to_cart_count');
    $('#add_to_cart').on('click', makeExtractList);
}

function styleResults(SearchResults) {
    // Show number in badge
    try {
        updateItemsAvailable(SearchResults.length.toString());
    } catch (e) {
        updateItemsAvailable('0');
    }
    // Clear profiles on deck
    profiles_on_deck = [];
    for (var i = 0; i < SearchResults.length; i++) {
        profiles_on_deck.push(SearchResults[i].profile_url);
    }
}

/*

Storage
=======

*/

// Check sync storage for messages from background
function checkMessages() {
    messageBackground({
        action: 'check messages'
    });
}

function checkCartSize(callback) {
    chrome.storage.sync.get('hermes_cart', function(items) {
        var cart_size = items.hermes_cart.length;
        console.log("Cart size found is " + cart_size);
        callback(cart_size);
    });
}

/*

Messaging Functions
===================

 */

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

function credToBackground(auth_string) {
    chrome.runtime.sendMessage({
            action: "user login submit",
            data: auth_string
        },
        function(response) {
            handleLoginResponse(response);
        });
}

function doLogin() {
    var username = $('#user_id').val();
    var password = $('#user_pass').val();
    var auth_string = username + ":" + password;
    credToBackground(auth_string);
}

function doLogout() {
    new_logout();
    messageBackground({
        action: 'logout'
    });
}

function requestResults() {
    chrome.tabs.query({
        active: true
    }, function(tabs) {
        chrome.tabs.sendMessage(
            tabs[0].id, {
                action: "fetch_results"
            },
            function(response) {
                styleResults(response);
            });
    });
}

// Function that passes checked URLs
function sendPageList(checked_profiles) {
    try {
        port.postMessage({
            action: 'checked_profiles',
            checked: checked_profiles
        });
    } catch (e) {
        messageBackground({
            action: 'checked_profiles',
            checked: checked_profiles
        });
    }
}

function makeExtractList() {
    // Generate array of URL's that have been pushed to global
    sendPageList(profiles_on_deck);
}

/*

Messaging - Extraction

*/

function signalStartExtract() {
    extractSignals('start_extract');
}

function signalStopExtract() {
    extractSignals('stop_extract');
}

function signalClearExtract() {
    extractSignals('clear_extract');
}

function extractSignals(say) {
    try {
        port.postMessage({
            action: "extract_signal",
            content: say
        });
    } catch (e) {
        messageBackground({
            action: "extract_signal",
            content: say
        });
    }
}

/*

D3

*/

// Creates the radial progress chart
// Returns the chart
// Store in variable so that .update can be Called
function initRadial(sel, start, max) {
    var new_chart = new RadialProgressChart(sel, {
        diameter: 200,
        max: max,
        round: true,
        series: [{
            labelStart: "",
            value: start,
            color: {
                linearGradient: {
                    x1: "0%",
                    y1: "100%",
                    x2: "50%",
                    y2: "0%",
                    spreadMethod: "pad"
                },
                stops: [{
                        offset: "0%",
                        "stop-color": "#fe08b5",
                        "stop-opacity": 1
                    },
                    {
                        offset: "100%",
                        "stop-color": "#ff1410",
                        "stop-opacity": 1
                    }
                ]
            }
        }],
        center: {
            content: [
                function(value) {
                    return value;
                },
                " OF " + max + " Profiles"
            ],
            y: 25
        }
    });
    return new_chart;
}

function shakeRadial(new_count) {
    radial.update(new_count);
}

function updateMaxText(new_text, sel) {
    $(sel).textContent = new_text;
}
