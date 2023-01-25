const CLIENT_ID = "207646673902501888";
function log(value) {
    let textarea = document.getElementById("log");
    textarea.value += value + "\n";
}
function uuid() {
    var S4 = function () {
        return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
    }
    return (S4() + S4() + "-" + S4() + "-" + S4() + "-" + S4() + "-" + S4() + S4() + S4());
}
log("Discordに接続中...");
const ws = new WebSocket("ws://127.0.0.1:6463/?v=1&client_id=" + CLIENT_ID);
let dispatchs = [];
let requests = {};
const waitDispatch = () => new Promise((resolve) => {
    dispatchs.push(resolve);
});
const request = (cmd, args) => new Promise((resolve) => {
    let nonce = uuid();
    requests[nonce] = resolve;
    ws.send(JSON.stringify({
        cmd,
        args,
        nonce
    }))
});
ws.onopen = async () => {
    await waitDispatch();
    log("接続完了");
    log("認証コードを取得中...");
    let code = (await request("AUTHORIZE", {
        "client_id": CLIENT_ID,
        "scopes": [
            "rpc",
            "messages.read"
        ],
        "prompt": "none"
    }));
    log("取得完了");
    log("アクセストークンを取得中...");
    let token = await (await fetch("https://streamkit.discord.com/overlay/token", {
        method: "POST",
        body: JSON.stringify({
            code: code.code
        })
    })).json();
    log("取得完了");
    log("認証中...");
    await request("AUTHENTICATE", {
        "access_token": token.access_token
    });
    log("認証完了");
    log("VCに参加中...");
    let res = await request("SELECT_VOICE_CHANNEL", {
        channel_id: "1049240840830210068"
    });
    log(`==参加ユーザー==
${res.voice_states.map(x => x.nick).join("\n")}
===============`)
}
ws.onmessage = (ev) => {
    let data = JSON.parse(ev.data);
    if (data.nonce && data.nonce in requests) {
        requests[data.nonce](data.data);
        delete requests[data.nonce];
    }
    if (data.cmd === "DISPATCH") {
        dispatchs.forEach(x => x(data.data))
        dispatchs = [];
    }
}