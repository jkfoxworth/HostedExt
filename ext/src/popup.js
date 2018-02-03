// popup.js

var profiles_on_deck = [];
var port = null;
var back_to_pop = [];
/*

User Authentication State
=========================

*/

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


/*

Messaging
========

*/

// Our port to message background
function make_send_port(message) {
  port = chrome.runtime.connect({
    name: 'popup > background'
  });
  port.onDisconnect.addListener(function(msg) {
    port = null;
  });
  port.postMessage(message);
}

// Listen for all messages
chrome.runtime.onConnect.addListener(function(port) {
  if (port.name === 'background > popup') { // A port was just opened to speak with popup
    // if any other ports open from background then close
    if (back_to_pop) {
      for (var i = 0; i < back_to_pop.length; i++) {
        if (i === back_to_pop.length - 1) {
          back_to_pop.push(port);
        } else {
          back_to_pop[i].disconnect().pop();
        }
      }
    } else {
      back_to_pop.push(port);
    }

    port.onMessage.addListener(function(msg) { // Port is relevant
      switch (msg.action) { // action will determine reaction
        case 'show auth error': // If server returns 400 sometime after login
          doLogout();
          break;
        case 'prune_results':
          profiles_on_deck = [];
          var len_of_prune = msg.count;
          update_cart_qty(len_of_prune);
          break;
        case 'shake cart':
            update_cart_qty(msg.count);
            break;


      }
    });
  }
});
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
  $('#login_button').on('click', doLogin);
  hide_element('#actions');
  unhide_element('#login');
}

function show_action() {
  unhide_element('#actions');
  $('#logout_button').on('click', doLogout);
  $('#select_button_dropdown').on('click', requestResults);
  $('#start_extract').on('click', signalStartExtract);
  $('#pause_extract').on('click', signalStopExtract);
  $('#clear_extract').on('click', signalClearExtract);
  $('#open_log_button').on('click', checkMessages(show_messages));
  checkCartSize(quietSetMasterCartSize);
}

function quietSetMasterCartSize(cart_size) {
  $cart = $('#shopping-cart-btn .badge');
  $cart.html(cart_size);
}

function update_cart_qty(new_qty) {
  // update global
  console.log("New qty" + new_qty);
  $cart = $('#shopping-cart-btn .badge');
  $cartIcon = $('#shopping-cart-btn .glyphicon');
  $cartQty = parseInt($cart.html());
  $cartQty += parseInt(new_qty);
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
  show_login();
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
function checkMessages(callback) {
  chrome.storage.sync.get('hermes_messages', function(items) {
    callback(items.hermes_messages);
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
  chrome.storage.sync.set({
    'token': null
  });
  new_logout();
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
    make_send_port({
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
    make_send_port({
      action: "extract_signal",
      content: say
    });
  }
}
