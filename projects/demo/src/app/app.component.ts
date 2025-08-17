import { Component, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { JsonPipe } from '@angular/common';
import { NgxsmkTelInputComponent, IntlTelI18n, CountryMap } from 'ngxsmk-tel-input';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [ReactiveFormsModule, NgxsmkTelInputComponent, JsonPipe],
  template: `
    <form [formGroup]="fg" style="max-width:420px;display:grid;gap:12px">
      <ngxsmk-tel-input
        formControlName="phone"
        label="Phone"
        hint="Include area code"
        dir="ltr"
        [initialCountry]="'US'"
        [preferredCountries]="['US','GB','AU']"
        [i18n]="enLabels"
        [localizedCountries]="enCountries"
        [autoPlaceholder]="'off'"
        [clearAriaLabel]="'Clear phone number'">
      </ngxsmk-tel-input>

      <pre>Value: {{ fg.value | json }}</pre>
    </form>
  `
})
export class AppComponent {
  private readonly fb = inject(FormBuilder);
  fg = this.fb.group({ phone: ['', Validators.required] });

  // English UI labels (dropdown/search/ARIA)
  enLabels: IntlTelI18n = {
    selectedCountryAriaLabel: 'Selected country',
    countryListAriaLabel: 'Country list',
    searchPlaceholder: 'Search country',
    zeroSearchResults: 'No results',
    noCountrySelected: 'No country selected'
  };

  // Optional: only override the names you care about
  enCountries: CountryMap = {
    US: 'United States',
    GB: 'United Kingdom',
    AU: 'Australia',
    CA: 'Canada'
  };
}
