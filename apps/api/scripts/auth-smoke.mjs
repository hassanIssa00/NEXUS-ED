import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';

const baseUrl = (
  process.env.API_SMOKE_URL || 'http://127.0.0.1:4000/api'
).replace(/\/$/, '');
const prisma = new PrismaClient();
const runId = randomUUID();
const schoolSlug = `ci-auth-${runId}`;
const studentEmail = `student-${runId}@example.invalid`;
const parentEmail = `parent-${runId}@example.invalid`;
const password = 'CI-only-Password-93!';

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
  const school = await prisma.school.create({
    data: { name: 'Nexus CI Auth Smoke', slug: schoolSlug },
  });

  for (const [email, role] of [
    [studentEmail, 'STUDENT'],
    [parentEmail, 'PARENT'],
  ]) {
    const registration = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, role, name: `CI ${role}` }),
    });
    const registered = await assertOk(registration, `${role} registration`);
    assert.equal(registered.role, role);
    assert.equal(registered.schoolId, school.id);
    assert.equal(Object.hasOwn(registered, 'password'), false);

    const duplicate = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, role }),
    });
    assert.equal(
      duplicate.status,
      409,
      `${role} duplicate registration must conflict`,
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
    'Student and parent registration, login, profile, refresh rotation, and logout passed.',
  );
} finally {
  await prisma.user.deleteMany({
    where: { email: { in: [studentEmail, parentEmail] } },
  });
  await prisma.school.deleteMany({ where: { slug: schoolSlug } });
  await prisma.$disconnect();
}
