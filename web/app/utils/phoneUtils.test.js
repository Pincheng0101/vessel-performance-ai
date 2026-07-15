import { describe, expect, test } from 'vitest';
import phoneUtils from './phoneUtils';

describe('phoneUtils.findPhoneNumbers', () => {
  test.each([null, undefined, ''])('returns an empty array for falsy input %j', (input) => {
    expect(phoneUtils.findPhoneNumbers(input)).toEqual([]);
  });

  test('detects a TW mobile number written in local format', () => {
    const text = '聯絡電話 0912-345-678 謝謝';
    const [match] = phoneUtils.findPhoneNumbers(text);
    expect(match.e164).toBe('+886912345678');
    expect(text.slice(match.start, match.end)).toBe(match.original);
  });

  test('detects an international format number regardless of default country', () => {
    const [match] = phoneUtils.findPhoneNumbers('Call +1 213 373 4253 now');
    expect(match.e164).toBe('+12133734253');
  });

  test('honours the overridden defaultCountry option', () => {
    const text = '(213) 373-4253';
    expect(phoneUtils.findPhoneNumbers(text, { defaultCountry: 'TW' })).toEqual([]);
    expect(phoneUtils.findPhoneNumbers(text, { defaultCountry: 'US' })[0].e164).toBe('+12133734253');
  });

  test.each([
    '2024-01-01',
    '2025.09.23',
    '(2025.09.23,第B1版)',
    '[2025-09-23]',
    '【2025.09.23】',
    '2025.09.23.',
    '日期 2025.09.23 發布',
    '成長期 2023/03–06 之間',
    '2023/03-06 區間',
    '高峰落在 2026/02',
    '2023 – 2026 年間',
    '2023-2026 全期間',
    '2023 ~ 2026',
  ])('filters out ISO-date-like substrings that libphonenumber misclassifies as TW landlines: %j', (text) => {
    expect(phoneUtils.findPhoneNumbers(text)).toEqual([]);
  });

  test('still detects a TW landline whose digits contain a year-like run', () => {
    const [match] = phoneUtils.findPhoneNumbers('公司電話 02-2023-4567');
    expect(match.e164).toBe('+886220234567');
  });

  test('ignores arbitrary numeric strings that are not phone numbers', () => {
    expect(phoneUtils.findPhoneNumbers('order #12345')).toEqual([]);
  });
});

describe('phoneUtils.toTelHref', () => {
  test('prefixes the E.164 number with tel:', () => {
    expect(phoneUtils.toTelHref('+886912345678')).toBe('tel:+886912345678');
  });
});
