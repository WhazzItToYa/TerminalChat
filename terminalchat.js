const urlParams = new URLSearchParams(window.location.search);
const KEEP_MESSAGES = urlParams.get('maxMessages') || 5;
const IGNORE_USERS = urlParams.get('ignoreUsers') || "";
const IGNORED_USERS = {};

for (const u of IGNORE_USERS.split(/,/)) {
    let user = u.trim();
    console.log(`Ignoring user ${user}`);
    IGNORED_USERS[user] = true;
}

const client = new StreamerbotClient();

client.on('Twitch.ChatMessage', ({data}) => {
    try {
        displayChatMessage(data);
    } catch (e) {
        console.log(e);
    }
});

var previousMessage = null;

function displayChatMessage(data) {
    console.dir(data);

    // Ignore certain users
    if (IGNORED_USERS[data.message.username]) return;
    // Ignore commands
    if (data.message.message.startsWith("!")) return;
    
    // Clone the template element for each new message.
    let templateElement = document.getElementById("chatMessageTemplate");
    let newElement = templateElement.cloneNode(true);

    // Put the message into the cloned element
    newElement.removeAttribute("id");
    var username = newElement.querySelector("#user");
    username.textContent = data.message.displayName;
    username.style.color = data.message.color;
    
    newElement.querySelector("#message").innerHTML = insertEmotes(data);
    templateElement.parentElement.appendChild(newElement);

    // Remove messages older than the last N messages.
    let messages = document.querySelectorAll(".chatMessage:not(#chatMessageTemplate)");
    messages.forEach(
        function(elt, idx) {
            if (messages.length - idx > KEEP_MESSAGES) {
                elt.remove();
            }
        });

    // Remember the current message as the previous one.
    previousMessage = newElement;
}

function insertEmotes(messageData) {
    let textMessage = messageData.message.message;
    let emotes = messageData.emotes;

    // Make sure the emotes are sorted left to right
    emotes.sort((e1, e2) => e1.startIndex - e2.startIndex);

    // We'll go through, span by span (span=substrings on emote
    // boundaries) extracting the span from the source message, and
    // appending or discarding&substituting the emote code.  The thing
    // that makes it tricky is that the emote boundary indexes count
    // UTF-32 characters (encoded as 2 javascript characters) as a
    // single char, so substrings & indexes need to count those chars
    // correctly.

    let outputMessage = "";
    let inputPos = 0;
    let prevIndex = 0;
    for (const emote of emotes)
    {
        // Get the portion of the message before the emote.
        let span = substring(textMessage, inputPos, emote.startIndex-prevIndex);
        outputMessage += span;
        inputPos += span.length;
        prevIndex = emote.startIndex;
        
        console.log(`emote ${emote.name} : ${emote.startIndex}-${emote.endIndex}`);
        console.log(`text is ${span}`);

        // Now get the portion of the message corresponding to the emote.
        let emoteSpan = substring(textMessage, inputPos, emote.endIndex+1-prevIndex);
        outputMessage += `<img src="${encodeURI(emote.imageUrl)}">`;
        inputPos += emoteSpan.length;
        prevIndex = emote.endIndex+1;
    }
    // And then the remaining portion of the message.
    outputMessage += textMessage.substring(inputPos);
    return outputMessage;
}

// extracts the portion of UTf-16 sourceString starting at startIndex,
// containing substringLength unicode characters (including chars > 0xffff)

function substring(sourceString, startIndex, substringLength)
{
    let endIndex = startIndex;
    for (var i = 0; i < substringLength; i++)
    {
        let codeUnit = sourceString.charCodeAt(endIndex);
        if (codeUnit >= 0xD800 && codeUnit <= 0xDBFF)
        {
            endIndex += 2;
        } else
        {
            endIndex += 1;
        }
    }
    return sourceString.substring(startIndex, endIndex);
}
