// @vitest-environment jsdom
import { afterEach, describe, expect, test, vi } from 'vitest';
import scrollUtils from './scrollUtils';

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('scrollUtils.scrollTo', () => {
  test('delegates to window.scrollTo by default with smooth behavior', () => {
    const spy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    scrollUtils.scrollTo({ top: 100 });
    expect(spy).toHaveBeenCalledWith({ top: 100, left: 0, behavior: 'smooth' });
  });

  test('uses the given target when provided', () => {
    const target = { scrollTo: vi.fn() };
    scrollUtils.scrollTo({ top: 50, left: 10, behavior: 'auto', target });
    expect(target.scrollTo).toHaveBeenCalledWith({ top: 50, left: 10, behavior: 'auto' });
  });

  test('defaults top and left to 0 when called with no arguments', () => {
    const spy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    scrollUtils.scrollTo();
    expect(spy).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'smooth' });
  });
});

describe('scrollUtils.scrollToElementById', () => {
  test('scrolls to the element position adjusted by the offset', () => {
    const el = document.createElement('div');
    el.id = 'target';
    document.body.appendChild(el);
    vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({ top: 200 });
    vi.spyOn(window, 'scrollY', 'get').mockReturnValue(50);
    const spy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    scrollUtils.scrollToElementById('#target', 30);
    expect(spy).toHaveBeenCalledWith({ top: 220, left: 0, behavior: 'smooth' });
  });

  test('does nothing when targetId is empty', () => {
    const spy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    scrollUtils.scrollToElementById('');
    expect(spy).not.toHaveBeenCalled();
  });

  test('does nothing when the element is not found', () => {
    const spy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    scrollUtils.scrollToElementById('#nonexistent');
    expect(spy).not.toHaveBeenCalled();
  });
});
