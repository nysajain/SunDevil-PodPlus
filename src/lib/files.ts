export interface FilePreview {
  url: string;
  revoke: () => void;
}

export const objectUrlForFile = (file: File): FilePreview => {
  const url = URL.createObjectURL(file);
  return {
    url,
    revoke: () => URL.revokeObjectURL(url),
  };
};

export const isPdfFile = (file: File): boolean => {
  const mime = file.type?.toLowerCase();
  if (mime === 'application/pdf') return true;
  return file.name?.toLowerCase().endsWith('.pdf');
};
