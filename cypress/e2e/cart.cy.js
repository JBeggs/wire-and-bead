/// <reference types="cypress" />

describe('Cart', () => {
  beforeEach(() => {
    cy.visit('/products');
    cy.get('[data-cy="products-section"]', { timeout: 10000 }).should('be.visible');
  });

  it('shows empty state when cart is empty', () => {
    cy.visit('/cart');
    cy.get('[data-cy="cart-empty"]').should('be.visible');
    cy.get('[data-cy="cart-container"]').should('exist');
  });

  it('adds item and shows cart content when logged in', () => {
    cy.login();
    cy.visit('/products');
    cy.get('[data-cy="products-grid"]', { timeout: 10000 }).should('be.visible').and('not.be.empty');
    cy.get('[data-cy="products-grid"] a[href^="/products/"]').first().click();
    cy.url().should('include', '/products/');
    cy.get('[data-cy="add-to-cart"]', { timeout: 10000 }).should('not.be.disabled').click();
    cy.wait(500);
    cy.visit('/cart');
    cy.get('[data-cy="cart-content"]').should('be.visible');
  });

  it('proceeds to checkout when cart has items', () => {
    cy.login();
    cy.visit('/products');
    cy.get('[data-cy="products-grid"]', { timeout: 10000 }).should('be.visible').and('not.be.empty');
    cy.get('[data-cy="products-grid"] a[href^="/products/"]').first().click();
    cy.get('[data-cy="add-to-cart"]', { timeout: 10000 }).should('not.be.disabled').click();
    cy.wait(500);
    cy.visit('/cart');
    cy.get('[data-cy="checkout-link"]').click();
    cy.url().should('include', '/checkout');
  });
});
