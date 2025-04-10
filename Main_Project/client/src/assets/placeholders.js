// Game placeholder SVG images
export const placeholderImages = {
  thumbnail: `
    <svg width="300" height="200" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#f0f0f0"/>
      <text x="50%" y="50%" font-family="Arial" font-size="16" fill="#666" text-anchor="middle" dy=".3em">Game Thumbnail</text>
    </svg>
  `,
  card: `
    <svg width="300" height="200" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#e0e0e0"/>
      <text x="50%" y="50%" font-family="Arial" font-size="16" fill="#666" text-anchor="middle" dy=".3em">Game Card</text>
    </svg>
  `
};

// Helper function to create data URLs
export const createSvgUrl = (svg) => `data:image/svg+xml,${encodeURIComponent(svg.trim())}`;

// Export URLs for each game
export const gameImages = {
  Wingo: {
    thumbnailUrl: createSvgUrl(placeholderImages.thumbnail),
    cardImageUrl: createSvgUrl(placeholderImages.card)
  },
  K3: {
    thumbnailUrl: createSvgUrl(placeholderImages.thumbnail),
    cardImageUrl: createSvgUrl(placeholderImages.card)
  },
  '5D': {
    thumbnailUrl: createSvgUrl(placeholderImages.thumbnail),
    cardImageUrl: createSvgUrl(placeholderImages.card)
  },
  WingoTrx: {
    thumbnailUrl: createSvgUrl(placeholderImages.thumbnail),
    cardImageUrl: createSvgUrl(placeholderImages.card)
  },
  Ludo: {
    thumbnailUrl: createSvgUrl(placeholderImages.thumbnail),
    cardImageUrl: createSvgUrl(placeholderImages.card)
  },
  Chess: {
    thumbnailUrl: createSvgUrl(placeholderImages.thumbnail),
    cardImageUrl: createSvgUrl(placeholderImages.card)
  },
  Numma: {
    thumbnailUrl: createSvgUrl(placeholderImages.thumbnail),
    cardImageUrl: createSvgUrl(placeholderImages.card)
  },
  FortuneWheel: {
    thumbnailUrl: createSvgUrl(placeholderImages.thumbnail),
    cardImageUrl: createSvgUrl(placeholderImages.card)
  }
};