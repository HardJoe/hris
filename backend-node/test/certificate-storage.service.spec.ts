import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import { mkdtemp, readFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { CertificateStorageService } from '../src/employees/certificate-storage.service';

describe('CertificateStorageService', () => {
  let directory: string;
  let service: CertificateStorageService;

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'hris-certificate-test-'));
    const config = { getOrThrow: () => directory } as unknown as ConfigService;
    service = new CertificateStorageService(config);
  });

  afterEach(async () => {
    await rm(directory, { recursive: true, force: true });
  });

  it('stores a PDF under a random server-side name', async () => {
    const contents = Buffer.from('%PDF-1.7\nexample');
    const result = await service.store(
      file('../../unsafe.pdf', 'application/octet-stream', contents),
    );

    expect(result.storedName).toMatch(/^[0-9a-f-]{36}\.pdf$/);
    expect(result.originalName).toBe('unsafe.pdf');
    expect(result.mimeType).toBe('application/pdf');
    await expect(readFile(join(directory, result.storedName))).resolves.toEqual(contents);
  });

  it('rejects a file whose content is not on the allowlist', async () => {
    await expect(
      service.store(file('fake.pdf', 'application/pdf', Buffer.from('not really a pdf'))),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

function file(name: string, mimeType: string, buffer: Buffer): Express.Multer.File {
  return {
    fieldname: 'certificate',
    originalname: name,
    encoding: '7bit',
    mimetype: mimeType,
    size: buffer.length,
    buffer,
    destination: '',
    filename: '',
    path: '',
    stream: undefined as never,
  };
}
