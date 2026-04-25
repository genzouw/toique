import { test, expect } from 'vitest';
import { escapeCsv } from './submissions.js';

test('escapeCsv prevents formula injection', () => {
  expect(escapeCsv('=1+1')).toBe("'=" + "1+1");
  expect(escapeCsv('-1+1')).toBe("'-" + "1+1");
  expect(escapeCsv('+1+1')).toBe("'+1+1");
  expect(escapeCsv('@SUM(1,1)')).toBe("\"'@" + "SUM(1,1)\"");
  expect(escapeCsv('\t=1+1')).toBe("'\t=" + "1+1");
  expect(escapeCsv('\r=1+1')).toBe('"\'' + '\r=' + '1+1"');
});
