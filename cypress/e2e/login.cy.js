/// <reference types="cypress" />

describe('Login', () => {
  beforeEach(() => {
    cy.visit('/login');
  });

  it('renders login form', () => {
    cy.get('[data-cy="login-username"]').should('be.visible');
    cy.get('[data-cy="login-password"]').should('be.visible');
    cy.get('[data-cy="login-submit"]').should('be.visible');
  });

  it('submits credentials and redirects on success', () => {
    const username = Cypress.env('testUser') || 'testuser';
    const password = Cypress.env('testPassword') || 'testpass';

    cy.get('[data-cy="login-username"]').type(username);
    cy.get('[data-cy="login-password"]').type(password);
    cy.get('[data-cy="login-submit"]').click();

    cy.url({ timeout: 15000 }).should('eq', Cypress.config('baseUrl') + '/');
  });
});
