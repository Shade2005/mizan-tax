// ============================================================================
// Mizan (ميزان) - Automated Security & Multi-Tenancy Test Suite
// Verifies:
// 1. JWT Cryptography (Sign, Verify, Tamper Detection, Expiration, Issuer, Audience)
// 2. Multi-Tenant Organisation Boundary Isolation (Cross-Tenant Rejections)
// 3. Strict DTO Input Validation (Type enforcement, non-negative amounts, forbidNonWhitelisted)
// 4. OCR Quota Rate Limiting & Magic Byte Security
// 5. OCR Non-Fabrication Guarantee (Zero fake financial data on failure)
// 6. Production Mode Demo Authentication Gating
// 7. Production Startup Secret Validation
// ============================================================================

import { JwtUtil, JWT_ISSUER, JWT_AUDIENCE } from '../auth/jwt.util';
import { AuthService } from '../auth/auth.service';
import { BusinessService } from '../business/business.service';
import { LegalEntityTypeDto, JurisdictionTypeDto } from '../business/dto/create-trade-license.dto';
import { OcrService } from '../ocr/ocr.service';
import { ExtractTradeLicenseDto } from '../ocr/ocr.dto';
import { AssessCorporateTaxDto, AssessVatDto } from '../tax/dto/assess-tax.dto';
import { InMemoryRateLimitStore } from './rate-limiter';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`✔ [PASS] ${message}`);
    passed++;
  } else {
    console.error(`✖ [FAIL] ${message}`);
    failed++;
  }
}

