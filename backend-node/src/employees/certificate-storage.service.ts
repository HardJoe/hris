import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { createReadStream, ReadStream } from 'fs';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { basename, resolve, sep } from 'path';

interface StoredCertificate {
  storedName: string;
  originalName: string;
  mimeType: string;
  size: number;
}

interface DetectedFileType {
  extension: 'pdf' | 'jpg' | 'png';
  mimeType: 'application/pdf' | 'image/jpeg' | 'image/png';
}

@Injectable()
export class CertificateStorageService {
  private readonly uploadDirectory: string;

  constructor(config: ConfigService) {
    this.uploadDirectory = resolve(config.getOrThrow<string>('UPLOAD_DIR'));
  }

  async store(file: Express.Multer.File): Promise<StoredCertificate> {
    const detectedType = this.detectType(file.buffer);
    if (!detectedType) {
      throw new BadRequestException('Certificate must be a valid PDF, JPEG, or PNG file');
    }

    await mkdir(this.uploadDirectory, { recursive: true, mode: 0o750 });
    const storedName = `${randomUUID()}.${detectedType.extension}`;
    await writeFile(this.safePath(storedName), file.buffer, { flag: 'wx', mode: 0o640 });

    return {
      storedName,
      originalName: this.safeOriginalName(file.originalname),
      mimeType: detectedType.mimeType,
      size: file.size,
    };
  }

  open(storedName: string): ReadStream {
    return createReadStream(this.safePath(storedName));
  }

  async remove(storedName: string | null): Promise<void> {
    if (!storedName) return;
    try {
      await unlink(this.safePath(storedName));
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }

  ensurePresent(file: Express.Multer.File | undefined): Express.Multer.File {
    if (!file) throw new BadRequestException('A certificate file is required');
    return file;
  }

  private safePath(storedName: string): string {
    const fullPath = resolve(this.uploadDirectory, storedName);
    if (!fullPath.startsWith(`${this.uploadDirectory}${sep}`)) {
      throw new NotFoundException('Certificate not found');
    }
    return fullPath;
  }

  private safeOriginalName(originalName: string): string {
    return basename(originalName.replaceAll('\0', '')).slice(0, 255) || 'certificate';
  }

  private detectType(buffer: Buffer): DetectedFileType | null {
    if (buffer.length >= 5 && buffer.subarray(0, 5).toString('ascii') === '%PDF-') {
      return { extension: 'pdf', mimeType: 'application/pdf' };
    }
    if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return { extension: 'jpg', mimeType: 'image/jpeg' };
    }
    if (
      buffer.length >= 8 &&
      buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    ) {
      return { extension: 'png', mimeType: 'image/png' };
    }
    return null;
  }
}
