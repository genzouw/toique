import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { api } from '../api';

describe('API client library', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(global, 'fetch');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('error handling', () => {
    it('should throw an error with status and text when !res.ok', async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 400,
        text: () => Promise.resolve('Bad Request'),
      } as Response);

      await expect(api.listForms()).rejects.toThrow(
        'API error: 400 Bad Request',
      );
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/forms'),
        expect.objectContaining({
          credentials: 'include',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        }),
      );
    });
  });

  describe('successful responses', () => {
    it('should return undefined when status is 204', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        status: 204,
      } as Response);

      const result = await api.listForms();
      expect(result).toBeUndefined();
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('should return parsed JSON when status is 200', async () => {
      const mockData = [{ id: '1', name: 'Form 1' }];
      fetchSpy.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockData),
      } as Response);

      const result = await api.listForms();
      expect(result).toEqual(mockData);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('downloadSubmissionsCsv', () => {
    let mockAnchor: {
      href: string;
      download: string;
      click: ReturnType<typeof vi.fn>;
      remove: ReturnType<typeof vi.fn>;
    };
    let createObjectURLSpy: ReturnType<typeof vi.fn>;
    let revokeObjectURLSpy: ReturnType<typeof vi.fn>;
    let appendChildSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      mockAnchor = {
        href: '',
        download: '',
        click: vi.fn(),
        remove: vi.fn(),
      };
      vi.spyOn(document, 'createElement').mockReturnValue(
        mockAnchor as unknown as HTMLElement,
      );
      appendChildSpy = vi
        .spyOn(document.body, 'appendChild')
        .mockReturnValue(mockAnchor as unknown as HTMLElement);
      createObjectURLSpy = vi
        .fn()
        .mockReturnValue('blob:http://localhost/fake-blob-url');
      revokeObjectURLSpy = vi.fn();
      global.URL.createObjectURL = createObjectURLSpy;
      global.URL.revokeObjectURL = revokeObjectURLSpy;
    });

    it('should throw an error when fetch response is not ok', async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 403,
      } as Response);

      await expect(
        api.downloadSubmissionsCsv('form-1', 'submissions'),
      ).rejects.toThrow('CSV ダウンロードに失敗しました: 403');
    });

    it('should download CSV via blob and anchor element', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-04-22T12:00:00Z'));

      const mockBlob = new Blob(['col1,col2\na,b'], { type: 'text/csv' });
      fetchSpy.mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
      } as Response);

      await api.downloadSubmissionsCsv('form-123', 'my_form');

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/submissions/export?formId=form-123'),
        expect.objectContaining({ credentials: 'include' }),
      );
      expect(createObjectURLSpy).toHaveBeenCalledWith(mockBlob);
      expect(document.createElement).toHaveBeenCalledWith('a');
      expect(mockAnchor.href).toBe('blob:http://localhost/fake-blob-url');
      expect(mockAnchor.download).toBe('my_form_20260422.csv');
      expect(appendChildSpy).toHaveBeenCalledWith(mockAnchor);
      expect(mockAnchor.click).toHaveBeenCalled();
      expect(mockAnchor.remove).toHaveBeenCalled();
      expect(revokeObjectURLSpy).toHaveBeenCalledWith(
        'blob:http://localhost/fake-blob-url',
      );

      vi.useRealTimers();
    });

    it('should encode formId in the export URL', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));

      const mockBlob = new Blob(['data'], { type: 'text/csv' });
      fetchSpy.mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
      } as Response);

      await api.downloadSubmissionsCsv('id with spaces', 'report');

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          '/api/v1/submissions/export?formId=id%20with%20spaces',
        ),
        expect.anything(),
      );
      expect(mockAnchor.download).toBe('report_20260101.csv');

      vi.useRealTimers();
    });
  });
});
