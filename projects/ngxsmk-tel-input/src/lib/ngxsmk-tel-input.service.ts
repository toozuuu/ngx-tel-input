import { Injectable } from '@angular/core';
import { parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js';

@Injectable({ providedIn: 'root' })
export class NgxsmkTelInputService {
  parse(input: string, iso2: CountryCode): { e164: string | null; national: string | null; isValid: boolean } {
    const phone = parsePhoneNumberFromString(input || '', iso2);
    if (!phone) return { e164: null, national: null, isValid: false };
    const isValid = phone.isValid();
    return { e164: isValid ? phone.number : null, national: phone.formatNational(), isValid };
  }

  isValid(input: string, iso2: CountryCode): boolean {
    const phone = parsePhoneNumberFromString(input || '', iso2);
    return !!phone && phone.isValid();
  }
}
