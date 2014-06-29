// -------------------------------------------------
// -------------------- Master ---------------------
// -------------------------------------------------

function DebugMessage(message) {
    console.log(message);
}

// small uart device
function UARTDev(worker) {
    this.ReceiveChar = function(c) {
        if (!worker.fbfocus) { // check if framebuffer has focus
            worker.SendToWorker("tty", c);
        }
    };
}

function jor1kGUI(termid, fbid, statsid, imageurls, relayURL)
{
    this.urls = imageurls;
    this.worker = new Worker('js/worker/worker.js');
    this.fbfocus = false; // true: keyboard command are not send to tty
    this.SendToWorker = function(command, data) {
        this.worker.postMessage(
        {
            "command": command,
            "data": data
        });
    }
    this.ChangeCore = function(core) {
        this.SendToWorker("ChangeCore", core);
    };

    this.ChangeImage = function(newurl) {
        this.urls[1] = newurl;
        this.SendToWorker("Reset");
        this.socket = io('http://localhost:8800');

        this.socket.on("openfile", function(data) {
            this.SendToWorker("LoadAndStart", { 'urls' : [this.urls[0]], 'imageData' : data});
        }.bind(this));

        this.socket.on("read", function(data) {
            this.SendToWorker("ATARead", data);
        }.bind(this));

        this.socket.on("connect", function() {
            this.socket.emit("openfile", { "filename" : newurl });
        }.bind(this));
    };

    this.term = new Terminal(24, 80, termid);
    this.terminput = new TerminalInput(new UARTDev(this));
    this.worker.onmessage = this.OnMessage.bind(this);   
    this.worker.onerror = function(e) {
        console.log("Error at " + e.filename + ":" + e.lineno + ": " + e.message);
    }
    this.terminalcanvas = document.getElementById(termid);

    // Init Framebuffer
    this.fbcanvas = document.getElementById(fbid);
    this.fbctx = this.fbcanvas.getContext("2d");
    this.fbimageData = this.fbctx.createImageData(this.fbcanvas.width, this.fbcanvas.height);

    document.onkeypress = function(event) {
        this.SendToWorker("keypress", {keyCode:event.keyCode, charCode:event.charCode});
        return this.terminput.OnKeyPress(event);      
    }.bind(this);

    document.onkeydown = function(event) {
        //DebugMessage("" + event.keyCode);
        this.SendToWorker("keydown", {keyCode:event.keyCode, charCode:event.charCode});
        return this.terminput.OnKeyDown(event);
    }.bind(this);

    document.onkeyup = function(event) {
        this.SendToWorker("keyup", {keyCode:event.keyCode, charCode:event.charCode});
        return this.terminput.OnKeyUp(event);
    }.bind(this);

    this.terminalcanvas.onmousedown = function(event) {
        this.fbfocus = false;
        this.fbcanvas.style.border = "2px solid #000000";
    }.bind(this);

    this.fbcanvas.onmousedown = function(event) {
        this.fbcanvas.style.border = "2px solid #FF0000";
        this.fbfocus = true;
        var rect = this.fbcanvas.getBoundingClientRect();
        var x = event.clientX - rect.left;
        var y = event.clientY - rect.top;
        this.SendToWorker("tsmousedown", {x:x, y:y});
    }.bind(this);
    this.fbcanvas.onmouseup = function(event) {
        var rect = this.fbcanvas.getBoundingClientRect();
        var x = event.clientX - rect.left;
        var y = event.clientY - rect.top;
        this.SendToWorker("tsmouseup", {x:x, y:y});
    }.bind(this);
    this.fbcanvas.onmousemove = function(event) {
        var rect = this.fbcanvas.getBoundingClientRect();
        var x = event.clientX - rect.left;
        var y = event.clientY - rect.top;
        this.SendToWorker("tsmousemove", {x:x, y:y});
    }.bind(this);

    this.ethernet = new Ethernet(relayURL);
    this.ethernet.onmessage = function(e) {
        this.SendToWorker("ethmac", e.data);
    }.bind(this);

    // Init Statsline 
    this.stats = document.getElementById(statsid);

    this.stop = false;
    this.ChangeImage(this.urls[1]);
    window.setInterval(function(){this.SendToWorker("GetIPS", 0)}.bind(this), 1000);
    window.setInterval(function(){this.SendToWorker("GetFB", 0)}.bind(this), 100);
}

jor1kGUI.prototype.OnMessage = function(e) {
    if (this.stop) return;
    if (e.data.command == "execute") this.SendToWorker("execute", 0); else
    if (e.data.command == "ethmac") this.ethernet.SendFrame(e.data.data); else
    if (e.data.command == "tty") this.term.PutChar(e.data.data); else
    if (e.data.command == "GetFB") this.UpdateFramebuffer(e.data.data); else
    if (e.data.command == "ATARead") {
        this.socket.emit('read', e.data.data);
    } else
    if (e.data.command == "ATAWrite") this.socket.emit('write', e.data.data); else
    if (e.data.command == "Stop") {console.log("Received stop signal"); this.stop = true;} else
    if (e.data.command == "GetIPS") {        
        this.stats.innerHTML = (Math.floor(e.data.data/100000)/10.) + " MIPS";
    } else
    if (e.data.command == "Debug") console.log(e.data.data);
}

jor1kGUI.prototype.UpdateFramebuffer = function(buffer) {
    var i=0, n = buffer.length;
    var data = this.fbimageData.data;
    
    for (i = 0; i < n; ++i) {
        var x = buffer[i];
        data[(i<<2)+0] = (x>>16)&0xFF;
        data[(i<<2)+1] = (x>>8)&0xFF;
        data[(i<<2)+2] = (x)&0xFF;
        data[(i<<2)+3] = 0xFF;
    }

    //data.set(buffer);
    this.fbctx.putImageData(this.fbimageData, 0, 0); // at coords 0,0
}

