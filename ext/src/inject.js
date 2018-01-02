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

// Uncomment addButton to append a button to the page
// pageStatus(addButton);

// Comment to prevent running clipIt as soon as the page loads
pageStatus(clipIt);