-- Add slug column to share_links for SEO-friendly URLs
alter table share_links add column if not exists slug text;
