import { findPhoneNumbersInText } from 'libphonenumber-js';

// ISO-like date strings (e.g. `2024-01-01`, `2025.09.23`) parse as valid TW landlines under
// libphonenumber's VALID leniency, so they need to be filtered out explicitly. Matched as a
// substring (not anchored) because libphonenumber sometimes pulls leading punctuation like
// `(` or `[` into the match — e.g. `(2025.09.23,` yields the slice `(2025.09.23`.
const ISO_DATE_LIKE = /\d{4}[-/.]\d{1,2}[-/.]\d{1,2}/;

class phoneUtils {
  static DEFAULT_COUNTRY = 'TW';

  /**
   * Finds phone numbers in the given text.
   *
   * @param {string} text - The text to search.
   * @param {Object} [options] - Optional settings.
   * @param {string} [options.defaultCountry] - ISO-3166-1 alpha-2 region used to parse numbers without a country code. Defaults to 'TW'.
   * @returns {Array<{ start: number, end: number, original: string, e164: string }>} Matches in source order; `original` preserves the substring as written, `e164` is the canonical `+...` form for use in tel:/facetime: URIs.
   */
  static findPhoneNumbers(text, { defaultCountry = phoneUtils.DEFAULT_COUNTRY } = {}) {
    if (!text) return [];
    const matches = findPhoneNumbersInText(text, { defaultCountry });
    return matches
      .map(({ number, startsAt, endsAt }) => ({
        start: startsAt,
        end: endsAt,
        original: text.slice(startsAt, endsAt),
        e164: number.number,
      }))
      .filter(({ original }) => !ISO_DATE_LIKE.test(original));
  }

  /**
   * Builds a `tel:` href from an E.164 number.
   *
   * @param {string} e164 - The E.164 number (e.g. '+886912345678').
   * @returns {string} The `tel:` href.
   */
  static toTelHref(e164) {
    return `tel:${e164}`;
  }
}

export default phoneUtils;
