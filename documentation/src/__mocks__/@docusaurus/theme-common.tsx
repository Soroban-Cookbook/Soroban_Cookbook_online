export function useColorMode() {
  return {
    colorMode: 'dark' as const,
    setColorMode: () => {},
  };
}
