export function parseApplication(body: Record<string, unknown>) {
  if (body.website) throw new Error('Invalid application');
  const text = (key: string, min: number, max: number) => {
    const value = typeof body[key] === 'string' ? body[key].trim() : '';
    if (value.length < min || value.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) throw new Error('Check your application details');
    return value;
  };
  const id = text('id',36,36);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) throw new Error('Invalid application reference');
  if (!['full-time','part-time'].includes(String(body.employment_type)) || body.consent !== true) throw new Error('Choose working time and confirm consent');
  const contact = text('contact',5,160);
  if (!/^(?:[^\s@]+@[^\s@]+\.[^\s@]+|\+?[\d ()-]{7,24}|@[A-Za-z0-9_]{5,32})$/.test(contact)) throw new Error('Enter an email, phone number, or Telegram username');
  return { id, full_name: text('full_name',2,100), contact, employment_type: body.employment_type as string,
    availability: text('availability',2,300), experience: text('experience',0,1500), consent_version: '2026-09-09' };
}
