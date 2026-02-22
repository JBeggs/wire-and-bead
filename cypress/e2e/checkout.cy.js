/// <reference types="cypress" />

describe('Checkout', () => {
  it('redirects to cart when cart is empty', () => {
    cy.visit('/checkout');
    cy.url().should('include', '/cart');
  });

  it('shows checkout form when cart has items', () => {
    cy.login();
    cy.visit('/products');
    cy.get('[data-cy="products-grid"]', { timeout: 10000 }).should('be.visible').and('not.be.empty');
    cy.get('[data-cy="products-grid"] a[href^="/products/"]').first().click();
    cy.get('[data-cy="add-to-cart"]', { timeout: 10000 }).should('not.be.disabled').click();
    cy.wait(500);
    cy.visit('/checkout');
    cy.get('[data-cy="checkout-content"]').should('be.visible');
    cy.get('[data-cy="checkout-form"]').should('be.visible');
    cy.get('[data-cy="checkout-submit"]').scrollIntoView().should('be.visible');
  });
});