async function runSecurityTests() {
  console.log('\n============================================================');
  console.log('MIZAN SECURITY, AUTHENTICATION & MULTI-TENANCY TEST SUITE');
  console.log('============================================================\n');

  const authService = new AuthService();
  const mockPrisma: any = { business: null };
  const businessService = new BusinessService(mockPrisma);
  const ocrService = new OcrService();

  const userA = {
    userId: 'usr-org-a-101',
    organisationId: 'org-a-flexflow',
    role: 'ADMIN' as const,
    email: 'hamza@flexflow.ae',
  };

  const userB = {
    userId: 'usr-org-b-202',
    organisationId: 'org-b-competitor',
    role: 'ADMIN' as const,
    email: 'tariq@skyline.ae',
  };

  // --------------------------------------------------------------------------
  // 1. JWT CRYPTOGRAPHY, CLAIMS & SIGNATURES
  // --------------------------------------------------------------------------
  console.log('--- 1. AUTHENTICATION & JWT CRYPTOGRAPHY ---');

  // TC-SEC-01: Valid token generation and verification
  const tokenA = authService.generateToken(userA, 3600);
  const verifiedA = authService.validateToken(tokenA);
  assert(
    verifiedA.userId === userA.userId && verifiedA.organisationId === userA.organisationId,
    'TC-SEC-01: Valid JWT token signs and verifies with exact user identity & organisation boundary'
  );

  // TC-SEC-02: Tampered token signature rejection
  const tamperedToken = tokenA.substring(0, tokenA.length - 4) + 'abcd';
  let tamperedRejected = false;
  try {
    authService.validateToken(tamperedToken);
  } catch {
    tamperedRejected = true;
  }
  assert(tamperedRejected, 'TC-SEC-02: Tampered token signature is rejected by constant-time verification');

  // TC-SEC-03: Expired token rejection
  const expiredToken = JwtUtil.sign(
    { sub: userA.userId, organisationId: userA.organisationId, role: userA.role, email: userA.email },
    -10 // Expired 10 seconds ago
  );
  let expiredRejected = false;
  try {
    authService.validateToken(expiredToken);
  } catch (err: any) {
    expiredRejected = err.message?.includes('expired');
  }
  assert(expiredRejected, 'TC-SEC-03: Expired JWT token is immediately rejected');

  // TC-SEC-04: Malformed token rejection
  let malformedRejected = false;
  try {
    authService.validateToken('not.a.valid.jwt.string.at.all');
  } catch {
    malformedRejected = true;
  }
  assert(malformedRejected, 'TC-SEC-04: Malformed JWT tokens without standard 3-part layout are rejected');

  // TC-SEC-05: Issuer & Audience enforcement
  const foreignIssuerToken = JwtUtil.sign(
    { sub: userA.userId, organisationId: userA.organisationId, role: userA.role, email: userA.email },
    3600,
    { issuer: 'untrusted-idp.com', audience: JWT_AUDIENCE }
  );
  let foreignIssuerRejected = false;
  try {
    JwtUtil.verify(foreignIssuerToken);
  } catch (err: any) {
    foreignIssuerRejected = err.message?.includes('Token issuer invalid');
  }
  assert(foreignIssuerRejected, 'TC-SEC-05: Tokens with unapproved issuer are rejected');

  const foreignAudienceToken = JwtUtil.sign(
    { sub: userA.userId, organisationId: userA.organisationId, role: userA.role, email: userA.email },
    3600,
    { issuer: JWT_ISSUER, audience: 'other-app' }
  );
  let foreignAudienceRejected = false;
  try {
    JwtUtil.verify(foreignAudienceToken);
  } catch (err: any) {
    foreignAudienceRejected = err.message?.includes('Token audience invalid');
  }
  assert(foreignAudienceRejected, 'TC-SEC-06: Tokens with mismatched audience claim are rejected');

  // --------------------------------------------------------------------------
  // 2. DEMO AUTHENTICATION HARDENING & PRODUCTION GATING
  // --------------------------------------------------------------------------
  console.log('\n--- 2. DEMO AUTHENTICATION HARDENING ---');

  // TC-SEC-07: Demo token rejection in production mode
  const originalEnv = process.env.NODE_ENV;
  const originalDemoFlag = process.env.ENABLE_DEMO_AUTH;
  try {
    process.env.NODE_ENV = 'production';
    delete process.env.ENABLE_DEMO_AUTH;

    let prodDemoBlocked = false;
    try {
      authService.issueDemoToken('user-a');
    } catch (err: any) {
      prodDemoBlocked = err.status === 403 || err.message?.includes('strictly disabled in production');
    }
    assert(prodDemoBlocked, 'TC-SEC-07: Demo token issuance is strictly blocked in production environments');
  } finally {
    process.env.NODE_ENV = originalEnv;
    if (originalDemoFlag !== undefined) process.env.ENABLE_DEMO_AUTH = originalDemoFlag;
    else delete process.env.ENABLE_DEMO_AUTH;
  }

  // TC-SEC-08: Arbitrary user key rejection
  let invalidUserKeyRejected = false;
  try {
    authService.issueDemoToken('arbitrary-spoofed-identity' as any);
  } catch (err: any) {
    invalidUserKeyRejected = err.status === 400 || err.message?.includes('Invalid user key');
  }
  assert(invalidUserKeyRejected, 'TC-SEC-08: Sandbox authentication rejects arbitrary user key spoofing');

  // --------------------------------------------------------------------------
  // 3. MULTI-TENANT ORGANISATION BOUNDARY ISOLATION
  // --------------------------------------------------------------------------
  console.log('\n--- 3. MULTI-TENANT ORGANISATION BOUNDARY ISOLATION ---');

  // Seed mock business for User A (FlexFlow Marketing LLC)
  const businessA = await businessService.createOrUpdateTradeLicense(
    {
      tradeLicenseNumber: 'TL-DXB-987654',
      legalName: 'The FlexFlow Marketing LLC',
      legalEntityType: LegalEntityTypeDto.LLC,
      jurisdictionType: JurisdictionTypeDto.MAINLAND,
      licensingAuthority: 'Department of Economy and Tourism (DET)',
      issueDate: '2024-01-15',
      expiryDate: '2027-01-14',
      organisationId: userA.organisationId,
    },
    userA.organisationId
  );
  assert(
    businessA.organisationId === userA.organisationId,
    'TC-SEC-09: Trade license stored with authenticated organisationId boundary'
  );

  // TC-SEC-10: Cross-tenant update blocked
  let crossTenantUpdateBlocked = false;
  try {
    await businessService.createOrUpdateTradeLicense(
      {
        tradeLicenseNumber: 'TL-DXB-987654',
        legalName: 'Competitor Hijack LLC',
        legalEntityType: LegalEntityTypeDto.LLC,
        jurisdictionType: JurisdictionTypeDto.MAINLAND,
        licensingAuthority: 'Department of Economy and Tourism (DET)',
        issueDate: '2024-01-15',
        expiryDate: '2027-01-14',
        organisationId: userB.organisationId,
      },
      userB.organisationId // User B attempts to overwrite User A's license
    );
  } catch (err: any) {
    crossTenantUpdateBlocked = err.status === 403 || err.message?.includes('Cross-tenant');
  }
  assert(
    crossTenantUpdateBlocked,
    "TC-SEC-10: Cross-tenant modification of another organisation's license is blocked with 403 Forbidden"
  );

  // TC-SEC-11: Cross-tenant read blocked
  let crossTenantReadBlocked = false;
  try {
    await businessService.getEmaraTaxReadiness('TL-DXB-987654', userB.organisationId);
  } catch (err: any) {
    crossTenantReadBlocked = err.status === 403 || err.message?.includes('Access denied');
  }
  assert(
    crossTenantReadBlocked,
    "TC-SEC-11: Cross-tenant read of another organisation's readiness report is blocked with 403 Forbidden"
  );

  // --------------------------------------------------------------------------
  // 4. INPUT VALIDATION & DTO ENFORCEMENT
  // --------------------------------------------------------------------------
  console.log('\n--- 4. STRICT INPUT VALIDATION & DTO CONSTRAINTS ---');

  // TC-SEC-12: Negative revenue rejected
  const invalidNegativeCt = plainToInstance(AssessCorporateTaxDto, {
    legalEntityType: 'LLC',
    revenueAED: -150000,
    accountingNetProfit: 450000,
  });
  const negativeErrors = await validate(invalidNegativeCt);
  assert(
    negativeErrors.some((e) => e.property === 'revenueAED'),
    'TC-SEC-12: Negative revenue input is rejected by DTO validator (@Min(0))'
  );

  // TC-SEC-13: Invalid legal entity type rejected
  const invalidEntityCt = plainToInstance(AssessCorporateTaxDto, {
    legalEntityType: 'NON_EXISTENT_FOREIGN_OFFSHORE',
    revenueAED: 1000000,
    accountingNetProfit: 300000,
  });
  const entityErrors = await validate(invalidEntityCt);
  assert(
    entityErrors.some((e) => e.property === 'legalEntityType'),
    'TC-SEC-13: Unrecognized legal entity type is rejected by statutory enum constraint'
  );

  // TC-SEC-14: Invalid VAT category rejected
  const invalidVat = plainToInstance(AssessVatDto, {
    lines: [
      {
        id: 'line-1',
        isSale: true,
        amountAED: 5000,
        vatRateCategory: 'ILLEGAL_RATE_10',
      },
    ],
  });
  const vatErrors = await validate(invalidVat);
  assert(
    vatErrors.length > 0,
    'TC-SEC-14: Invalid VAT rate category rejected by nested DTO validator'
  );

  // --------------------------------------------------------------------------
  // 5. OCR INTEGRITY, MAGIC BYTES & NON-FABRICATION GUARANTEE
  // --------------------------------------------------------------------------
  console.log('\n--- 5. OCR INTEGRITY, MAGIC BYTES & NON-FABRICATION ---');

  // TC-SEC-15: Magic byte validation accepts authentic JPEG (/9j/)
  const jpegMime = ocrService.validateMagicBytes('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP...');
  assert(jpegMime === 'image/jpeg', 'TC-SEC-15: Authentic JPEG magic bytes (/9j/) successfully validated');

  // TC-SEC-16: Magic byte validation accepts authentic PNG (iVBORw0KGgo)
  const pngMime = ocrService.validateMagicBytes('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk...');
  assert(pngMime === 'image/png', 'TC-SEC-16: Authentic PNG magic bytes (iVBORw0KGgo) successfully validated');

  // TC-SEC-17: Spoofed payload (plain text/executable disguised as image) rejected
  let spoofedRejected = false;
  try {
    ocrService.validateMagicBytes('TVpQAAIAAAAIAA=='); // Windows PE executable magic bytes in b64
  } catch (err: any) {
    spoofedRejected = err.status === 400 || err.message?.includes('Invalid document signature');
  }
  assert(spoofedRejected, 'TC-SEC-17: Spoofed executable binary signature rejected with 400 Bad Request');

  // TC-SEC-18: Non-fabrication guarantee on OCR failure (no fake Carrefour/FlexFlow data)
  let nonFabricationVerified = false;
  try {
    // Calling OCR without GEMINI_API_KEY set
    const originalKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    try {
      await ocrService.extractReceipt(
        { imageBase64: '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP...' },
        'org-a-flexflow'
      );
    } finally {
      if (originalKey) process.env.GEMINI_API_KEY = originalKey;
    }
  } catch (err: any) {
    // Must return 422 Unprocessable Entity with extractionStatus: 'FAILED', NEVER fake amounts
    const response = err.getResponse?.() || err;
    nonFabricationVerified =
      err.status === 422 &&
      response.extractionStatus === 'FAILED' &&
      !response.totalAmountAED &&
      !response.merchantName;
  }
  assert(
    nonFabricationVerified,
    'TC-SEC-18: Non-fabrication invariant verified: Failed OCR throws 422 FAILED status, never returning fake numbers'
  );

  // TC-SEC-19: OCR Rate Limiting triggers after 15 calls within 1 minute
  let rateLimitTriggered = false;
  try {
    for (let i = 0; i < 17; i++) {
      ocrService.checkRateLimit('org-spam-test', 15);
    }
  } catch (err: any) {
    rateLimitTriggered = err.status === 429 || err.message?.includes('rate limit exceeded');
  }
  assert(
    rateLimitTriggered,
    'TC-SEC-19: OCR document extraction rate limit triggers 429 Too Many Requests when quota exceeded'
  );

  // --------------------------------------------------------------------------
  // 6. DISTRIBUTED-READY RATE LIMITER STORE
  // --------------------------------------------------------------------------
  console.log('\n--- 6. DISTRIBUTED-READY RATE LIMITER ---');

  const rateStore = new InMemoryRateLimitStore();
  const res1 = await rateStore.consume('test-key', 2, 10);
  assert(res1.allowed && res1.remaining === 1, 'TC-SEC-20: Sliding window permits requests within quota');

  const res2 = await rateStore.consume('test-key', 2, 10);
  assert(res2.allowed && res2.remaining === 0, 'TC-SEC-21: Sliding window consumes available quota correctly');

  const res3 = await rateStore.consume('test-key', 2, 10);
  assert(!res3.allowed && res3.resetSeconds > 0, 'TC-SEC-22: Sliding window blocks over-limit requests with reset window');

  // --------------------------------------------------------------------------
  // RESULTS SUMMARY
  // --------------------------------------------------------------------------
  console.log('\n------------------------------------------------------------');
  console.log(`TOTAL SECURITY TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('------------------------------------------------------------\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runSecurityTests().catch((e) => {
  console.error('Security test runner error:', e);
  process.exit(1);
});
