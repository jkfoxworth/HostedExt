// This will await the document response that it is complete
// When can run this function as the top layer function
// It will execute the callback when page is readyState
// In this case the callback is a function to add a Button

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

// This should not be called directly
// Use as callback
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

// This is invoked from the clipit Button

function clipIt() {
    var pid = $("#context-data-form > input[type='hidden']:nth-child(3)").attr("value");
    var rhtml = $("#lira-profile")["0"].innerHTML;
    var purl = window.location.href;
    var profile = {
        id: pid,
        purl: purl,
        raw_html: rhtml
    };
    if (profile) {
        chrome.runtime.sendMessage(
            // message - JSON
            {action: "new_clip", id: profile.id, purl: profile.purl, raw_html: profile.raw_html},
            // responseCallback
            function (response) {
                console.log("this is inject's callback");
                console.log(response);
            });
    }
}

pageStatus(addButton);
pageStatus(clipIt);