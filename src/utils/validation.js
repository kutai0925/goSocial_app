export const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

export function isValidUsername(value) {
  return USERNAME_REGEX.test(value.trim());
}

export function isValidEmail(value) {
  return EMAIL_REGEX.test(value.trim());
}

export function isValidPassword(value) {
  return PASSWORD_REGEX.test(value);
}

export function isValidUsernameOrEmail(value) {
  const trimmed = value.trim();
  return USERNAME_REGEX.test(trimmed) || EMAIL_REGEX.test(trimmed);
}
