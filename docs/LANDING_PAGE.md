# ICMU landing page

The public portfolio at `/` and its existing `/home` alias use the new design. Login, signup, membership data, and administration retain their existing implementation.

## Replace images and videos

Edit `src/components/portfolio/content.js`. Put your own files in `public/images/` or `public/videos/`.

| Setting | Used for |
| --- | --- |
| `portfolioImages.heroMain` | Camera image on the left of the hero |
| `portfolioImages.heroSecondary` | Editing image on the right |
| `portfolioImages.competition` | Full-width festival image |
| `productionScenes[].image` | Poster for each production scene |
| `productionScenes[].video` | Optional background video for that scene |
| `productionScenes[].alt` | Description of your replacement image |
| `creativeTeams[].image` and `imageAlt` | Image and description in each team popup |
| `creativeTeams[].description`, `activities`, and `suitability` | Team introduction, activities and interests |

For example, `public/images/filming.webp` becomes `/images/filming.webp`. A video can use `/videos/filming.mp4`. Keep an image as the poster even when adding video. Leave `video: ''` for an image-only scene.

The stock photos are placeholders, not photographs of ICMU members. They load in responsive sizes. Local replacement images use the exact file you provide; use compressed WebP or JPEG around 1400 to 1800 pixels wide. A short muted 720p MP4 is enough for a background video.

## Your logo

`src/components/portfolio/IcmuLogo.jsx` contains the original 27 paths from your supplied `outlined-logo.svg`. Geometry is preserved and the colour inherits from CSS. The original SVG is also retained in `public/images/icmu-outlined-original.svg`.

The emblem is used by the preloader, landing header, hero, and footer. Shared logos on login and administration are unaffected.

## Design and motion

- Font: the existing Montserrat.
- Theme and responsive layout: `src/pages/portfolio.css`.
- Membership, competition, join, and footer styling: `src/components/sections/landing-sections.css`.
- Main scroll choreography: `src/pages/Home.jsx`.
- Preloader: `src/components/portfolio/LogoPreloader.jsx`.
- Media playback and posters: `src/components/portfolio/PortfolioMedia.jsx`.

The logo-only opener centers and draws the supplied mark before carrying that same mark into the hero. It waits for the hero images and local Montserrat fonts, with a bounded handoff. It runs once per application visit. Direct links to page sections skip it. The document and public loading fallback both use a black background to prevent a white flash on reload.

Lenis and GSAP share one animation clock. React Bits SplitText provides the text reveals, and buttons reuse the existing beUI source. The hero uses a subtle React Bits DriftWall backdrop plus layered pointer depth and scroll parallax for the logo and production images. Desktop production scenes use a sticky viewport with crossfades and shallow zoom. Hero images fade as they leave the screen. Mobile and short screens use normal vertical sections with shallow parallax. The SVG uses the supplied paths with thinner strokes and a drawing animation.

Each of the eight team rows opens `TeamDialog.jsx`. The native dialog supports a close button, Escape and backdrop dismissal. Background scrolling and Lenis pause while it is open; long content scrolls inside the dialog. Closing restores focus to its team row and resumes scrolling.

Reduced-motion mode skips the opener, split animations, parallax, smooth wheel scrolling, and background playback. Videos load near the viewport, pause when outside it or when the tab is hidden, and have a pause control. No canvas, shaders, or 3D renderer are used.

## Placeholder sources

- [Camera and film crew](https://www.pexels.com/photo/photo-of-camera-equipment-3062553/)
- [Editing workstation](https://www.pexels.com/photo/editor-working-on-a-computer-8100060/)
- [Camera operator](https://www.pexels.com/photo/close-up-of-a-cameraman-holding-a-camera-13812425/)
- [Microphone and mixing console](https://www.pexels.com/photo/lit-up-mixing-console-and-microphone-on-desk-14540966/)
- [Audience and stage](https://www.pexels.com/photo/audience-looking-at-the-stage-7780108/)

These are linked placeholders for layout review. Replace the URLs before adding your own portfolio photography. Nothing has been published.

