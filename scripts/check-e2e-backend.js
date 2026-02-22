#!/usr/bin/env node
/**
 * Verify Django backend is ready for E2E tests.
 * Run before E2E: ensures testuser exists and can login.
 */
const apiUrl = process.env.CYPRESS_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
const testUser = process.env.CYPRESS_TEST_USER || 'testuser';
const testPass = process.env.CYPRESS_TEST_PASSWORD || 'testpass';

async function check() {
  try {
    const res = await fetch(`${apiUrl}/auth/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: testUser,
        password: testPass,
        company_slug: 'past-and-present',
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      if (res.status === 401) {
        console.error('');
        console.error('E2E backend not ready: testuser login failed (401).');
        console.error('');
        console.error('Run the Django seed first:');
        console.error('  cd django-crm');
        console.error('  python manage.py seed_past_and_present_e2e');
        console.error('');
        process.exit(1);
      }
      console.error(`Backend returned ${res.status}:`, body);
      process.exit(1);
    }

    // Verify products exist (required for cart/checkout E2E)
    const productsRes = await fetch(`${apiUrl}/v1/public/past-and-present/products/?page_size=1`);
    if (!productsRes.ok) {
      console.error('');
      console.error('Products API failed:', productsRes.status);
      process.exit(1);
    }
    const productsData = await productsRes.json().catch(() => ({}));
    const products = productsData?.data ?? productsData?.results ?? [];
    if (!Array.isArray(products) || products.length === 0) {
      console.error('');
      console.error('E2E backend not ready: no products for past-and-present.');
      console.error('');
      console.error('Run the Django seed:');
      console.error('  cd django-crm');
      console.error('  python manage.py seed_past_and_present_e2e');
      console.error('');
      process.exit(1);
    }

    console.log('✓ Backend ready: testuser can login, products exist');
    console.log('  Ensure Next.js dev server uses NEXT_PUBLIC_API_URL=http://localhost:8000/api (.env.local)');
    process.exit(0);
  } catch (err) {
    console.error('');
    console.error('Cannot reach Django backend at', apiUrl);
    console.error('Ensure Django is running: python manage.py runserver');
    console.error('');
    console.error(err.message);
    process.exit(1);
  }
}

check();
