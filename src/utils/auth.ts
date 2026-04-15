const GMAIL_DOMAIN = '@gmail.com';

export function isStudentGmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  return normalized.endsWith(GMAIL_DOMAIN) && normalized.length > GMAIL_DOMAIN.length;
}

export function validateAuthInput(email: string, studentId: string): string | null {
  if (!isStudentGmail(email)) {
    return 'Only student Gmail addresses are allowed.';
  }

  if (!studentId.trim()) {
    return 'Student ID is required.';
  }

  if (studentId.trim().length < 4) {
    return 'Student ID looks too short. Please enter a valid ID.';
  }

  return null;
}
