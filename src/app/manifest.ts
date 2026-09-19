import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'CivicOS Hiện trường',
    short_name: 'CivicOS',
    description: 'Tác nghiệp hiện trường CivicOS',
    start_url: '/field/vehicles',
    display: 'standalone',
    background_color: '#020617',
    theme_color: '#020617',
  };
}
