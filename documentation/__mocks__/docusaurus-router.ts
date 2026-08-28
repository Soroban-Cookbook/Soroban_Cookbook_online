// Mutable mock for @docusaurus/router used by vitest tests.
// Tests can import and mutate `mockLocation` to control what useLocation returns.

export const mockLocation = { pathname: '/', search: '' };

export function useLocation() {
  return { ...mockLocation };
}

export function useHistory() {
  return { push: () => {}, replace: () => {} };
}
