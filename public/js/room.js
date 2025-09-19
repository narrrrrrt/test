// 共通: ログ出力用
const output = document.getElementById("output");

function logEvent(name, data) {
  const div = document.createElement("div");
  div.className = "event";
  div.innerHTML = `<span>${name}</span> ${data}`;
  output.appendChild(div);
}

// API呼び出し
async function joinRoom(id, seat) {
  const resp = await fetch(`/${id}/join?seat=${seat}`, { method: "POST" });
  return await resp.json(); // { token: ... }
}

function startSSE(id, token) {
  const es = new EventSource(`/${id}/sse?token=${token}`);

  es.addEventListener("Init", e => logEvent("Init", e.data));
  es.addEventListener("Join", e => logEvent("Join", e.data));
  es.addEventListener("Move", e => logEvent("Move", e.data));
  es.addEventListener("Leave", e => logEvent("Leave", e.data));
  es.addEventListener("Reset", e => logEvent("Reset", e.data));
  es.addEventListener("Pulse", () => logEvent("Pulse", "(no body)"));

  es.onerror = (err) => logEvent("Error", JSON.stringify(err));
}

// --- 実行部分だけ即時関数で括る ---
(async () => {
  const params = new URLSearchParams(location.search);
  const id = params.get("id");
  const seat = params.get("seat");

  document.getElementById("info").textContent =
    `Room ID = ${id}, Seat = ${seat}`;

  try {
    const { token } = await joinRoom(id, seat);
    logEvent("JoinResp", `token=${token}`);
    startSSE(id, token);
  } catch (err) {
    logEvent("Error", "Join failed: " + err);
  }
})();