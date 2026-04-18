# Implementation Plan: Amharic Registration Fields

## Overview

Add bilingual (English/Amharic) support to the Hitsanat KFL registration forms by following the existing ThemeContext pattern. The implementation creates a centralized LanguageContext, a static translation service, a LanguageToggle UI component, and updates the two registration forms and StepWizard to consume translations via the `t()` hook.

## Tasks

- [x] 1. Create the translation data service
  - Create `src/app/lib/translations.ts` with a `Translations` TypeScript interface covering all keys: `common`, `memberRegistration`, `childrenRegistration`, and `photoUpload`
  - Populate the `en` locale with all current English strings from `MemberRegistrationForm.tsx`, `ChildrenRegistrationForm.tsx`, and `StepWizard.tsx` (step labels, section titles, field labels, placeholders, dropdown options, button text, validation messages, success messages, photo upload instructions)
  - Populate the `am` locale with the complete Amharic translations specified in the design document's "Complete Translation Mapping" section
  - Export a `translations` constant typed as `Record<Language, Translations>` and export the `Language` type (`'en' | 'am'`)
  - _Requirements: 2.1–2.9, 3.1–3.6, 4.1–4.5, 5.1–5.4, 6.1–6.5, 8.1–8.5, 11.1–11.5, 12.1–12.3_

