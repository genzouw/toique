import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Submissions from './Submissions';
import { api, type FormListItem } from '../lib/api';

vi.mock('../lib/api', () => ({
  api: {
    listSubmissions: vi.fn(),
    listForms: vi.fn(),
    downloadSubmissionsCsv: vi.fn(),
  },
}));

function makeForm(id: string, name: string): FormListItem {
  return {
    id,
    tenantId: 'tenant-1',
    lineChannelId: 'ch-1',
    name,
    status: 'published',
    triggerKeyword: null,
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

const formA = makeForm('form-a', 'フォームA');
const formB = makeForm('form-b', 'フォームB');

function getFormSelect() {
  return screen.getByLabelText(
    'CSVダウンロード対象のフォーム',
  ) as HTMLSelectElement;
}

function getDownloadButton() {
  return screen.getByRole('button', { name: 'CSVダウンロード' });
}

/**
 * jsdom の `<select>` は value に一致する option が無いと先頭 option へ
 * 自動的にリセットされるため、DOM の value だけでは「選択IDが実際に
 * 何を指しているか」を検証できない。実際に CSV ダウンロードへ渡される
 * フォームIDで検証する。
 */
async function expectDownloadTarget(id: string, name: string) {
  await waitFor(() => expect(getDownloadButton()).toBeEnabled());
  fireEvent.click(getDownloadButton());
  await waitFor(() =>
    expect(api.downloadSubmissionsCsv).toHaveBeenCalledWith(id, name),
  );
}

function clickRefresh() {
  fireEvent.click(screen.getByRole('button', { name: '更新' }));
}

describe('Submissions - 選択フォームIDの再調整', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.listSubmissions).mockResolvedValue([]);
    vi.mocked(api.downloadSubmissionsCsv).mockResolvedValue(undefined);
  });

  it('一覧更新で選択中フォームが消えたら、先頭フォームが選択される', async () => {
    vi.mocked(api.listForms).mockResolvedValueOnce([formA, formB]);

    render(<Submissions />);

    await waitFor(() => expect(getFormSelect()).toBeEnabled());

    // ユーザーが formB を選択
    fireEvent.change(getFormSelect(), { target: { value: 'form-b' } });
    await expectDownloadTarget('form-b', 'フォームB');
    vi.mocked(api.downloadSubmissionsCsv).mockClear();

    // formB が削除された状態で再取得
    vi.mocked(api.listForms).mockResolvedValueOnce([formA]);
    clickRefresh();
    await waitFor(() => expect(api.listForms).toHaveBeenCalledTimes(2));

    // 消えた form-b は捨てられ、先頭の form-a へフォールバックする
    await expectDownloadTarget('form-a', 'フォームA');
  });

  it('一覧が空になったら選択がクリアされ、CSVダウンロードボタンが disabled になる', async () => {
    vi.mocked(api.listForms).mockResolvedValueOnce([formA]);

    render(<Submissions />);

    await waitFor(() => expect(getDownloadButton()).toBeEnabled());

    // フォームが全て消えた状態で再取得
    vi.mocked(api.listForms).mockResolvedValueOnce([]);
    clickRefresh();

    await waitFor(() => expect(getDownloadButton()).toBeDisabled());
    expect(getFormSelect()).toBeDisabled();
    expect(getFormSelect().value).toBe('');

    // 古いIDが残っていないので、次に取得したフォームが正しく選択される
    vi.mocked(api.listForms).mockResolvedValueOnce([formB]);
    clickRefresh();
    await expectDownloadTarget('form-b', 'フォームB');
  });

  it('選択中フォームが一覧に残っていれば選択が維持される（先頭に戻らない）', async () => {
    vi.mocked(api.listForms).mockResolvedValueOnce([formA, formB]);

    render(<Submissions />);

    await waitFor(() => expect(getFormSelect()).toBeEnabled());
    fireEvent.change(getFormSelect(), { target: { value: 'form-b' } });

    // 両方が残っている状態で再取得
    vi.mocked(api.listForms).mockResolvedValueOnce([formA, formB]);
    clickRefresh();
    await waitFor(() => expect(api.listForms).toHaveBeenCalledTimes(2));

    // 生きている選択が先頭で上書きされないこと
    await expectDownloadTarget('form-b', 'フォームB');
  });
});
