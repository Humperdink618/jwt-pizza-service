const request = require('supertest');
const app = require('./service');

const testUser = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };
let testUserAuthToken;

const { Role, DB } = require('./database/database.js');

// async function createAdminUser() {
//   let user = { password: 'toomanysecrets', roles: [{ role: Role.Admin }] };
//   user.name = randomName();
//   user.email = user.name + '@admin.com';

//   user = await DB.addUser(user);
//   return { ...user, password: 'toomanysecrets' };
// }

// async function createFranchiseeUser() {
//   let user = { password: 'toomanysecrets', roles: [{ role: Role.Franchisee }] };
//   user.name = randomName();
//   user.email = user.name + '@franchisee.com';

//   user = await DB.addUser(user);
//   return { ...user, password: 'toomanysecrets' };
// }

function randomName() {
  return Math.random().toString(36).substring(2, 12);
}

beforeAll(async () => {
  testUser.email = Math.random().toString(36).substring(2, 12) + '@test.com';
  const registerRes = await request(app).post('/api/auth').send(testUser);
  testUserAuthToken = registerRes.body.token;
  expectValidJwt(testUserAuthToken);
});

test('login', async () => {
  const loginRes = await request(app).put('/api/auth').send(testUser);
  expect(loginRes.status).toBe(200);
  expectValidJwt(loginRes.body.token);

  const expectedUser = { ...testUser, roles: [{ role: 'diner' }] };
  delete expectedUser.password;
  expect(loginRes.body.user).toMatchObject(expectedUser);
});

function expectValidJwt(potentialJwt) {
  expect(potentialJwt).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/);
}

test('unauthorized login', async () => {
  const testUnauthorizedUser = { name: randomName(), email: 'reg@test.com', password: 'g' };
  const loginResBad = await request(app).put('/api/auth').send(testUnauthorizedUser);
  expect(loginResBad.status).not.toBe(200);
});

// unauthorized 401 should result if a normal user does something that only
// an admin can do

// put this function inside of a testing function if you feel like you need more time

// if (process.env.VSCODE_INSPECTOR_OPTIONS) {
//   jest.setTimeout(60 * 1000 * 5); // 5 minutes
// }