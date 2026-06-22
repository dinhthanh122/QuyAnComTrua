async function fetchLocalhost() {
  try {
    const res = await fetch('http://localhost:3000/admin/history', {
      headers: {
        // Need to bypass admin check? The admin check uses cookies!
        // We can't easily fetch it without the cookie.
      }
    });
    const text = await res.text();
    const match = text.match(/id="debug-history-length">(\d+)</);
    if (match) {
      console.log("HISTORY LENGTH IN HTML:", match[1]);
    } else {
      console.log("Could not find debug div in HTML");
    }
  } catch (e) {
    console.error("Fetch error:", e);
  }
}

fetchLocalhost();
