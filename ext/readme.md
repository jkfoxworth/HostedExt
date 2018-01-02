### This is my extension

1. Background.html
  1. Show saved profiles
  2. Option to export as .csv

2. content_scripts
  1. On each page matching a LinkedIn Profile, inject the following
    1. Button with "save profile"
    2. CSS to style button
  2. Event Listener for when button is clicked
    1. Handle it by sending a message to background (js or html?) with the associated profile data.

3. Action of clicked
  1. Content scripts
    1. Adds a Button
      1. Listens for clicked
    2. Fetches and passes data to Background
  2. Background
    1. Add listener for when content script returns something


### Plan

1. Write content script
  1. [x] Inject a Button
  2. [x] Style the Button
  3. [x] Event listener
  4. [x] Fetch data
  5. Pass data
    1. function returns data
      1. where does it go?
      

2. Event listener for background

### Snippets

1. Inject code
  1. Mimic the add to the clipboard
