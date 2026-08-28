exports.handler = async (event) => {
  const key = process.env.ANTHROPIC_API_KEY;
  const connected = !!key;
  const wantTest =
    event.queryStringParameters && event.queryStringParameters.test === "1";

  const out = {
    connected: connected,
    defaultModel: "claude-sonnet-4-6",
    availableModels: [
      "claude-sonnet-4-6",
      "claude-haiku-4-5",
      "claude-opus-4-8",
    ],
    tested: false,
    testOk: false,
    testMessage: "",
  };

  if (!connected) {
    out.testMessage =
      "No API key found. Set ANTHROPIC_API_KEY in Netlify environment variables.";
    return { statusCode: 200, body: JSON.stringify(out) };
  }

  if (!wantTest) {
    return { statusCode: 200, body: JSON.stringify(out) };
  }

  try {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 8,
        messages: [{ role: "user", content: "Reply with the single word ok" }],
      }),
    });
    const data = await resp.json();
    out.tested = true;
    if (resp.ok) {
      out.testOk = true;
      out.testMessage = "Live connection to Claude confirmed.";
    } else {
      out.testMessage =
        (data && data.error && data.error.message) || "Test call failed.";
    }
  } catch (err) {
    out.tested = true;
    out.testMessage = String((err && err.message) || err);
  }

  return {
    statusCode: 200,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(out),
  };
};
