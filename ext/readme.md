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
1. Popup
    1. Layout
        1. CSS
    2. Summarize AJAX
    3. Add option to download as CSV
        1. Script
        2. HTML
    4. Login
        1. Server side
            1. Authenticate
            2. Respond with Authorization header 
        2. Local storage
            1. Keep logged in for certain time            
    5. Sessions
        1. After authenticated
        2. Create GUID session key
        3. Add as a header to external POST
        4. Include Authorization header with POST

2. Background
    1. AJAX data constructor to remove
        1. Redundant Data
        2. Irrelevant Data
    2. Pass AJAX to External URL
        1. After filtering
    3. Script to pop URLS from fetch list if recently requested
        1. If popped, accept server response with url data
    4. Add encryption
        1. Server side
        2. Client side 






