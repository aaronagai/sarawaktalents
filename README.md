# Sarawak Talents

A clean, interactive directory where **top Sarawakian talents** gather — discover exceptional people from across the Land of the Hornbills.

🔗 **Live site:** [aaronagai.github.io/gps-prn13-candidates](https://aaronagai.github.io/gps-prn13-candidates)

---

## Features

### Talent Grid
- Profile cards with headshot photos and initials fallback
- **Featured / Member** badge on each card
- Click any card to open a detailed talent profile modal

### Search & Filter
- Live search by name, role, field, or city
- Multi-select filters: **Field**, **Background**, **Industry**, **Type** (Featured / Member)
- Sort by: **ID**, **Name A–Z**, **Field**
- Filter badge indicator when filters are active
- Clear all filters button

### Explore Talents (Swipe Stack)
- Swipe or drag cards left/right to browse profiles
- Tap the front card to open the talent profile modal
- Arrow buttons for keyboard-friendly navigation

### Bilingual Support
- Toggle between **English** and **Bahasa Malaysia**
- All labels, filters, and UI text translated

### PWA (Progressive Web App)
- Installable on Android and iOS homescreen
- Offline support via service worker — core assets and viewed photos are cached

---

## Fields

| Field | Description | Colour |
|-------|-------------|--------|
| Tech | Technology & engineering | Teal |
| Arts | Creative & performing arts | Orange |
| Business | Entrepreneurship & commerce | Blue |
| Science | Research & innovation | Green |

---

## Tech Stack

- Vanilla HTML / CSS / JavaScript — no frameworks
- [Tailwind CSS](https://tailwindcss.com) via CDN
- GitHub Pages hosting
- Service Worker for offline caching

---

## Adding / Updating Talent Photos

1. Name the file by talent ID — e.g. `T01.jpg`
2. Place it in the `photos/` folder
3. The card and modal will display it automatically; cards without a photo show an initials avatar

## Updating the Talent List

Edit the `candidates` array in `script.js` with these fields:

```
id | dun_no (ID) | name | dun (role) | party (field) | zone (city) | parliamentary (industry) | race (background)
```

---

Built by [@aaronagai](https://x.com/aaronagai) · [st.aaronagai@gmail.com](mailto:st.aaronagai@gmail.com)
