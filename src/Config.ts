export default {
    channel: "IPCMessenger",
    console: getConsole(),
    debug: false,
    timeout: 10000,
};

function getConsole() {
    try {
        return require( "electron-log" );
    } catch(e) {
        return console;
    }
}