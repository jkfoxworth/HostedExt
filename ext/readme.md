### Chrome Extension Architecture

1. Content Scripts
    1. Interact with page content
    2. Not persistent
    3. Cannot perform cross-site scripting
    4. Must follow same content security policy as page
        1. Why JavaScript Libraries are bundled with Extension
    
2. Popup
    1. HTML
        1. HTML that is displayed as popup
            1. Can include JavaScript (popup.js) with 'script' tag
    1. Js
    1. *Not* persistent
        

3. Background
    1. **Persistent**
    1. HTML
    1. Useful as a datastore
        1. I.e. Saving profiles as a table in HTML form
    1. JS
        1. Contains extension logic
        2. Performs the majority of messaging, logic, storage
        
        
4. Messaging
    1. How to pass data from content -> bacgkround -> popup?
    1. Chrome extension messaging
    1. Introduces complications from asynchronous nature
        
        

### Todo
1. Popup - Work in Progress
    1. Responsive
        a. Handles various states such as:
            1. Login
            2. Show possible actions
            3. Show Results
    2. Layout
        1. Adding bootstrap
    3. JS
        1. Add event listeners for various buttons
        2. Send receive messages with background.js
    

2. Background
    1. Background will now provide instructions to popup.js for View
    2. Login Scheme
        a. Browser Action Detected
        b. Popup begins as blank
        c. Background.js checks if user is authorized
            1. Checks for presence of API key in Chrome.storage
        d. If no token (first login), instructs popup to show login elements
        e. If token, confirms it is valid
            If not, shows login
    3. Actions
        a. Show profiles
    4. Results
        a. Future        






