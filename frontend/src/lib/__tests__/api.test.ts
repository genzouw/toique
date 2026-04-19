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
});
