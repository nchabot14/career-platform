export type UploadedFile = {
  name: string;
  type: string;
  size: number;
  bytes: Uint8Array;
};

export async function toUploadedFile(file: File): Promise<UploadedFile> {
  return {
    name: file.name,
    type: file.type,
    size: file.size,
    bytes: new Uint8Array(await file.arrayBuffer()),
  };
}

export function sanitizeFilename(name: string, fallbackExtension: string) {
  const dot = name.lastIndexOf(".");
  const base = dot > 0 ? name.slice(0, dot) : name;
  const extension = dot > 0 ? name.slice(dot + 1) : fallbackExtension;
  const clean = (value: string) =>
    value
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  return `${clean(base) || "file"}.${clean(extension) || fallbackExtension}`;
}
