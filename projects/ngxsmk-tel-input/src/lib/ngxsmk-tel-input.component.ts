import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  forwardRef,
  Inject,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  Output,
  PLATFORM_ID,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
  AbstractControl,
  ControlValueAccessor,
  NG_VALIDATORS,
  NG_VALUE_ACCESSOR,
  ValidationErrors,
  Validator
} from '@angular/forms';
import type { CountryCode } from 'libphonenumber-js';
import { NgxsmkTelInputService } from './ngxsmk-tel-input.service';

type IntlTelInstance = any;
export type CountryMap = Partial<Record<CountryCode, string>>;

export interface IntlTelI18n {
  selectedCountryAriaLabel?: string;
  countryListAriaLabel?: string;
  searchPlaceholder?: string;
  zeroSearchResults?: string;
  noCountrySelected?: string;
}

@Component({
  selector: 'ngxsmk-tel-input',
  standalone: true,
  imports: [],
  template: `
    <div class="ngxsmk-tel"
         [class.disabled]="disabled"
         [attr.data-size]="size"
         [attr.data-variant]="variant"
         [attr.dir]="dir">
      @if (label) {
        <label class="ngxsmk-tel__label" [for]="resolvedId">{{ label }}</label>
      }

      <div class="ngxsmk-tel__wrap" [class.has-error]="showError">
        <div class="ngxsmk-tel-input__wrapper">
          <input
            #telInput
            type="tel"
            class="ngxsmk-tel-input__control"
            [id]="resolvedId"
            [attr.name]="name || null"
            [attr.placeholder]="placeholder || null"
            [attr.autocomplete]="autocomplete"
            [attr.inputmode]="digitsOnly ? 'numeric' : 'tel'"
            [attr.pattern]="digitsOnly ? (allowLeadingPlus ? '\\\\+?[0-9]*' : '[0-9]*') : null"
            [disabled]="disabled"
            [attr.aria-invalid]="showError ? 'true' : 'false'"
            (blur)="onBlur()"
            (focus)="onFocus()"
          />
        </div>

        @if (showClear && currentRaw()) {
          <button type="button"
                  class="ngxsmk-tel__clear"
                  (click)="clearInput()"
                  [attr.aria-label]="clearAriaLabel">
            ×
          </button>
        }
      </div>

      @if (hint && !showError) {
        <div class="ngxsmk-tel__hint">{{ hint }}</div>
      }

      @if (showError) {
        <div class="ngxsmk-tel__error">{{ errorText || 'Please enter a valid phone number.' }}</div>
      }
    </div>
  `,
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => NgxsmkTelInputComponent), multi: true },
    { provide: NG_VALIDATORS, useExisting: forwardRef(() => NgxsmkTelInputComponent), multi: true }
  ],
  styles: [`
    /* ---------- Theme tokens ---------- */
    :host {
      --tel-bg: #fff;
      --tel-fg: #0f172a;
      --tel-border: #c0c0c0;
      --tel-border-hover: #9aa0a6;
      --tel-ring: #2563eb;
      --tel-placeholder: #9ca3af;
      --tel-error: #ef4444;
      --tel-radius: 12px;
      --tel-focus-shadow: 0 0 0 3px rgba(37, 99, 235, .25);

      --tel-dd-bg: var(--tel-bg);
      --tel-dd-border: var(--tel-border);
      --tel-dd-shadow: 0 24px 60px rgba(0, 0, 0, .18);
      --tel-dd-radius: 12px;
      --tel-dd-item-hover: rgba(37, 99, 235, .08);
      --tel-dd-z: 2000;
      --tel-dd-search-bg: rgba(148, 163, 184, .08);

      display: block;
    }

    :host-context(.dark) {
      --tel-bg: #0b0f17;
      --tel-fg: #e5e7eb;
      --tel-border: #334155;
      --tel-border-hover: #475569;
      --tel-ring: #60a5fa;
      --tel-placeholder: #94a3b8;

      --tel-dd-bg: #0f1521;
      --tel-dd-border: #324056;
      --tel-dd-search-bg: rgba(148, 163, 184, .12);
    }

    /* ---------- Structure ---------- */
    .ngxsmk-tel { width: 100%; color: var(--tel-fg); }
    .ngxsmk-tel.disabled { opacity: .7; cursor: not-allowed; }

    .ngxsmk-tel__label { display: inline-block; margin-bottom: 6px; font-size: .875rem; font-weight: 500; }
    .ngxsmk-tel__wrap { position: relative; }
    .ngxsmk-tel-input__wrapper, :host ::ng-deep .iti { width: 100%; }

    .ngxsmk-tel-input__control {
      width: 100%; height: 40px; font: inherit; color: var(--tel-fg);
      background: var(--tel-bg); border: 1px solid var(--tel-border);
      border-radius: var(--tel-radius);
      padding: 10px 40px 10px 12px;
      outline: none;
      transition: border-color .15s, box-shadow .15s, background .15s;
    }
    .ngxsmk-tel-input__control::placeholder { color: var(--tel-placeholder); }
    .ngxsmk-tel-input__control:hover { border-color: var(--tel-border-hover); }
    .ngxsmk-tel-input__control:focus { border-color: var(--tel-ring); box-shadow: var(--tel-focus-shadow); }

    [data-size="sm"] .ngxsmk-tel-input__control {
      height: 34px; font-size: 13px; padding: 6px 36px 6px 10px; border-radius: 10px;
    }
    [data-size="lg"] .ngxsmk-tel-input__control {
      height: 46px; font-size: 16px; padding: 12px 44px 12px 14px; border-radius: 14px;
    }

    [data-variant="filled"] .ngxsmk-tel-input__control { background: rgba(148, 163, 184, .08); }
    [data-variant="underline"] .ngxsmk-tel-input__control {
      border: 0; border-bottom: 2px solid var(--tel-border); border-radius: 0; padding-left: 0; padding-right: 34px;
    }
    [data-variant="underline"] .ngxsmk-tel-input__control:focus { border-bottom-color: var(--tel-ring); box-shadow: none; }

    /* ---------- intl-tel-input dropdown (deep selectors) ---------- */
    :host ::ng-deep .iti__flag-container {
      border-top-left-radius: var(--tel-radius);
      border-bottom-left-radius: var(--tel-radius);
      border: 1px solid var(--tel-border);
      border-right: none;
      background: var(--tel-bg);
    }
    :host ::ng-deep .iti__selected-flag { height: 100%; padding: 0 10px; display: inline-flex; align-items: center; }

    :host ::ng-deep .iti__country-list {
      background: var(--tel-dd-bg); border: 1px solid var(--tel-dd-border);
      border-radius: var(--tel-dd-radius); box-shadow: var(--tel-dd-shadow);
      max-height: min(50vh, 360px); overflow: auto; padding: 6px 0;
      width: max(280px, 100%); z-index: var(--tel-dd-z);
    }
    :host ::ng-deep .iti--container .iti__country-list { z-index: var(--tel-dd-z); }

    :host ::ng-deep .iti__search-input {
      position: sticky; top: 0; margin: 0; padding: 10px 12px; width: 100%;
      border: 0; border-bottom: 1px solid var(--tel-dd-border); outline: none;
      background: var(--tel-dd-search-bg); color: var(--tel-fg);
    }

    :host ::ng-deep .iti__country {
      display: grid; grid-template-columns: 28px 1fr auto; align-items: center;
      column-gap: .5rem; padding: 10px 12px; cursor: pointer;
    }
    :host ::ng-deep .iti__dial-code { color: var(--tel-placeholder); font-weight: 600; margin-left: 10px; }

    .ngxsmk-tel__clear {
      position: absolute; right: 8px; top: 50%; transform: translateY(-50%);
      border: 0; background: transparent; font-size: 18px; line-height: 1;
      width: 28px; height: 28px; border-radius: 50%; cursor: pointer; color: var(--tel-placeholder);
    }
    .ngxsmk-tel__clear:hover { background: rgba(148, 163, 184, .15); }

    .ngxsmk-tel__hint { margin-top: 6px; font-size: 12px; color: var(--tel-placeholder); }
    .ngxsmk-tel__error { margin-top: 6px; font-size: 12px; color: var(--tel-error); }

    .ngxsmk-tel__wrap.has-error .ngxsmk-tel-input__control {
      border-color: var(--tel-error);
      box-shadow: 0 0 0 3px rgba(239, 68, 68, .15);
    }
  `]
})
export class NgxsmkTelInputComponent implements AfterViewInit, OnChanges, OnDestroy, ControlValueAccessor, Validator {
  @ViewChild('telInput', { static: true }) inputRef!: ElementRef<HTMLInputElement>;

