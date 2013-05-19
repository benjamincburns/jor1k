// -------------------------------------------------
// ---------------- Framebuffer --------------------
// -------------------------------------------------

// constructor
function FBDev(ram) {
    this.ram = ram;
    this.width = 320;
    this.height = 240;
    this.addr = 16000000;
    this.n = this.width * this.height * 4;
    this.buffer = new Uint8Array(this.n);
    //this.buffer = new Uint8Array(0);
}

FBDev.prototype.ReadReg32 = function (addr) {
    return 0x0;
};

FBDev.prototype.WriteReg32 = function (addr, value) {

    switch (addr) {
    case 0x14: 
        this.addr = Swap32(value);
        //this.buffer = new Uint8Array(this.ram.mem, this.addr, this.n);
        break;
    default:
        return;
    }
};

FBDev.prototype.GetBuffer = function () {
    //return this.buffer;
    var i=0, n = this.buffer.length;
    var data = this.buffer;
    var mem = this.ram.uint8mem;
    var addr = this.addr;
   	for (i = 0; i < n; ++i) {
        data[i] = mem[addr+i];
    }
    return this.buffer;
}
