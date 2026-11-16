import { MetadataRoute } from 'next'
 
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Getsanctos',
    short_name: 'Sanctos',
    description: 'Your calm companion for managing blood pressure.',
    start_url: '/home',
    display: 'standalone',
    background_color: '#F9F7F1',
    theme_color: '#0F2537',
    icons: [
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}