  /* Core config */
  @Input() initialCountry: CountryCode | 'auto' = 'US';
  @Input() preferredCountries: CountryCode[] = ['US', 'GB'];
  @Input() onlyCountries?: CountryCode[];
  @Input() nationalMode = false;
  @Input() separateDialCode = false;
  @Input() allowDropdown = true;

  /* UX */
  @Input() placeholder?: string;     // keep undefined to let plugin set example placeholders (requires utilsScript)
  @Input() autocomplete = 'tel';
  @Input() name?: string;
  @Input() inputId?: string;
  @Input() disabled = false;

  @Input() label?: string;
  @Input() hint?: string;
  @Input() errorText?: string;
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() variant: 'outline' | 'filled' | 'underline' = 'outline';
  @Input() showClear = true;
  @Input() autoFocus = false;
  @Input() selectOnFocus = false;
  @Input() formatOnBlur = true;
  @Input() showErrorWhenTouched = true;

  /* Dropdown plumbing */
  @Input() dropdownAttachToBody = true;
  @Input() dropdownZIndex = 2000;

  /* Localization + RTL */
  @Input('i18n') i18n?: IntlTelI18n;
  @Input('telI18n') set telI18n(v: IntlTelI18n | undefined) { this.i18n = v; }
  @Input('localizedCountries') localizedCountries?: CountryMap;
  @Input('telLocalizedCountries') set telLocalizedCountries(v: CountryMap | undefined) { this.localizedCountries = v; }
  @Input() clearAriaLabel = 'Clear phone number';
  @Input() dir: 'ltr' | 'rtl' = 'ltr';

