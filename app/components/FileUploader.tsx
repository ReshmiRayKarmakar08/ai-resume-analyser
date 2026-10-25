import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { formatSize } from "../lib/utils";

interface FileUploaderProps {
  onFileSelect?: (file: File | null) => void;
}

const FileUploader = ({ onFileSelect }: FileUploaderProps) => {
  const [file, setFile] = useState<File | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const selectedFile = acceptedFiles[0] || null;

      setFile(selectedFile);
      onFileSelect?.(selectedFile);
    },
    [onFileSelect]
  );

  const { getRootProps, getInputProps, acceptedFiles } = useDropzone({
    onDrop,
    multiple: false,
    accept: { "application/pdf": [".pdf"] },
    maxSize: 20 * 1024 * 1024,
  });

  const uploadedFile = acceptedFiles[0] || file;

  return (
    <div className="w-full gradient-border">
      <div {...getRootProps()}>
        <input {...getInputProps()} />

        <div className="p-4 sm:p-6 text-center cursor-pointer">
          {uploadedFile ? (
            <div
              className="uploader-selected-file"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center space-x-3 min-w-0 flex-1">
                <img
                  src="/images/pdf.png"
                  alt="pdf"
                  className="size-8 sm:size-10 shrink-0"
                />

                <div className="min-w-0 flex-1 text-left">
                  <p className="text-xs sm:text-sm font-medium text-gray-700 truncate">
                    {uploadedFile.name}
                  </p>

                  <p className="text-xs text-gray-500">
                    {formatSize(uploadedFile.size)}
                  </p>
                </div>
              </div>

              <button
                className="p-1.5 sm:p-2 cursor-pointer hover:bg-gray-200 rounded-full transition shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                  onFileSelect?.(null);
                }}
                type="button"
                aria-label="Remove uploaded file"
              >
                <img
                  src="/icons/cross.svg"
                  alt="remove"
                  className="w-3.5 h-3.5 sm:w-4 sm:h-4"
                />
              </button>
            </div>
          ) : (
            <div className="py-2 sm:py-4">
              <div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center mb-2">
                <img
                  src="/icons/info.svg"
                  alt="upload"
                  className="size-12 sm:size-16"
                />
              </div>

              <p className="text-sm sm:text-base md:text-lg text-gray-600">
                <span className="font-semibold text-gray-800">
                  Click to upload
                </span>{" "}
                or drag and drop
              </p>

              <p className="text-xs sm:text-sm text-gray-400 mt-1">
                PDF format (max {formatSize(20 * 1024 * 1024)})
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FileUploader;