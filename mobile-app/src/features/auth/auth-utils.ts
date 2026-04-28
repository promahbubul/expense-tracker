export function displayNameFromEmail(email: string) {
  const localPart = email.split('@')[0] ?? 'User';
  const cleaned = localPart.replace(/[._-]+/g, ' ').trim();
  if (!cleaned) {
    return 'User';
  }

  return cleaned
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
