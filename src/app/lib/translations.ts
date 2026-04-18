// Translation data service for bilingual (English/Amharic) support
// Covers Member Registration, Children Registration, StepWizard, and Photo Upload

export type Language = 'en' | 'am';

export interface Translations {
  common: {
    back: string;
    next: string;
    submit: string;
    submitting: string;
    male: string;
    female: string;
  };
  memberRegistration: {
    title: string;
    steps: {
      personal: string;
      campus: string;
      contact: string;
      kehnet: string;
      photo: string;
    };
    sections: {
      personalInfo: string;
      campusEducation: string;
      contactInfo: string;
      kehnetRole: string;
      photoUpload: string;
    };
    fields: {
      givenName: { label: string; placeholder: string };
      fatherName: { label: string; placeholder: string };
      grandfatherName: { label: string; placeholder: string };
      spiritualName: { label: string; placeholder: string };
      gender: { label: string };
      dob: { label: string };
      campus: { label: string; selectPlaceholder: string };
      yearOfStudy: { label: string; selectPlaceholder: string };
      department: { label: string; placeholder: string };
      phone: { label: string; placeholder: string };
      email: { label: string; placeholder: string };
      telegram: { label: string; placeholder: string };
      subDepartments: { label: string; helper: string };
      kehnetRole: { label: string; helper: string };
    };
    options: {
      campuses: { main: string; gendeje: string; station: string };
      years: string[];
      kehnetRoles: { deacon: string; kes: string; mergeta: string };
      subDepts: { mezmur: string; kinetibeb: string; kuttr: string; timhert: string };
    };
    messages: {
      success: string;
      errorNameRequired: string;
      errorPhoneRequired: string;
      errorGenderRequired: string;
    };
  };
  childrenRegistration: {
    title: string;
    steps: {
      childInfo: string;
      address: string;
      family: string;
      contact: string;
      photo: string;
    };
    sections: {
      childInfo: string;
      address: string;
      familyInfo: string;
      contactInfo: string;
      photoUpload: string;
    };
    fields: {
      givenName: { label: string; placeholder: string };
      fatherName: { label: string; placeholder: string };
      grandfatherName: { label: string; placeholder: string };
      spiritualName: { label: string; placeholder: string };
      gender: { label: string };
      dob: { label: string };
      kutrLevel: { label: string };
      homeAddress: { label: string; placeholder: string };
      fatherFullName: { label: string; placeholder: string };
      motherFullName: { label: string; placeholder: string };
      fatherPhone: { label: string; placeholder: string };
      motherPhone: { label: string; placeholder: string };
    };
    options: {
      kutrLevels: { kutr1: string; kutr2: string; kutr3: string };
    };
    messages: {
      success: string;
    };
  };
  photoUpload: {
    dragDropMember: string;
    dragDropChild: string;
    clickBrowse: string;
    clickToChange: string;
  };
}