  /* Placeholders (intl-tel-input) */
  @Input() autoPlaceholder: 'off' | 'polite' | 'aggressive' = 'off'; // default OFF since no utils fallback
  @Input() utilsScript?: string;
  @Input() customPlaceholder?: (example: string, country: any) => string;

  /* Digits-only controls */
  @Input() digitsOnly = true;
  @Input() allowLeadingPlus = true;

  /* Outputs */
  @Output() countryChange = new EventEmitter<{ iso2: CountryCode }>();
  @Output() validityChange = new EventEmitter<boolean>();
  @Output() inputChange = new EventEmitter<{ raw: string; e164: string | null; iso2: CountryCode }>();

  /* Internal */
  private iti: IntlTelInstance | null = null;
  private onChange: (val: string | null) => void = () => {};
  private onTouchedCb: () => void = () => {};
  private validatorChange?: () => void;
  private lastEmittedValid = false;
  private pendingWrite: string | null = null;
  private touched = false;

  readonly resolvedId = this.inputId || ('tel-' + Math.random().toString(36).slice(2));

  constructor(
    private readonly zone: NgZone,
    private readonly tel: NgxsmkTelInputService,
    @Inject(PLATFORM_ID) private readonly platformId: Object
  ) {}

  async ngAfterViewInit() {
    if (!isPlatformBrowser(this.platformId)) return;
    await this.initIntlTelInput();
    this.bindDomListeners();

    if (this.pendingWrite !== null) {
      this.setInputValue(this.pendingWrite);
      this.handleInput();
      this.pendingWrite = null;
    }
    if (this.autoFocus) setTimeout(() => this.focus(), 0);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const configChanged = [
      'initialCountry','preferredCountries','onlyCountries',
      'separateDialCode','allowDropdown','nationalMode',
      'i18n','localizedCountries','dir',
      'autoPlaceholder','utilsScript','customPlaceholder',
      'digitsOnly','allowLeadingPlus'
    ].some(k => k in changes && !changes[k]?.firstChange);
    if (configChanged && this.iti) {
      this.reinitPlugin();
      this.validatorChange?.();
    }
  }

