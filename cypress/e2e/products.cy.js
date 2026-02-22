/// <reference types="cypress" />

describe('Products', () => {
  beforeEach(() => {
    cy.visit('/products');
  });

  it('loads products page', () => {
    cy.get('[data-cy="products-section"]', { timeout: 10000 }).should('be.visible');
    cy.get('[data-cy="products-grid"], [data-cy="products-empty"]').should('exist');
  });

  it('navigates to product detail when product has slug', () => {
    cy.get('[data-cy="products-grid"]', { timeout: 10000 }).should('be.visible').and('not.be.empty');
    cy.get('[data-cy="products-grid"] a[href^="/products/"]').first().click();
    cy.url().should('include', '/products/');
  });
});
