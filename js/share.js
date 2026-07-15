export function filenameFor(prefix, ext = "json") {
  const stamp = new Date().toISOString().slice(0, 10);
  return `${prefix}-${stamp}.${ext}`;
}

function downloadFile(filename, content) {
  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Tries the native share sheet first (best for "send this to yourself" on a
// phone); falls back to a plain file download anywhere that isn't supported.
export async function shareOrDownload(filename, content) {
  const file = new File([content], filename, { type: "application/json" });

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return "shared";
    } catch (err) {
      if (err && err.name === "AbortError") return "cancelled";
    }
  }

  downloadFile(filename, content);
  return "downloaded";
}
