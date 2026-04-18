# Requirements Document

## Introduction

This document specifies requirements for adding Amharic language support to the registration form input fields in the Hitsanat KFL church management system. The system currently has two registration forms (Member Registration and Children Registration) with English-only labels and placeholders. This feature will enable bilingual support (English/Amharic) for all form fields, allowing users to view and understand field labels and placeholders in their preferred language.

## Glossary

- **Registration_Form**: The multi-step wizard interface used to register members or children in the system
- **Member_Registration_Form**: The 5-step wizard for registering church members (students)
- **Children_Registration_Form**: The 5-step wizard for registering children
- **Language_Toggle**: A UI control that allows users to switch between English and Amharic languages
- **Field_Label**: The text displayed above an input field that describes what information should be entered
- **Field_Placeholder**: The hint text displayed inside an input field before the user enters data
- **Language_Context**: A React context that manages the current language state across the application
- **Translation_Service**: A service that provides translations for field labels and placeholders
- **Localization_System**: The complete system for managing and displaying content in multiple languages

## Requirements

### Requirement 1: Language Toggle Control

**User Story:** As a church administrator, I want to switch between English and Amharic languages, so that I can view registration forms in my preferred language.

#### Acceptance Criteria

1. THE Language_Toggle SHALL be displayed in the application header alongside the theme toggle
2. WHEN the Language_Toggle is clicked, THE Localization_System SHALL switch between English and Amharic languages
3. THE Language_Toggle SHALL display an appropriate icon or text indicating the current language
4. THE Language_Toggle SHALL persist the selected language in browser local storage
5. WHEN the application loads, THE Localization_System SHALL restore the previously selected language from local storage
6. IF no language preference exists in local storage, THEN THE Localization_System SHALL default to English

### Requirement 2: Member Registration Form Field Translation

**User Story:** As a church administrator, I want all field labels and placeholders in the Member Registration Form to be available in Amharic, so that I can understand and complete the form in my native language.

#### Acceptance Criteria

1. WHEN Amharic language is selected, THE Member_Registration_Form SHALL display all field labels in Amharic
2. WHEN Amharic language is selected, THE Member_Registration_Form SHALL display all field placeholders in Amharic
3. THE Member_Registration_Form SHALL translate the following fields: Given Name, Father's Name, Grandfather's Name, Spiritual Name, Gender, Date of Birth, Campus, Year of Study, Department, Phone Number, Email Address, Telegram Username
4. THE Member_Registration_Form SHALL translate gender options (Male, Female) to Amharic equivalents
5. THE Member_Registration_Form SHALL translate campus options (Main, Gendeje, Station) to Amharic equivalents
6. THE Member_Registration_Form SHALL translate year of study options (1st Year through 6th Year) to Amharic equivalents
7. THE Member_Registration_Form SHALL translate Kehnet role options (Deacon, Kes, Mergeta) to Amharic equivalents
8. THE Member_Registration_Form SHALL translate sub-department names to Amharic equivalents
9. WHEN the language is switched, THE Member_Registration_Form SHALL update all visible text immediately without requiring a page refresh

### Requirement 3: Children Registration Form Field Translation

**User Story:** As a church administrator, I want all field labels and placeholders in the Children Registration Form to be available in Amharic, so that I can understand and complete the form in my native language.

#### Acceptance Criteria

1. WHEN Amharic language is selected, THE Children_Registration_Form SHALL display all field labels in Amharic
2. WHEN Amharic language is selected, THE Children_Registration_Form SHALL display all field placeholders in Amharic
3. THE Children_Registration_Form SHALL translate the following fields: Given Name, Father's Name, Grandfather's Name, Spiritual Name, Gender, Date of Birth, Home Address, Father's Full Name, Mother's Full Name, Father's Phone, Mother's Phone
4. THE Children_Registration_Form SHALL translate gender options (Male, Female) to Amharic equivalents
5. THE Children_Registration_Form SHALL translate Kutr level options (Kutr 1, Kutr 2, Kutr 3) to Amharic equivalents
6. WHEN the language is switched, THE Children_Registration_Form SHALL update all visible text immediately without requiring a page refresh

### Requirement 4: Step Wizard Translation

**User Story:** As a church administrator, I want the step wizard navigation labels to be available in Amharic, so that I can understand which section of the form I am completing.

#### Acceptance Criteria

1. WHEN Amharic language is selected, THE Registration_Form SHALL display step labels in Amharic
2. THE Member_Registration_Form SHALL translate step labels: Personal, Campus, Contact, Kehnet, Photo
3. THE Children_Registration_Form SHALL translate step labels: Child Info, Address, Family, Contact, Photo
4. THE Registration_Form SHALL translate navigation button labels (Back, Next, Submit) to Amharic equivalents
5. WHEN the language is switched, THE Registration_Form SHALL update step labels and button text immediately

