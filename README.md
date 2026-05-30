# Cockroach Call  
  
In _fire and forget_ style, this entire folder can be uploaded to <a target="_blank" href="https://www.netlify.com/">netlify</a> for free.  



## Extra steps for Apple devices  
It may happen that direct peer 2 peer connection is not established because of device IP being masked (thanks Tim) which makes it unreachable directly. Use a "turn" server to relay information. Free tier of 500mb/month (as of May 2026) is available at <a target="_blank" href="https://www.metered.ca/">Metered</a>. Set up an account and goto TURN servers. Click on "Show ICE Servers Array" and copy-paste the ones with username+credentials.  
```js
src/app.js [line 5]: const RTC_CONFIG = { iceServers:     
{   
    urls: [//DON'T EDIT STUN SERVERS     
            'stun:stun.l.google.com:19302',  
            'stun:stun.apple.com:3478',  
            'stun:stun.services.apple.com:3478'  
    ]  
    }, //Add turn servers below     
    // {    
    //   urls: "turn:global.relay.metered.ca:80",    
    //   username: "as-given",    
```  
## Usual (lazy) steps   
Just upload the unzipped directory in entirety on netlify. Or just public/ directory if you're feeling too lazy to even create an account.     
  
## Why am I streaming audio for FREE?!   
Because you're essentially sending it directly to your peer.   
<a target="_blank" href="https://trystero.dev/">Trystero</a> has public servers to do the dirty work of connecting for you even when all you did was upload static files.  
  
## Can you spy on my conversation?    
No I have better things to do in life. Also impossible since the data packets are interchanged (if webrtc worked) or relayed (turn server magic) between two individuals. Sniffing is neither implemented nor ever will be.   
    