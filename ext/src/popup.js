// popup.js
// popup.html will mimic background.html (this holds the data)

// function that will ask background.js to get the name elements from the page.
// Use callback to await response
function askBackground() {
    chrome.runtime.sendMessage(
        {action: "ask"},
        function (response) {
            console.log('popup asks background');
            console.log(response);
            updatePopup(response);
            });
}

function updatePopup(response) {
    var bg_contents = response.bg_contents;
  for (var i=0; i < bg_contents.length; i++) {
      var person_element = $.parseHTML("<p>" + bg_contents[i] + "</p>");
      console.log("Adding" + bg_contents[i]);
      $("#people_holder").append(person_element);
  }
}

function handleButton() {
    askBackground();
}


// Event listener that listens for button being clicked from popup
document.getElementById('clickme').addEventListener('click', handleButton);
