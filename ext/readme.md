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
            1. *Not* persistent
    1. Js
        1.

        

3. Background
    1. **Persistent**
    1. HTML
    1. Useful as a datastore
        1. I.e. Saving profiles as a table in HTML form
    1. JS
        1. Contains extension logic
        2. Performs the majority of messaging, logic, storage
        
        
4. Messaging
    1. How to pass data from content -> background -> popup?
    1. Chrome extension messaging
    1. Introduces complications from asynchronous nature
        
        

### Todo
1. Popup
    1. Start A New Session Button
        2. Requested from server
        3. API Endpoint forthcoming
    2. Responsiveness
        1. After clicking extract, there is a significant to completion
        2. Inform user of progress 
    

2. Background
    1. Responsiveness
        1. Message popup.js about progress

            