  ngOnDestroy(): void {
    this.destroyPlugin();
  }

  // ----- CVA -----
  writeValue(val: string | null): void {
    if (!this.inputRef) return;
    if (!this.iti) {
      this.pendingWrite = val ?? '';
      return;
    }
    this.setInputValue(val ?? '');
  }
  registerOnChange(fn: any): void { this.onChange = fn; }
  registerOnTouched(fn: any): void { this.onTouchedCb = fn; }
  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
    if (this.inputRef) this.inputRef.nativeElement.disabled = isDisabled;
  }

  // ----- Validator -----
  validate(_: AbstractControl): ValidationErrors | null {
    const raw = this.currentRaw();
    if (!raw) return null;
    const valid = this.tel.isValid(raw, this.currentIso2());
    if (valid !== this.lastEmittedValid) {
      this.lastEmittedValid = valid;
      this.validityChange.emit(valid);
    }
    return valid ? null : { phoneInvalid: true };
  }
  registerOnValidatorChange(fn: () => void): void { this.validatorChange = fn; }

  // ----- Public helpers -----
  focus(): void {
    this.inputRef?.nativeElement.focus();
    if (this.selectOnFocus) {
      const el = this.inputRef.nativeElement;
      queueMicrotask(() => el.setSelectionRange(0, el.value.length));
    }
  }
  selectCountry(iso2: CountryCode): void {
    if (this.iti) {
      this.iti.setCountry(iso2.toLowerCase());
      this.handleInput();
    }
  }
  clearInput() {
    this.setInputValue('');
    this.handleInput();
    this.inputRef.nativeElement.focus();
  }

  // ----- Plugin wiring -----
  private async initIntlTelInput() {
    const [{ default: intlTelInput }] = await Promise.all([import('intl-tel-input')]);

    const toLowerKeys = (m?: CountryMap) =>
      m ? Object.fromEntries(Object.entries(m).map(([k, v]) => [k.toLowerCase(), v])) : undefined;

    const config: any = {
      initialCountry: this.initialCountry === 'auto' ? 'auto' : (this.initialCountry?.toLowerCase() || 'us'),
      preferredCountries: (this.preferredCountries ?? []).map(c => c.toLowerCase()),
      onlyCountries: (this.onlyCountries ?? []).map(c => c.toLowerCase()),
      nationalMode: this.nationalMode,
      allowDropdown: this.allowDropdown,
      separateDialCode: this.separateDialCode,
      geoIpLookup: (cb: (iso2: string) => void) => cb('us'),

      // placeholders — NOTE: no CDN fallback anymore
      autoPlaceholder: this.autoPlaceholder,  // 'off' | 'polite' | 'aggressive'
      utilsScript: this.utilsScript,
      customPlaceholder: this.customPlaceholder,

      // localization
      i18n: this.i18n,
      localizedCountries: toLowerKeys(this.localizedCountries),

      // dropdown container
      dropdownContainer: this.dropdownAttachToBody && typeof document !== 'undefined' ? document.body : undefined
    };

    this.zone.runOutsideAngular(() => {
      this.iti = intlTelInput(this.inputRef.nativeElement, config);
    });

    // z-index for dropdown
    (this.inputRef.nativeElement as HTMLElement).style.setProperty('--tel-dd-z', String(this.dropdownZIndex));
  }

  private reinitPlugin() {
    const current = this.currentRaw();
    this.destroyPlugin();
    this.initIntlTelInput().then(() => {
      if (current) {
        this.setInputValue(current);
        this.handleInput();
      }
    });
  }

  private destroyPlugin() {
    if (this.iti) {
      this.iti.destroy();
      this.iti = null;
    }
    if (this.inputRef?.nativeElement) {
      const el = this.inputRef.nativeElement;
      const clone = el.cloneNode(true) as HTMLInputElement;
      el.parentNode?.replaceChild(clone, el);
      (this.inputRef as any).nativeElement = clone;
    }
  }

  // ----- Input filtering (digits-only) -----
  private sanitizeDigits(value: string): string {
    if (!this.digitsOnly) return value;
    let v = value.replace(/[^\d+]/g, '');     // keep digits and pluses
    // allow only ONE leading + (if enabled)
    if (this.allowLeadingPlus) {
      const hasLeadingPlus = v.startsWith('+');
      v = (hasLeadingPlus ? '+' : '') + v.replace(/\+/g, '');
    } else {
      v = v.replace(/\+/g, '');
    }
    return v;
  }

  private bindDomListeners() {
    const el = this.inputRef.nativeElement;

    this.zone.runOutsideAngular(() => {
      // prevent invalid chars while typing
      el.addEventListener('beforeinput', (ev: InputEvent) => {
        if (!this.digitsOnly) return;
        const data = (ev as any).data as string | null;

        // allow deletions, cuts, etc.
        if (!data || ev.inputType !== 'insertText') return;

        const pos = el.selectionStart ?? 0;
        const isDigit = data >= '0' && data <= '9';
        const isPlusAtStart = this.allowLeadingPlus && data === '+' && pos === 0 && !el.value.includes('+');

        if (!isDigit && !isPlusAtStart) ev.preventDefault();
      });

      // sanitize pastes
      el.addEventListener('paste', (e: ClipboardEvent) => {
        if (!this.digitsOnly) return;
        e.preventDefault();
        const text = (e.clipboardData || (window as any).clipboardData).getData('text');
        const sanitized = this.sanitizeDigits(text);
        const start = el.selectionStart ?? el.value.length;
        const end = el.selectionEnd ?? el.value.length;
        el.setRangeText(sanitized, start, end, 'end');
        queueMicrotask(() => this.handleInput());
      });

      // catch any remaining non-digit changes (e.g., programmatic)
      el.addEventListener('input', () => {
        if (this.digitsOnly) {
          const val = el.value;
          const sanitized = this.sanitizeDigits(val);
          if (val !== sanitized) {
            const caret = el.selectionStart ?? sanitized.length;
            el.value = sanitized;
            el.setSelectionRange(caret, caret);
          }
        }
        this.handleInput();
      });

      el.addEventListener('countrychange', () => {
        const iso2 = this.currentIso2();
        this.zone.run(() => {
          this.countryChange.emit({ iso2 });
          this.validatorChange?.();
        });
        this.handleInput();
      });

      el.addEventListener('blur', () => this.onBlur());
    });
  }

  onBlur() {
    this.touched = true;
    this.zone.run(() => this.onTouchedCb());
    if (!this.formatOnBlur) return;
    const raw = this.currentRaw();
    if (!raw) return;
    const parsed = this.tel.parse(raw, this.currentIso2());
    if (this.nationalMode && parsed.national) {
      this.setInputValue((parsed.national || '').replace(/\s{2,}/g, ' '));
    }
  }

  onFocus() {
    if (this.selectOnFocus) {
      const el = this.inputRef.nativeElement;
      queueMicrotask(() => el.setSelectionRange(0, el.value.length));
    }
  }

  private handleInput() {
    const raw = this.currentRaw();
    const iso2 = this.currentIso2();
    const parsed = this.tel.parse(raw, iso2);
    this.zone.run(() => this.onChange(parsed.e164)); // E.164 or null
    this.zone.run(() => this.inputChange.emit({ raw, e164: parsed.e164, iso2 }));
    if (raw && this.nationalMode && parsed.national) {
      const normalized = parsed.national.replace(/\s{2,}/g, ' ');
      if (normalized !== raw) this.setInputValue(normalized);
    }
  }

  currentRaw(): string {
    return (this.inputRef?.nativeElement.value ?? '').trim();
  }

  private currentIso2(): CountryCode {
    const iso2 = (this.iti?.getSelectedCountryData?.().iso2 ?? this.initialCountry ?? 'US')
      .toString().toUpperCase();
    return iso2 as CountryCode;
  }

  private setInputValue(v: string) {
    this.inputRef.nativeElement.value = v ?? '';
  }

  get showError(): boolean {
    const invalid = !!this.validate({} as AbstractControl);
    return this.showErrorWhenTouched ? (this.touched && invalid) : invalid;
  }
}
