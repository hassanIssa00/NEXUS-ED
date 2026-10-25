import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const baseUrl = (
  process.env.API_SMOKE_URL || 'http://127.0.0.1:4000/api'
).replace(/\/$/, '');
const prisma = new PrismaClient();
const runId = randomUUID();
const studentEmail = `student-${runId}@example.invalid`;
const parentEmail = `parent-${runId}@example.invalid`;
const password = 'CI-only-Password-93!';
const schoolSlug = process.env.PUBLIC_SCHOOL_SLUG || 'al-ikhlas-jeddah';
const roles = ['STUDENT', 'PARENT'];

async function request(path, options = {}) {
  return fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { 'content-type': 'application/json', ...options.headers },
  });
}

function refreshCookie(response) {
  const value = response.headers
    .getSetCookie()
    .find((cookie) => cookie.startsWith('refresh_token='));
  assert.ok(value, 'auth response must set an HttpOnly refresh cookie');
  assert.match(value, /HttpOnly/i);
  assert.match(value, /Secure/i);
  assert.match(value, /SameSite=None/i);
  return value.split(';', 1)[0];
}

async function assertOk(response, label) {
  const body = await response.json().catch(() => null);
  assert.equal(
    response.ok,
    true,
    `${label} failed (${response.status}): ${JSON.stringify(body)}`,
  );
  return body;
}

try {
  const school = await prisma.school.findUnique({ where: { slug: schoolSlug } });
  assert.ok(school?.isActive, `seeded active school ${schoolSlug} must exist`);

  const passwordHash = await bcrypt.hash(password, 10);
  const accounts = [
    [studentEmail, roles[0]],
    [parentEmail, roles[1]],
  ];

  for (const [email, role] of accounts) {
    await prisma.user.create({
      data: {
        email,
        password: passwordHash,
        role,
        name: `CI ${role}`,
        schoolId: school.id,
        emailVerified: true,
      },
    });

    const directRegistration = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, role, name: `CI ${role}` }),
    });
    assert.equal(
      directRegistration.status,
      403,
      `${role} password-only registration must be rejected in favor of verified Firebase onboarding`,
    );

    const login = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    const authenticated = await assertOk(login, `${role} login`);
    assert.ok(authenticated.access_token);
    assert.equal(authenticated.user.role, role);
    let cookie = refreshCookie(login);

    const profile = await request('/auth/profile', {
      headers: { authorization: `Bearer ${authenticated.access_token}` },
    });
    const profileData = await assertOk(profile, `${role} profile`);
    assert.equal(profileData.email, email);
    assert.equal(profileData.role, role);

    const refresh = await request('/auth/refresh', {
      method: 'POST',
      headers: { cookie },
    });
    const refreshed = await assertOk(refresh, `${role} refresh`);
    assert.ok(refreshed.access_token);
    const rotatedCookie = refreshCookie(refresh);

    const staleRefresh = await request('/auth/refresh', {
      method: 'POST',
      headers: { cookie },
    });
    assert.equal(
      staleRefresh.status,
      401,
      'rotated refresh token must be rejected',
    );

    const logout = await request('/auth/logout', {
      method: 'POST',
      headers: { cookie: rotatedCookie },
    });
    await assertOk(logout, `${role} logout`);

    const revokedRefresh = await request('/auth/refresh', {
      method: 'POST',
      headers: { cookie: rotatedCookie },
    });
    assert.equal(
      revokedRefresh.status,
      401,
      'logged-out refresh token must be rejected',
    );
  }

  console.log(
    'Password-only student and parent registration is blocked; verified accounts passed login, profile, refresh rotation, and logout.',
  );
} finally {
  await prisma.user.deleteMany({
    where: { email: { in: [studentEmail, parentEmail] } },
  });
  await prisma.$disconnect();
}
