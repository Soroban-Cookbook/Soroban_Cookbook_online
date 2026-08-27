export default function useDocusaurusContext() {
  return {
    siteConfig: {
      title: 'Soroban Cookbook',
      tagline: 'Master Soroban smart contracts',
      customFields: {
        newsletterEndpoint: 'https://example.com/api/newsletter',
      },
      themeConfig: {
        image: 'img/soroban-social-card.png',
      },
    },
  };
}
