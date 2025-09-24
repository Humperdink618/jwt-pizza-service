const request = require('supertest');
const app = require('./service');

const testUser = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };
let testUserAuthToken;

const { Role, DB } = require('./database/database.js');

async function createAdminUser() {
  let user = { password: 'toomanysecrets', roles: [{ role: Role.Admin }] };
  user.name = randomName();
  user.email = user.name + '@admin.com';

  user = await DB.addUser(user);
  return { ...user, password: 'toomanysecrets' };
}

async function createFranchiseeUser() {
  let user = { password: 'toomanysecrets', roles: [{ role: Role.Franchisee }] };
  user.name = randomName();
  user.email = user.name + '@franchisee.com';

  user = await DB.addUser(user);
  return { ...user, password: 'toomanysecrets' };
}

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

// test logout functionality
test('logout user', async () => {
    const logoutRes = await request(app).delete('/api/auth/').set('Authorization', `Bearer ${testUserAuthToken}`);
    expect(logoutRes.status).toBe(200);
    expect(logoutRes.body.message).toBe('logout successful');
});

test('bad register', async () => {
  const testBadUser = { name: randomName(), email: 'reg@test.com'};
  const registerResBad = await request(app).post('/api/auth').send(testBadUser);
  expect(registerResBad.status).not.toBe(200);
  expect(registerResBad.status).toBe(400);
  expect(registerResBad.body.message).toBe('name, email, and password are required');
});

test('unauthorized createFranchise', async () => {
  const createFranchiseResBad = await request(app).post('/api/franchise').send(testUser);
  expect(createFranchiseResBad.status).not.toBe(200);
  expect(createFranchiseResBad.status).toBe(401);
  expect(createFranchiseResBad.body.message).toBe('unauthorized');
});

// test('createFranchise', async () => {
//   const testAdminUser = createAdminUser();
//   const registerRes = await request(app).post('/api/auth').send(testAdminUser);
//   testUserAuthToken = registerRes.body.token;
//   expectValidJwt(testUserAuthToken);
//   const testFranchise = { name: 'pizzaPlace', admins: [{email: testAdminUser.email}]};
//   const createFranchiseRes = await (await request(app).post('/api/franchise').set('Authorization', `Bearer ${testUserAuthToken}`).send(testFranchise));
//   expect(createFranchiseRes.status).toBe(200);
//   // expect(createFranchiseResBad.status).not.toBe(200);
//   // expect(createFranchiseResBad.status).toBe(401);
//   // expect(createFranchiseResBad.body.message).toBe('unauthorized');
// });





// unauthorized 401 should result if a normal user does something that only
// an admin can do

// put this function inside of a testing function if you feel like you need more time

// if (process.env.VSCODE_INSPECTOR_OPTIONS) {
//   jest.setTimeout(60 * 1000 * 5); // 5 minutes
// }
