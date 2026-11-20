// The alias target for `@docusaurus/router` in vitest.config.ts.
//
// Re-export the shared mutable mock (documentation/__mocks__/docusaurus-router)
// so tests that import and mutate `mockLocation` actually control what the
// component under test sees — previously this file hardcoded pathname '/'
// independently, so route-dependent components never observed the test's route.
export { mockLocation, useLocation, useHistory } from '../../../__mocks__/docusaurus-router';
