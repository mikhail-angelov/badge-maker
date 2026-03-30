const parseJsonLine = (line) => {
  if (!line.trim()) {
    return null;
  }

  return JSON.parse(line);
};

export const readGenerateStream = async (response, { onStatus = () => {} } = {}) => {
  if (!response.body) {
    throw new Error("Streaming response body is not available");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finalResult = null;

  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const event = parseJsonLine(line);
      if (!event) {
        continue;
      }

      if (event.type === "status") {
        onStatus(event);
        continue;
      }

      if (event.type === "result") {
        finalResult = {
          scenario: event.scenario,
          warnings: Array.isArray(event.warnings) ? event.warnings : [],
        };
        continue;
      }

      if (event.type === "error") {
        throw new Error(event.error || "Failed to generate scenario");
      }
    }
  }

  const trailingEvent = parseJsonLine(buffer);
  if (trailingEvent) {
    if (trailingEvent.type === "status") {
      onStatus(trailingEvent);
    } else if (trailingEvent.type === "result") {
      finalResult = {
        scenario: trailingEvent.scenario,
        warnings: Array.isArray(trailingEvent.warnings) ? trailingEvent.warnings : [],
      };
    } else if (trailingEvent.type === "error") {
      throw new Error(trailingEvent.error || "Failed to generate scenario");
    }
  }

  if (!finalResult) {
    throw new Error("Streaming response ended without a final scenario");
  }

  return finalResult;
};

export default readGenerateStream;