export const translations: Record<Language, Translations> = {
  en: {
    common: {
      back: 'Back',
      next: 'Next',
      submit: 'Submit Registration',
      submitting: 'Submitting…',
      male: 'Male',
      female: 'Female',
    },
    memberRegistration: {
      title: 'Member Registration',
      steps: {
        personal: 'Personal',
        campus: 'Campus',
        contact: 'Contact',
        kehnet: 'Kehnet',
        photo: 'Photo',
      },
      sections: {
        personalInfo: 'Personal Information',
        campusEducation: 'Campus & Education',
        contactInfo: 'Contact Information',
        kehnetRole: 'Kehnet Role & Sub-Department',
        photoUpload: 'Photo Upload',
      },
      fields: {
        givenName: { label: 'Given Name', placeholder: 'Given Name' },
        fatherName: { label: "Father's Name", placeholder: "Father's Name" },
        grandfatherName: { label: "Grandfather's Name", placeholder: "Grandfather's Name" },
        spiritualName: { label: 'Spiritual Name', placeholder: 'Spiritual Name' },
        gender: { label: 'Gender' },
        dob: { label: 'Date of Birth' },
        campus: { label: 'Campus', selectPlaceholder: 'Select campus' },
        yearOfStudy: { label: 'Year of Study', selectPlaceholder: 'Select year' },
        department: { label: 'Department', placeholder: 'e.g. Computer Science' },
        phone: { label: 'Phone Number', placeholder: '+251 911 ...' },
        email: { label: 'Email Address', placeholder: 'you@email.com' },
        telegram: { label: 'Telegram Username', placeholder: '@username' },
        subDepartments: {
          label: 'Sub-Departments',
          helper: 'Select all sub-departments this member belongs to',
        },
        kehnetRole: {
          label: 'Kehnet Role',
          helper: 'Select all that apply',
        },
      },
      options: {
        campuses: { main: 'Main', gendeje: 'Gendeje', station: 'Station' },
        years: [
          '1st Year',
          '2nd Year',
          '3rd Year',
          '4th Year',
          '5th Year',
          '6th Year',
        ],
        kehnetRoles: { deacon: 'Deacon', kes: 'Kes', mergeta: 'Mergeta' },
        subDepts: {
          mezmur: 'Mezmur',
          kinetibeb: 'Kinetibeb',
          kuttr: 'Kuttr',
          timhert: 'Timhert',
        },
      },
      messages: {
        success: 'Member registered successfully!',
        errorNameRequired: "Given name and father's name are required",
        errorPhoneRequired: 'Phone number is required',
        errorGenderRequired: 'Please select a gender',
      },
    },
    childrenRegistration: {
      title: 'Children Registration',
      steps: {
        childInfo: 'Child Info',
        address: 'Address',
        family: 'Family',
        contact: 'Contact',
        photo: 'Photo',
      },
      sections: {
        childInfo: 'Child Information',
        address: 'Address',
        familyInfo: 'Family Information',
        contactInfo: 'Contact Information',
        photoUpload: 'Photo Upload',
      },
      fields: {
        givenName: { label: 'Given Name', placeholder: 'Given Name' },
        fatherName: { label: "Father's Name", placeholder: "Father's Name" },
        grandfatherName: { label: "Grandfather's Name", placeholder: "Grandfather's Name" },
        spiritualName: { label: 'Spiritual Name', placeholder: 'Spiritual Name' },
        gender: { label: 'Gender' },
        dob: { label: 'Date of Birth' },
        kutrLevel: { label: 'Kutr Level *' },
        homeAddress: {
          label: 'Home Address',
          placeholder: 'Enter full address including sub-city, woreda, house number...',
        },
        fatherFullName: { label: "Father's Full Name", placeholder: "Father's Full Name" },
        motherFullName: { label: "Mother's Full Name", placeholder: "Mother's Full Name" },
        fatherPhone: { label: "Father's Phone", placeholder: '+251 911 ...' },
        motherPhone: { label: "Mother's Phone", placeholder: '+251 911 ...' },
      },
      options: {
        kutrLevels: {
          kutr1: 'Kutr 1 (Younger)',
          kutr2: 'Kutr 2 (Middle)',
          kutr3: 'Kutr 3 (Older)',
        },
      },
      messages: {
        success: 'Child registered successfully!',
      },
    },
    photoUpload: {
      dragDropMember: 'Drag & drop your photo here',
      dragDropChild: 'Drag & drop child photo here',
      clickBrowse: 'or click to browse — JPG, PNG up to 5MB',
      clickToChange: 'Click to change',
    },
  },

  am: {
    common: {
      back: 'ወደኋላ',
      next: 'ቀጣይ',
      submit: 'ምዝገባ አስገባ',
      submitting: 'እየቀረበ ነው…',
      male: 'ወንድ',
      female: 'ሴት',
    },
    memberRegistration: {
      title: 'የአባል ምዝገባ',
      steps: {
        personal: 'ግላዊ',
        campus: 'ካምፓስ',
        contact: 'ግንኙነት',
        kehnet: 'ቀህነት',
        photo: 'ፎቶ',
      },
      sections: {
        personalInfo: 'ግላዊ መረጃ',
        campusEducation: 'ካምፓስ እና ትምህርት',
        contactInfo: 'የመገናኛ መረጃ',
        kehnetRole: 'የቀህነት ሚና እና ንዑስ ክፍል',
        photoUpload: 'ፎቶ ስቀል',
      },
      fields: {
        givenName: { label: 'የተሰጠ ስም', placeholder: 'የተሰጠ ስም' },
        fatherName: { label: 'የአባት ስም', placeholder: 'የአባት ስም' },
        grandfatherName: { label: 'የአያት ስም', placeholder: 'የአያት ስም' },
        spiritualName: { label: 'መንፈሳዊ ስም', placeholder: 'መንፈሳዊ ስም' },
        gender: { label: 'ጾታ' },
        dob: { label: 'የልደት ቀን' },
        campus: { label: 'ካምፓስ', selectPlaceholder: 'ካምፓስ ይምረጡ' },
        yearOfStudy: { label: 'የትምህርት ዓመት', selectPlaceholder: 'ዓመት ይምረጡ' },
        department: { label: 'ክፍል', placeholder: 'ለምሳሌ ኮምፒዩተር ሳይንስ' },
        phone: { label: 'ስልክ ቁጥር', placeholder: '+251 911 ...' },
        email: { label: 'ኢሜይል አድራሻ', placeholder: 'you@email.com' },
        telegram: { label: 'ቴሌግራም ተጠቃሚ ስም', placeholder: '@username' },
        subDepartments: {
          label: 'ንዑስ ክፍሎች',
          helper: 'አባሉ የሚሳተፍባቸውን ሁሉንም ንዑስ ክፍሎች ይምረጡ',
        },
        kehnetRole: {
          label: 'የቀህነት ሚና',
          helper: 'የሚሠሩትን ሁሉ ይምረጡ',
        },
      },
      options: {
        campuses: { main: 'ዋና', gendeje: 'ገንደጄ', station: 'ጣቢያ' },
        years: [
          '1ኛ ዓመት',
          '2ኛ ዓመት',
          '3ኛ ዓመት',
          '4ኛ ዓመት',
          '5ኛ ዓመት',
          '6ኛ ዓመት',
        ],
        kehnetRoles: { deacon: 'ዲያቆን', kes: 'ቄስ', mergeta: 'መርጌታ' },
        subDepts: {
          mezmur: 'መዝሙር',
          kinetibeb: 'ቅኔ ትብብ',
          kuttr: 'ኩትር',
          timhert: 'ትምህርት',
        },
      },
      messages: {
        success: 'አባል በተሳካ ሁኔታ ተመዝግቧል!',
        errorNameRequired: 'የተሰጠ ስም እና የአባት ስም ያስፈልጋሉ',
        errorPhoneRequired: 'ስልክ ቁጥር ያስፈልጋል',
        errorGenderRequired: 'እባክዎ ጾታ ይምረጡ',
      },
    },
    childrenRegistration: {
      title: 'የልጆች ምዝገባ',
      steps: {
        childInfo: 'የልጅ መረጃ',
        address: 'አድራሻ',
        family: 'ቤተሰብ',
        contact: 'ግንኙነት',
        photo: 'ፎቶ',
      },
      sections: {
        childInfo: 'የልጅ መረጃ',
        address: 'አድራሻ',
        familyInfo: 'የቤተሰብ መረጃ',
        contactInfo: 'የመገናኛ መረጃ',
        photoUpload: 'ፎቶ ስቀል',
      },
      fields: {
        givenName: { label: 'የተሰጠ ስም', placeholder: 'የተሰጠ ስም' },
        fatherName: { label: 'የአባት ስም', placeholder: 'የአባት ስም' },
        grandfatherName: { label: 'የአያት ስም', placeholder: 'የአያት ስም' },
        spiritualName: { label: 'መንፈሳዊ ስም', placeholder: 'መንፈሳዊ ስም' },
        gender: { label: 'ጾታ' },
        dob: { label: 'የልደት ቀን' },
        kutrLevel: { label: 'የኩትር ደረጃ *' },
        homeAddress: {
          label: 'የቤት አድራሻ',
          placeholder: 'ሙሉ አድራሻ ያስገቡ ንዑስ ከተማ፣ ወረዳ፣ የቤት ቁጥር ጨምሮ...',
        },
        fatherFullName: { label: 'የአባት ሙሉ ስም', placeholder: 'የአባት ሙሉ ስም' },
        motherFullName: { label: 'የእናት ሙሉ ስም', placeholder: 'የእናት ሙሉ ስም' },
        fatherPhone: { label: 'የአባት ስልክ', placeholder: '+251 911 ...' },
        motherPhone: { label: 'የእናት ስልክ', placeholder: '+251 911 ...' },
      },
      options: {
        kutrLevels: {
          kutr1: 'ኩትር 1 (ታናሽ)',
          kutr2: 'ኩትር 2 (መካከለኛ)',
          kutr3: 'ኩትር 3 (ትልቅ)',
        },
      },
      messages: {
        success: 'ልጅ በተሳካ ሁኔታ ተመዝግቧል!',
      },
    },
    photoUpload: {
      dragDropMember: 'ፎቶዎን እዚህ ይጎትቱ እና ይጣሉ',
      dragDropChild: 'የልጅ ፎቶ እዚህ ይጎትቱ እና ይጣሉ',
      clickBrowse: 'ወይም ለማሰስ ይጫኑ — JPG, PNG እስከ 5MB',
      clickToChange: 'ለመቀየር ይጫኑ',
    },
  },
};