### Requirement 5: Section Title Translation

**User Story:** As a church administrator, I want section titles within registration forms to be available in Amharic, so that I can understand the purpose of each form section.

#### Acceptance Criteria

1. WHEN Amharic language is selected, THE Registration_Form SHALL display section titles in Amharic
2. THE Member_Registration_Form SHALL translate section titles: Personal Information, Campus & Education, Contact Information, Kehnet Role & Sub-Department, Photo Upload
3. THE Children_Registration_Form SHALL translate section titles: Child Information, Address, Family Information, Contact Information, Photo Upload
4. WHEN the language is switched, THE Registration_Form SHALL update section titles immediately

### Requirement 6: Validation and Error Message Translation

**User Story:** As a church administrator, I want validation messages and error messages to be available in Amharic, so that I can understand what corrections are needed in the form.

#### Acceptance Criteria

1. WHEN Amharic language is selected, THE Registration_Form SHALL display validation error messages in Amharic
2. THE Member_Registration_Form SHALL translate validation messages: "Given name and father's name are required", "Phone number is required", "Please select a gender"
3. THE Registration_Form SHALL translate success messages: "Member registered successfully", "Child registered successfully"
4. THE Registration_Form SHALL translate file upload instructions in Amharic
5. WHEN the language is switched, THE Registration_Form SHALL display subsequent validation messages in the selected language

### Requirement 7: Language Context Management

**User Story:** As a developer, I want a centralized language management system, so that language state can be shared across all components consistently.

#### Acceptance Criteria

1. THE Localization_System SHALL provide a Language_Context that stores the current language state
2. THE Language_Context SHALL expose a function to retrieve translated text for a given key
3. THE Language_Context SHALL expose a function to toggle between English and Amharic
4. THE Language_Context SHALL expose the current language value (English or Amharic)
5. WHEN a component requests a translation for a key that does not exist, THE Translation_Service SHALL return the key itself as a fallback
6. THE Language_Context SHALL be accessible to all components through a React hook

### Requirement 8: Translation Data Structure

**User Story:** As a developer, I want a well-organized translation data structure, so that translations can be easily maintained and extended.

#### Acceptance Criteria

1. THE Translation_Service SHALL organize translations by form section and field name
2. THE Translation_Service SHALL store translations in a structured JSON or TypeScript object format
3. THE Translation_Service SHALL include translations for all field labels, placeholders, options, buttons, section titles, and messages
4. THE Translation_Service SHALL support nested translation keys for hierarchical organization
5. THE Translation_Service SHALL be type-safe using TypeScript interfaces

### Requirement 9: Accessibility Compliance

**User Story:** As a user with assistive technology, I want the language toggle and translated content to be accessible, so that I can use the registration forms regardless of my abilities.

#### Acceptance Criteria

1. THE Language_Toggle SHALL include appropriate ARIA labels indicating its purpose
2. THE Language_Toggle SHALL be keyboard accessible using standard navigation keys
3. WHEN the language is changed, THE Localization_System SHALL announce the language change to screen readers
4. THE Registration_Form SHALL maintain proper label-input associations in both languages
5. THE Registration_Form SHALL maintain proper heading hierarchy in both languages

### Requirement 10: Right-to-Left Text Support

**User Story:** As a church administrator viewing Amharic content, I want text to be displayed in the correct direction, so that content is readable and properly formatted.

#### Acceptance Criteria

1. WHEN Amharic language is selected, THE Localization_System SHALL maintain left-to-right text direction for Amharic script
2. THE Registration_Form SHALL preserve proper text alignment for both English and Amharic content
3. THE Registration_Form SHALL ensure form layouts remain visually consistent in both languages
4. THE Registration_Form SHALL handle mixed-direction content (English names in Amharic forms) appropriately

### Requirement 11: Photo Upload Instructions Translation

**User Story:** As a church administrator, I want photo upload instructions and messages to be available in Amharic, so that I can understand how to upload photos correctly.

#### Acceptance Criteria

1. WHEN Amharic language is selected, THE Registration_Form SHALL display photo upload instructions in Amharic
2. THE Registration_Form SHALL translate the drag-and-drop instruction text
3. THE Registration_Form SHALL translate file type and size limit information
4. THE Registration_Form SHALL translate the "Click to change" message when a photo is selected
5. THE Registration_Form SHALL translate the photo preview label text

### Requirement 12: Form Completion Title Translation

**User Story:** As a church administrator, I want the main form title to be available in Amharic, so that I can identify which registration form I am using.

#### Acceptance Criteria

1. WHEN Amharic language is selected, THE Member_Registration_Form SHALL display "Member Registration" in Amharic
2. WHEN Amharic language is selected, THE Children_Registration_Form SHALL display "Children Registration" in Amharic
3. THE Registration_Form SHALL update the title immediately when the language is switched
