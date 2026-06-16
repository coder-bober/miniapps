const supportedImageSignatures = [
  {
    mimeType: "image/jpeg",
    kind: "image",
    matches(buffer) {
      return (
        buffer.length >= 3 &&
        buffer[0] === 0xff &&
        buffer[1] === 0xd8 &&
        buffer[2] === 0xff
      );
    },
  },
  {
    mimeType: "image/png",
    kind: "image",
    matches(buffer) {
      return (
        buffer.length >= 8 &&
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47 &&
        buffer[4] === 0x0d &&
        buffer[5] === 0x0a &&
        buffer[6] === 0x1a &&
        buffer[7] === 0x0a
      );
    },
  },
  {
    mimeType: "image/webp",
    kind: "image",
    matches(buffer) {
      return (
        buffer.length >= 12 &&
        buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
        buffer.subarray(8, 12).toString("ascii") === "WEBP"
      );
    },
  },
];

const supportedDocumentSignatures = [
  {
    mimeType: "application/pdf",
    kind: "document",
    matches(buffer) {
      return buffer.length >= 5 && buffer.subarray(0, 5).toString("ascii") === "%PDF-";
    },
  },
  {
    mimeType: "text/plain",
    kind: "document",
    matches(buffer) {
      if (buffer.length === 0) {
        return true;
      }

      let printableBytes = 0;

      for (const byte of buffer) {
        const isAsciiPrintable = byte >= 0x20 && byte <= 0x7e;
        const isWhitespace = byte === 0x09 || byte === 0x0a || byte === 0x0d;

        if (isAsciiPrintable || isWhitespace) {
          printableBytes += 1;
          continue;
        }

        return false;
      }

      return printableBytes === buffer.length;
    },
  },
];

const supportedFileSignatures = [
  ...supportedImageSignatures,
  ...supportedDocumentSignatures,
];

export function detectWorkspaceFileType(buffer) {
  for (const signature of supportedFileSignatures) {
    if (signature.matches(buffer)) {
      return {
        mimeType: signature.mimeType,
        kind: signature.kind,
      };
    }
  }

  return null;
}

export function validateWorkspaceFile({ declaredMimeType, buffer }) {
  const detectedType = detectWorkspaceFileType(buffer);

  if (!detectedType) {
    return {
      ok: false,
      reason: "unsupported_file_type",
    };
  }

  if (declaredMimeType !== detectedType.mimeType) {
    return {
      ok: false,
      reason: "unsupported_file_type",
    };
  }

  return {
    ok: true,
    mimeType: detectedType.mimeType,
    kind: detectedType.kind,
  };
}
