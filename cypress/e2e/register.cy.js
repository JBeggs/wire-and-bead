/// <reference types="cypress" />

describe('Register', () => {
  beforeEach(() => {
    cy.visit('/register');
  });

  it('renders register form', () => {
    cy.get('[data-cy="register-full-name"]').should('be.visible');
    cy.get('[data-cy="register-email"]').should('be.visible');
    cy.get('[data-cy="register-password"]').should('be.visible');
    cy.get('[data-cy="register-password-confirm"]').should('be.visible');
    cy.get('[data-cy="register-submit"]').should('be.visible');
  });

  it('shows error when passwords do not match', () => {
    cy.get('[data-cy="register-full-name"]').type('Test User');
    cy.get('[data-cy="register-email"]').type('newuser@example.com');
    cy.get('[data-cy="register-password"]').type('password123');
    cy.get('[data-cy="register-password-confirm"]').type('different123');
    cy.get('[data-cy="register-submit"]').click();
    cy.get('[data-cy="toast-error"]', { timeout: 5000 }).should('exist').and('contain.text', 'Passwords do not match');
  });

  it('successful registration redirects to home', () => {
    const timestamp = Date.now();
    const email = `cypress-${timestamp}@example.com`;
    const password = 'TestPass123!';

    cy.get('[data-cy="register-full-name"]').type('Cypress Test');
    cy.get('[data-cy="register-email"]').type(email);
    cy.get('[data-cy="register-password"]').type(password);
    cy.get('[data-cy="register-password-confirm"]').type(password);
    cy.get('[data-cy="register-submit"]').click();

    cy.url({ timeout: 15000 }).should('eq', Cypress.config('baseUrl') + '/');
  });
});
