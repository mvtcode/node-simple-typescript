import { Request, Response, NextFunction } from 'express';
import busboy from 'busboy';
import fs from 'fs';
import path from 'path';
import { config } from '../config';
import { generateFilename } from '../utils/filename';

export interface UploadedFileData {
  fieldName: string;
  originalName: string;
  encoding: string;
  mimeType: string;
  destination: string;
  filename: string;
  path: string;
  size: number;
  publishUrl: string;
}

export function uploadMiddleware(req: Request, res: Response, _next: NextFunction): void {
  const contentType = req.headers['content-type'];
  if (!contentType || !contentType.includes('multipart/form-data')) {
    res.status(400).json({
      status: 'error',
      message: 'Content-Type must be multipart/form-data',
    });
    return;
  }

  // Ensure public upload directory exists synchronously or beforehand
  if (!fs.existsSync(config.publicPath)) {
    fs.mkdirSync(config.publicPath, { recursive: true });
  }

  let bb: ReturnType<typeof busboy>;
  try {
    bb = busboy({ headers: req.headers });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Invalid multipart headers';
    res.status(400).json({
      status: 'error',
      message,
    });
    return;
  }

  let isAborted = false;
  let isFinished = false;
  let fileHandled = false;

  let originalName = '';
  let fieldName = '';
  let encoding = '';
  let mimeType = '';
  let finalFileName = '';
  let tmpFilePath = '';
  let finalFilePath = '';
  let fileSize = 0;
  let writeStream: fs.WriteStream | null = null;
  let writeStreamFinished = false;

  const cleanupTmpFile = async (): Promise<void> => {
    if (tmpFilePath) {
      try {
        await fs.promises.unlink(tmpFilePath);
      } catch {
        // Ignore if already deleted or doesn't exist
      }
    }
  };

  // Handle client abort / disconnect
  req.on('close', () => {
    if (!isFinished && !req.complete) {
      isAborted = true;
      if (writeStream && !writeStream.destroyed) {
        writeStream.destroy();
      }
      void cleanupTmpFile();
    }
  });

  bb.on('file', (field, fileStream, info) => {
    // Only accept the first file
    if (fileHandled) {
      fileStream.resume(); // Discard additional files
      return;
    }

    fileHandled = true;
    fieldName = field;
    originalName = info.filename;
    encoding = info.encoding;
    mimeType = info.mimeType;

    if (!originalName) {
      fileStream.resume();
      return;
    }

    finalFileName = generateFilename(originalName);
    const tmpFileName = `${finalFileName}.tmp`;
    tmpFilePath = path.join(config.publicPath, tmpFileName);
    finalFilePath = path.join(config.publicPath, finalFileName);

    writeStream = fs.createWriteStream(tmpFilePath);

    fileStream.on('data', (chunk: Buffer) => {
      if (isAborted) return;
      fileSize += chunk.length;
    });

    fileStream.on('error', (err: Error) => {
      if (writeStream && !writeStream.destroyed) {
        writeStream.destroy();
      }
      void cleanupTmpFile().then(() => {
        if (!res.headersSent && !isAborted) {
          res.status(500).json({
            status: 'error',
            message: `File stream error: ${err.message}`,
          });
        }
      });
    });

    writeStream.on('error', (err: Error) => {
      void cleanupTmpFile().then(() => {
        if (!res.headersSent && !isAborted) {
          res.status(500).json({
            status: 'error',
            message: `File write error: ${err.message}`,
          });
        }
      });
    });

    writeStream.on('finish', () => {
      writeStreamFinished = true;
    });

    fileStream.pipe(writeStream);
  });

  bb.on('error', (err: unknown) => {
    if (writeStream && !writeStream.destroyed) {
      writeStream.destroy();
    }
    void cleanupTmpFile().then(() => {
      if (!res.headersSent && !isAborted) {
        const message = err instanceof Error ? err.message : 'Multipart parsing error';
        res.status(400).json({
          status: 'error',
          message,
        });
      }
    });
  });

  bb.on('close', () => {
    void (async () => {
      if (isAborted) {
        await cleanupTmpFile();
        return;
      }

      if (!fileHandled || !originalName || !tmpFilePath) {
        if (!res.headersSent) {
          res.status(400).json({
            status: 'error',
            message: 'No file uploaded or invalid field name',
          });
        }
        return;
      }

      // Wait for writeStream to finish writing to disk if it hasn't yet
      if (writeStream && !writeStreamFinished) {
        await new Promise<void>((resolve) => {
          if (writeStream) {
            writeStream.on('finish', () => resolve());
            writeStream.on('error', () => resolve());
          } else {
            resolve();
          }
        });
      }

      if (isAborted) {
        await cleanupTmpFile();
        return;
      }

      try {
        // Rename tmp file to final destination filename
        await fs.promises.rename(tmpFilePath, finalFilePath);
        isFinished = true;

        const publishUrl = `${config.basePath}/${finalFileName}`;
        const responseData: UploadedFileData = {
          fieldName,
          originalName,
          encoding,
          mimeType,
          destination: config.rawPublicPath,
          filename: finalFileName,
          path: finalFilePath,
          size: fileSize,
          publishUrl,
        };

        if (!res.headersSent) {
          res.status(200).json({
            status: 'success',
            message: 'File uploaded successfully',
            data: responseData,
          });
        }
      } catch (err: unknown) {
        await cleanupTmpFile();
        if (!res.headersSent) {
          const message = err instanceof Error ? err.message : 'Failed to save uploaded file';
          res.status(500).json({
            status: 'error',
            message,
          });
        }
      }
    })();
  });

  req.pipe(bb);
}
