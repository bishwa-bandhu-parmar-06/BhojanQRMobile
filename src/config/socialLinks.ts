export const FOUNDER = {
  name: 'Bishwa Bandhu Parmar',
  role: 'Founder & Developer',
  email: 'founder@bhojanqr.com',
  phone: '+91 9142364660',
  phoneAlt: '+91 8051637633',
};

export const CONTACT_LINKS = {
  email: `mailto:${FOUNDER.email}`,
  emailWithSubject: (subject: string) =>
    `mailto:${FOUNDER.email}?subject=${encodeURIComponent(subject)}`,
  phone: `tel:${FOUNDER.phone.replace(/\s+/g, '')}`,
  phoneAlt: `tel:${FOUNDER.phoneAlt.replace(/\s+/g, '')}`,
  whatsapp: 'https://wa.me/919142364660',
};

export const BUSINESS_HOURS = [
  { day: 'Monday - Friday', hours: '9:00 AM - 6:00 PM' },
  { day: 'Saturday', hours: '10:00 AM - 4:00 PM' },
  { day: 'Sunday', hours: 'Closed' },
];

export const WEBSITE_URL = 'https://bhojanqr.com';
export const WEBSITE_LINKS = {
  blog: `${WEBSITE_URL}/blog`,
  videoLibrary: `${WEBSITE_URL}/video-tutorials`,
  terms: `${WEBSITE_URL}/terms-and-conditions`,
};
