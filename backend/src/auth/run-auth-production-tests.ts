// ============================================================================
// Mizan (ميزان) - Production Authentication Test Suite
// Verifies: Salted scrypt hashing, user registration, login, JWT issuance,
// duplicate protection, case-insensitive email, and tenant membership creation
// ============================================================================

import { PrismaClient } from '@prisma/client';
import { AuthService } from './auth.service';
import { PasswordUtil } from './password.util';
import { PrismaService } from '../prisma/prisma.service';

interface TestResult {
  id: string;
  name: string;
  status: 'PASS' | 'FAIL';
  details?: string;
  durationMs: number;
}

const results: TestResult[] = [];

async function runTest(id: string, name: string, fn: () => Promise<void>) {
  const start = Date.now();
  try {
    await fn();
    results.push({
      id,
      name,
      status: 'PASS',
      durationMs: Date.now() - start,
    });
    console.log(`  [PASS] ${id}: ${name} (${Date.now() - start}ms)`);
  } catch (err: any) {
    results.push({
      id,
      name,
      status: 'FAIL',
      details: err?.message || String(err),
      durationMs: Date.now() - start,
    });
    console.error(`  [FAIL] ${id}: ${name}`);
    console.error(`         Error: ${err?.message || err}`);
  }
}

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

async function main() {
  console.log('\n============================================================');
  console.log('MIZAN PRODUCTION AUTHENTICATION & MULTI-TENANCY TEST SUITE');
  console.log('============================================================\n');

  const prisma = new PrismaService();
  await prisma.$connect();
  const authService = new AuthService(prisma);

  const testSuffix = Date.now();
  const testEmail = `pilot.user.${testSuffix}@emirates-tax.ae`;
  const testPassword = `UAE-CorporateTax#${testSuffix}`;
  const testName = `Pilot Founder ${testSuffix}`;
  const testOrgName = `Al Nakheel Holdings ${testSuffix} LLC`;
  const testPhone = `+97150${Math.floor(1000000 + Math.random() * 9000000)}`;
  let registeredUser: any = null;

  try {
    // ------------------------------------------------------------------------
    // Group 1: Password Cryptography
    // ------------------------------------------------------------------------
    console.log('\n--- 1. Salted Scrypt Cryptography ---');

    await runTest('TC-AUTH-01', 'PasswordUtil generates salted scrypt hash', async () => {
      const hash = await PasswordUtil.hash('StrongPass2026!');
      assert(hash.startsWith('scrypt$16384$8$1$'), 'Hash must match scrypt parameters format');
      assert(hash.split('$').length === 6, 'Hash must contain 6 delimiter segments');
    });

    await runTest('TC-AUTH-02', 'PasswordUtil verifies correct password in constant time', async () => {
      const hash = await PasswordUtil.hash('ValidPass#123');
      const valid = await PasswordUtil.verify('ValidPass#123', hash);
      assert(valid === true, 'Verification of correct password must return true');
    });

    await runTest('TC-AUTH-03', 'PasswordUtil strictly rejects invalid password', async () => {
      const hash = await PasswordUtil.hash('ValidPass#123');
      const invalid = await PasswordUtil.verify('WrongPassword#123', hash);
      assert(invalid === false, 'Verification of wrong password must return false');
    });

    // ------------------------------------------------------------------------
    // Group 2: User & Organisation Registration
    // ------------------------------------------------------------------------
    console.log('\n--- 2. Production User Registration & Tenant Creation ---');

    await runTest('TC-AUTH-04', 'Register rejects passwords shorter than 8 characters', async () => {
      let rejected = false;
      try {
        await authService.register({
          email: `short.${testSuffix}@test.ae`,
          password: 'short',
          fullName: 'Short Pass User',
        });
      } catch (err: any) {
        rejected = true;
        assert(err.status === 400, 'Must return 400 BadRequest');
      }
      assert(rejected, 'Must reject short password');
    });

    await runTest('TC-AUTH-05', 'Register creates User, Organisation, and Admin Membership', async () => {
      const res = await authService.register({
        email: testEmail,
        password: testPassword,
        fullName: testName,
        phone: testPhone,
        organisationName: testOrgName,
      });

      assert(!!res.accessToken, 'Must return accessToken');
      assert(res.user.email === testEmail, 'User email must match normalized email');
      assert(res.user.fullName === testName, 'User full name must match input');
      assert(res.organisation.name === testOrgName, 'Organisation name must match input');
      assert(res.organisation.role === 'ADMIN', 'Initial user role must be ADMIN');

      // Verify DB record directly
      const dbUser = await prisma.user.findUnique({
        where: { email: testEmail },
        include: { memberships: { include: { organisation: true } } },
      });

      assert(!!dbUser, 'User must exist in PostgreSQL database');
      assert(dbUser!.passwordHash!.startsWith('scrypt$'), 'Password must be stored as scrypt hash');
      assert(dbUser!.passwordHash !== testPassword, 'Plaintext password must NEVER be persisted');
      assert(dbUser!.memberships.length === 1, 'User must have exactly 1 membership');
      assert(dbUser!.memberships[0].organisation.name === testOrgName, 'Membership must point to created organisation');

      registeredUser = res;
    });

    await runTest('TC-AUTH-06', 'Register rejects duplicate email with 409 Conflict', async () => {
      let conflict = false;
      try {
        await authService.register({
          email: testEmail.toUpperCase(), // Test case-insensitive duplicate check
          password: 'AnotherPassword2026!',
          fullName: 'Duplicate Pretender',
        });
      } catch (err: any) {
        conflict = true;
        assert(err.status === 409, 'Must return 409 ConflictException');
      }
      assert(conflict, 'Must prevent duplicate email registration');
    });

    // ------------------------------------------------------------------------
    // Group 3: User Login & Session Resolution
    // ------------------------------------------------------------------------
    console.log('\n--- 3. Production User Login & Multi-Tenant Session Resolution ---');

    await runTest('TC-AUTH-07', 'Login succeeds with valid credentials (case-insensitive email)', async () => {
      const res = await authService.login({
        email: testEmail.toUpperCase(),
        password: testPassword,
      });

      assert(!!res.accessToken, 'Must issue JWT token');
      assert(res.user.id === registeredUser.user.id, 'User ID must match');
      assert(res.organisation.id === registeredUser.organisation.id, 'Organisation ID must match');
      assert(res.organisation.role === 'ADMIN', 'Role must be ADMIN');
    });

    await runTest('TC-AUTH-08', 'Login fails with incorrect password (401 Unauthorized)', async () => {
      let rejected = false;
      try {
        await authService.login({
          email: testEmail,
          password: 'IncorrectPassword999!',
        });
      } catch (err: any) {
        rejected = true;
        assert(err.status === 401, 'Must return 401 Unauthorized');
      }
      assert(rejected, 'Must reject incorrect password');
    });

    await runTest('TC-AUTH-09', 'Login fails for non-existent email (401 Unauthorized)', async () => {
      let rejected = false;
      try {
        await authService.login({
          email: 'nonexistent.user@random-domain.ae',
          password: testPassword,
        });
      } catch (err: any) {
        rejected = true;
        assert(err.status === 401, 'Must return 401 Unauthorized');
      }
      assert(rejected, 'Must reject non-existent user');
    });

    // ------------------------------------------------------------------------
    // Group 4: Token Validation & Profile Introspection
    // ------------------------------------------------------------------------
    console.log('\n--- 4. JWT Token Validation & Live Profile Retrieval ---');

    let verifiedContext: any = null;
    await runTest('TC-AUTH-10', 'validateToken decrypts user and tenant organisation boundary', async () => {
      const loginRes = await authService.login({
        email: testEmail,
        password: testPassword,
      });

      verifiedContext = authService.validateToken(loginRes.accessToken);
      assert(verifiedContext.userId === registeredUser.user.id, 'Decoded user ID must match');
      assert(verifiedContext.organisationId === registeredUser.organisation.id, 'Decoded tenant org ID must match');
      assert(verifiedContext.role === 'ADMIN', 'Decoded role must be ADMIN');
    });

    await runTest('TC-AUTH-11', 'getUserProfile returns complete live database profile', async () => {
      const profile = await authService.getUserProfile(verifiedContext);
      assert(profile.authenticated === true, 'Profile must be authenticated');
      assert(profile.user.email === testEmail, 'Email must match');
      assert(profile.user.fullName === testName, 'Full name must match');
      assert(profile.activeOrganisation.id === registeredUser.organisation.id, 'Active organisation ID must match');
      assert(profile.organisations.length >= 1, 'Must contain organisation list');
    });

  } finally {
    // Clean up test user & organisation
    try {
      if (registeredUser) {
        await prisma.membership.deleteMany({ where: { userId: registeredUser.user.id } });
        await prisma.user.deleteMany({ where: { id: registeredUser.user.id } });
        await prisma.organisation.deleteMany({ where: { id: registeredUser.organisation.id } });
      }
    } catch (cleanupErr) {
      console.warn('Test cleanup notice:', cleanupErr);
    }
    await prisma.$disconnect();
  }

  // --------------------------------------------------------------------------
  // Summary
  // --------------------------------------------------------------------------
  console.log('\n============================================================');
  console.log('TEST SUMMARY');
  console.log('============================================================');
  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;
  console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`);

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('All Production Authentication tests passed successfully!\n');
  }
}

main().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
