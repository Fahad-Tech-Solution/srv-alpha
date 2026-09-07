/**
 * Keep emails contact-safe: lowercase only.
 * Default express-validator normalizeEmail() strips dots from Gmail local parts
 * (fahadtech.fts@gmail.com → fahadtechfts@gmail.com), which breaks display/contact.
 */
export const SAFE_EMAIL_NORMALIZE = {
  all_lowercase: true,
  gmail_remove_dots: false,
  gmail_remove_subaddress: false,
  outlookdotcom_remove_subaddress: false,
  yahoo_remove_subaddress: false,
  icloud_remove_subaddress: false,
} as const
