// ***********************************************************
// Support file for E2E tests
// Past and Present uses auth_token, refresh_token, company_id (separate keys)
// ***********************************************************

Cypress.Commands.add('login', (username, password) => {
  const user = username || Cypress.env('testUser');
  const pass = password || Cypress.env('testPassword');
  const apiUrl = Cypress.env('apiUrl');
  const companySlug = Cypress.env('companySlug') || 'past-and-present';

  cy.session([user, pass], () => {
    cy.request('POST', `${apiUrl}/auth/login/`, {
      username: user,
      password: pass,
      company_slug: companySlug,
    }).then((res) => {
      expect(res.status).to.eq(200);
      const userId = res.body.user?.id ?? res.body.user?.pk ?? 1;
      const userEmail = res.body.user?.email ?? 'testuser@past-and-present.test';
      const usernameVal = res.body.user?.username ?? user;
      // Stub profile API so AuthContext gets user even if app points to wrong API URL
      cy.intercept('GET', '**/news/profiles/me/**', {
        statusCode: 200,
        body: {
          user: userId,
          email: userEmail,
          username: usernameVal,
          full_name: 'Test User',
          role: 'user',
          is_verified: true,
          social_links: {},
          preferences: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      });
      cy.visit('/');
      cy.window().then((win) => {
        win.localStorage.setItem('auth_token', res.body.access);
        win.localStorage.setItem('refresh_token', res.body.refresh);
        if (res.body.company?.id) {
          win.localStorage.setItem('company_id', res.body.company.id);
        }
      });
      // Second visit so AuthProvider mounts with tokens already in localStorage
      cy.visit('/');
      // Wait for auth to hydrate (profile fetch completes, user is set)
      // header-user or header-cart both indicate logged-in state
      cy.get('[data-cy="header-user"], [data-cy="header-cart"]', { timeout: 15000 }).should('be.visible');
    });
  });
});
