# Authorized Hotel Media Imports

Use this folder for hotel data/photo manifests when the property has supplied
the images or you otherwise have permission to reuse them in ZIVO.

For Chateau Kampot, put the real property photos in a local folder such as:

```text
data/hotel-imports/chateau-kampot-media/
  profile.jpg
  cover.jpg
  gallery/
    01.jpg
    02.jpg
  rooms/
    deluxe-double/
      01.jpg
      02.jpg
    deluxe-twin/
      01.jpg
```

Then update `chateau-kampot.authorized-template.json`:

```json
{
  "media_authorized": true,
  "media": {
    "logo_file": "chateau-kampot-media/profile.jpg",
    "banner_file": "chateau-kampot-media/cover.jpg",
    "gallery_images": [
      { "file": "chateau-kampot-media/gallery/01.jpg", "caption": "Exterior" }
    ]
  },
  "rooms": [
    {
      "name": "Deluxe Double Room with Balcony",
      "photos": [
        { "file": "chateau-kampot-media/rooms/deluxe-double/01.jpg", "caption": "Room" }
      ]
    }
  ]
}
```

Dry run:

```bash
node --experimental-strip-types --no-warnings scripts/import-authorized-hotel-manifest.ts \
  data/hotel-imports/chateau-kampot.authorized-template.json --apply-media
```

Apply to Supabase:

```bash
set -a && . ./.scrape-session.local && set +a
node --experimental-strip-types --no-warnings scripts/import-authorized-hotel-manifest.ts \
  data/hotel-imports/chateau-kampot.authorized-template.json --apply --apply-media
```

The importer refuses `booking.com` and `bstatic.com` media URLs. Use local
files or property-owned public URLs.