- [x] 2. Create LanguageContext and provider
  - Create `src/app/context/LanguageContext.tsx` mirroring the structure of `ThemeContext.tsx`
  - Implement `getInitialLanguage()` that reads `'language'` from localStorage with a try/catch fallback to `'en'`
  - Implement `applyLanguage(language)` that writes to localStorage with a try/catch guard
  - Implement `toggleLanguage()` that switches between `'en'` and `'am'` and calls `applyLanguage`
  - Implement `t(key: string): string` using dot-notation traversal of the translations object; log a warning and return the key itself when a key is not found
  - Wrap `t` in `useCallback` with `[language]` dependency so the reference is stable
  - Implement `toggleLanguage` with a live-region DOM announcement for screen readers (as specified in the design's Accessibility Compliance section)
  - Export `LanguageProvider`, `useLanguage` hook, and `Language` type
  - _Requirements: 1.2–1.6, 7.1–7.6, 9.3_

- [x] 3. Wrap the app with LanguageProvider
  - Modify `src/main.tsx` to import `LanguageProvider` from `src/app/context/LanguageContext`
  - Wrap the `<App />` render with `<LanguageProvider>` (nest inside or alongside the existing providers in `App.tsx` if ThemeProvider lives there — check `App.tsx` first)
  - _Requirements: 7.1, 7.6_

- [x] 4. Create the LanguageToggle component
  - Create `src/app/components/LanguageToggle.tsx`
  - Use `useLanguage()` to read `language` and `toggleLanguage`
  - Render a `<Button variant="ghost" size="icon">` (matching `ThemeToggle` style) that displays `"EN"` when current language is English and `"አማ"` when Amharic
  - Add `aria-label` that reads `"Toggle language"` in English and `"ቋንቋ ቀይር"` in Amharic
  - Export as a named export `LanguageToggle`
  - _Requirements: 1.1, 1.3, 9.1, 9.2_

- [x] 5. Add LanguageToggle to the Layout header
  - Modify `src/app/components/Layout.tsx` to import `LanguageToggle`
  - Insert `<LanguageToggle />` in the header's right-side icon row, positioned between the notifications `<DropdownMenu>` and `<ThemeToggle />`
  - _Requirements: 1.1_

- [x] 6. Checkpoint — verify core infrastructure
  - Ensure the app compiles without TypeScript errors
  - Confirm the LanguageToggle appears in the header and clicking it switches the displayed label between "EN" and "አማ"
  - Confirm the language preference survives a page refresh (check localStorage key `'language'`)
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Update StepWizard to accept translated button text
  - Modify `src/app/components/StepWizard.tsx` to import `useLanguage` and call `t()` for the navigation button labels
  - Replace the hardcoded `"← Back"` string with `t('common.back')`
  - Replace `"Next →"` with `t('common.next')`
  - Replace `"✓ Submit Registration"` with `t('common.submit')`
  - Replace `"Submitting…"` with a translated submitting string (add `common.submitting` key to translations)
  - _Requirements: 4.4, 4.5_

- [x] 8. Update MemberRegistrationForm to use translations
  - [x] 8.1 Replace hardcoded STEPS array and form title
    - Import `useLanguage` and call `const { t } = useLanguage()` inside the component
    - Move `STEPS` definition inside the component body so it re-evaluates on language change, using `t('memberRegistration.steps.*')` for each label
    - Pass `t('memberRegistration.title')` as the `title` prop to `<StepWizard>`
    - _Requirements: 4.1, 4.2, 12.1_

  - [x] 8.2 Translate Step 0 — Personal Information
    - Replace `"Personal Information"` section title with `t('memberRegistration.sections.personalInfo')`
    - Replace the name fields array literals (`'Given Name'`, `"Father's Name"`, etc.) with `t()` calls for both label and placeholder
    - Replace `'Male'` / `'Female'` radio labels with `t('common.male')` / `t('common.female')`
    - Replace `"Date of Birth"` label with `t('memberRegistration.fields.dob.label')`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 5.1, 5.2_

  - [x] 8.3 Translate Step 1 — Campus & Education
    - Replace `"Campus & Education"` section title with `t('memberRegistration.sections.campusEducation')`
    - Replace `CAMPUSES` array with translated values using `t()` for display labels (keep English values for data)
    - Replace `YEARS` array display labels with `t()` calls
    - Replace `"Campus"`, `"Year of Study"`, `"Department"` field labels with `t()` calls
    - Replace `"Select campus"` / `"Select year"` placeholder options with `t()` calls
    - _Requirements: 2.1, 2.2, 2.5, 2.6, 5.1, 5.2_

  - [x] 8.4 Translate Step 2 — Contact Information
    - Replace `"Contact Information"` section title with `t('memberRegistration.sections.contactInfo')`
    - Replace `'Phone Number'`, `'Email Address'`, `'Telegram Username'` labels and placeholders with `t()` calls
    - _Requirements: 2.1, 2.2, 2.3, 5.1, 5.2_

  - [x] 8.5 Translate Step 3 — Kehnet Role & Sub-Department
    - Replace `"Kehnet Role & Sub-Department"` section title with `t('memberRegistration.sections.kehnetRole')`
    - Replace `"Sub-Departments"` label and helper text with `t()` calls
    - Replace `KEHNET_ROLES` display labels with `t()` calls for Deacon, Kes, Mergeta
    - Replace `"Kehnet Role"` label and helper text with `t()` calls
    - Translate sub-department display names using the sub-department translations from the design
    - _Requirements: 2.1, 2.7, 2.8, 5.1, 5.2_

  - [x] 8.6 Translate Step 4 — Photo Upload and validation/success messages
    - Replace `"Photo Upload"` section title with `t('memberRegistration.sections.photoUpload')`
    - Replace photo upload UI strings (`"Drag & drop your photo here"`, `"or click to browse…"`, `"Click to change"`) with `t()` calls
    - Replace `toast.error` validation message strings with `t()` calls for all three validation errors
    - Replace `toast.success('Member registered successfully!')` with `t('memberRegistration.messages.success')`
    - _Requirements: 2.1, 2.2, 5.2, 6.1, 6.2, 6.3, 6.4, 6.5, 11.1–11.5_

- [x] 9. Update ChildrenRegistrationForm to use translations
  - [x] 9.1 Replace hardcoded STEPS array and form title
    - Import `useLanguage` and call `const { t } = useLanguage()` inside the component
    - Move `STEPS` definition inside the component body, using `t('childrenRegistration.steps.*')` for each label
    - Pass `t('childrenRegistration.title')` as the `title` prop to `<StepWizard>`
    - _Requirements: 4.1, 4.3, 12.2_

  - [x] 9.2 Translate Step 0 — Child Information
    - Replace `"Child Information"` section title with `t('childrenRegistration.sections.childInfo')`
    - Replace name field labels and placeholders with `t()` calls
    - Replace `'Male'` / `'Female'` radio labels with `t('common.male')` / `t('common.female')`
    - Replace `"Date of Birth"` label with `t()` call
    - Replace `"Kutr Level *"` label with `t()` call
    - Replace Kutr option display strings (`"Kutr 1 (Younger)"`, etc.) with `t()` calls
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 5.1, 5.3_

  - [x] 9.3 Translate Steps 1–4 — Address, Family, Contact, Photo
    - Replace `"Address"` section title with `t('childrenRegistration.sections.address')`
    - Replace `"Home Address"` label and textarea placeholder with `t()` calls
    - Replace `"Family Information"` section title with `t('childrenRegistration.sections.familyInfo')`
    - Replace `"Father's Full Name"` / `"Mother's Full Name"` labels and placeholders with `t()` calls
    - Replace `"Contact Information"` section title with `t('childrenRegistration.sections.contactInfo')`
    - Replace `"Father's Phone"` / `"Mother's Phone"` labels with `t()` calls
    - Replace `"Photo Upload"` section title with `t('childrenRegistration.sections.photoUpload')`
    - Replace photo upload UI strings with `t()` calls (use `photoUpload.*` keys, child-specific drag-drop text)
    - Replace `toast.success('Child registered successfully!')` with `t('childrenRegistration.messages.success')`
    - _Requirements: 3.1, 3.2, 3.3, 5.1, 5.3, 6.3, 11.1–11.5_

- [x] 10. Checkpoint — verify full translation coverage
  - Ensure the app compiles without TypeScript errors after all form changes
  - Manually verify that switching to Amharic updates all visible text in both forms immediately without a page reload
  - Verify that switching back to English restores all English strings
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Write unit tests for LanguageContext
  - Set up test file `src/app/context/LanguageContext.test.tsx` using the project's existing test framework
  - [x] 11.1 Test initial language defaults to 'en' when localStorage is empty
    - _Requirements: 1.6_
  - [x] 11.2 Test language restores from localStorage on mount
    - _Requirements: 1.5_
  - [x] 11.3 Test toggleLanguage switches between 'en' and 'am' and persists to localStorage
    - _Requirements: 1.2, 1.4_
  - [x] 11.4 Test t() returns correct translation for a known key in both languages
    - _Requirements: 7.2_
  - [x] 11.5 Test t() returns the key itself as fallback when key is not found
    - _Requirements: 7.5_
  - [x] 11.6 Test graceful degradation when localStorage throws (simulate with jest.spyOn)
    - _Requirements: 1.5, 1.6_

- [x] 12. Write unit tests for LanguageToggle component
  - Set up test file `src/app/components/LanguageToggle.test.tsx`
  - [x] 12.1 Test renders "EN" when language is 'en'
    - _Requirements: 1.3_
  - [x] 12.2 Test renders "አማ" when language is 'am'
    - _Requirements: 1.3_
  - [x] 12.3 Test calls toggleLanguage when clicked
    - _Requirements: 1.2_
  - [x] 12.4 Test aria-label is present and correct for each language
    - _Requirements: 9.1_

- [x] 13. Write integration tests for form translation
  - [x] 13.1 Test MemberRegistrationForm displays English text by default
    - _Requirements: 2.1, 2.2_
  - [x] 13.2 Test MemberRegistrationForm updates to Amharic when language is switched
    - _Requirements: 2.1, 2.9_
  - [x] 13.3 Test ChildrenRegistrationForm updates to Amharic when language is switched
    - _Requirements: 3.1, 3.6_
  - [x] 13.4 Test step labels translate in both forms
    - _Requirements: 4.1, 4.2, 4.3_
  - [x] 13.5 Test validation messages appear in the active language
    - _Requirements: 6.1, 6.5_

- [x] 14. Final checkpoint — full verification
  - Ensure all non-optional tests pass
  - Verify no TypeScript errors across all modified files
  - Confirm layout is visually consistent in both languages (no text overflow or broken layouts)
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- The `t()` function uses dot-notation key traversal and falls back to the key string — no runtime crashes on missing keys
- Keep English values (e.g. `'Main'`, `'Gendeje'`) as the stored data values in form state; only the display labels are translated
- Amharic uses left-to-right script — no RTL CSS changes are needed
- All translation data is statically bundled (~15KB uncompressed); no lazy loading required
- The `STEPS` array and any arrays derived from translation keys must be defined inside the component body (not at module scope) so they re-evaluate when language changes
