# Chrome / Edge Store Submission Draft

This folder contains draft materials for a Chrome Web Store and Microsoft Edge Add-ons submission.

## Files

- STORE_LISTING.md: short and long description text, keywords, category, and support/privacy URLs
- PRIVACY_POLICY.md: privacy policy draft for the extension
- images/: final icon/screenshot/promo assets, once created (see Image assets below) - empty for now

## Image assets

Not created yet - this is the naming/dimension convention to follow once real assets exist, so
Chrome and Edge can reuse the exact same files (both stores accept the same dimensions). Store
everything under `docs/store/images/`, PNG only, no padding beyond what each spec calls for.

| File | Dimensions | Required by |
| --- | --- | --- |
| `icon-128.png` | 128x128 (artwork ~96x96, transparent padding to fill) | Chrome, Edge |
| `logo-300.png` | 300x300 (min 128x128), 1:1 | Edge (its own "Extension logo" field) |
| `promo-small-440x280.png` | 440x280 | Chrome (required), Edge (optional) |
| `promo-marquee-1400x560.png` | 1400x560 | Chrome (optional, for featured placement), Edge (optional "Large promotional tile") |
| `screenshot-1-1280x800.png` ... `screenshot-5-1280x800.png` | 1280x800 (or 640x400/640x480), full-bleed, no rounded corners | Chrome (1-5), Edge (up to 6) |

Suggested screenshot subjects, in order: extension popup, admin menu / quick-jump menu, Sitecore
Content Editor with injected UI, AI Pages mapping screen.

## Recommended submission checklist

1. Confirm extension name and icon are final
2. Add final screenshots for:
   - extension popup
   - admin menu / quick-jump menu
   - Sitecore Content Editor with injected UI
   - optional: AI Pages mapping screen
3. Add a public support URL and privacy policy URL
4. Validate the extension on Chrome and Edge using developer mode
5. Submit a zipped or packaged build when the listing is ready

## Suggested metadata

- Name: Fobles
- Category: Productivity
- Short description: Fobles for Sitecore adds fast navigation and productivity shortcuts for the Sitecore Content Editor.
- Support URL: replace with your public issue tracker or support page
- Privacy policy URL: link to this repository file or a hosted version

## Notes

- This is a local productivity extension for Sitecore users.
- The extension should not claim to be a Sitecore product or official support channel.
- The extension should clearly say it is intended for users who already have a Sitecore environment and browser access to it.

## Store-specific reminders

### Chrome Web Store

- Ensure the manifest is valid and the extension is tested on recent Chrome versions.
- Confirm the privacy policy is published and accessible.
- Provide screenshots that show the real UI in a Sitecore context.

### Microsoft Edge Add-ons

- Reuse the same listing copy and screenshots as the Chrome listing.
- Verify the extension works in Edge with the same permissions and behavior.
- Keep the developer identity and support links consistent.
