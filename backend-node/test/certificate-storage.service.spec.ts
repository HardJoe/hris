import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import { mkdtemp, readFile, rm, writeFile } from 'fs/promises';
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

  it.each([
    ['JPEG', Buffer.from([0xff, 0xd8, 0xff, 0x00]), 'jpg', 'image/jpeg'],
    ['PNG', Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), 'png', 'image/png'],
  ])('stores a valid %s file based on its signature', async (_type, contents, extension, mimeType) => {
    const result = await service.store(file('certificate.bin', 'application/octet-stream', contents));

    expect(result).toMatchObject({ mimeType, originalName: 'certificate.bin' });
    expect(result.storedName).toMatch(new RegExp(`^[0-9a-f-]{36}\\.${extension}$`));
  });

  it('sanitizes original names and requires an uploaded file', async () => {
    const result = await service.store(file('\0', 'application/pdf', Buffer.from('%PDF-1.7')));

    expect(result.originalName).toBe('certificate');
    expect(() => service.ensurePresent(undefined)).toThrow(BadRequestException);
  });

  it('removes stored files, ignores missing files, and rejects traversal paths', async () => {
    await writeFile(join(directory, 'certificate.pdf'), 'content');

    await service.remove('certificate.pdf');
    await expect(readFile(join(directory, 'certificate.pdf'))).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(service.remove('missing.pdf')).resolves.toBeUndefined();
    await expect(service.remove(null)).resolves.toBeUndefined();
    expect(() => service.open('../outside.pdf')).toThrow('Certificate not found');
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
