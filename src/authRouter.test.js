const request = require('supertest');
const app = require('./service');

const testUser = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };
let testUserAuthToken;
let testUserId;
let testUserRegId;

const { DB } = require('./database/database.js');
// may need to find a way to refresh and restart the database and then mock it out.

function randomName() {
  return Math.random().toString(36).substring(2, 12);
}

beforeAll(async () => {
  testUser.email = Math.random().toString(36).substring(2, 12) + '@test.com';
  const registerRes = await request(app).post('/api/auth').send(testUser);
  testUserAuthToken = registerRes.body.token;
  testUser.id = registerRes.body.user.id;
  testUserRegId = registerRes.body.user.id;
  expectValidJwt(testUserAuthToken);

  const loginRes = await request(app).put('/api/auth').send(testUser);
  expect(loginRes.status).toBe(200);
  console.log("wassup!");
});

// test login functionality
test('login', async () => {
  const loginRes = await request(app).put('/api/auth').send(testUser);
  expect(loginRes.status).toBe(200);
  expectValidJwt(loginRes.body.token);
  testUserId = loginRes.body.user.id;
  const expectedUser = { ...testUser, roles: [{ role: 'diner' }] };
  delete expectedUser.password;
  expect(loginRes.body.user).toMatchObject(expectedUser);
});

// tests for valid syntax for authToken
function expectValidJwt(potentialJwt) {
  expect(potentialJwt).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/);
}

// test unauthorized login error handling
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

// test error handling for improper register
test('bad register', async () => {
  const testBadUser = { name: randomName(), email: 'reg@test.com'};
  const registerResBad = await request(app).post('/api/auth').send(testBadUser);
  expect(registerResBad.status).not.toBe(200);
  expect(registerResBad.status).toBe(400);
  expect(registerResBad.body.message).toBe('name, email, and password are required');
});

// test get menu functionality
test('get menu', async () => {
  const loginRes = await request(app).put('/api/auth').send(testUser);
  expect(loginRes.status).toBe(200);
  expectValidJwt(loginRes.body.token);

  const expectedUser = { ...testUser, roles: [{ role: 'diner' }] };
  delete expectedUser.password;
  expect(loginRes.body.user).toMatchObject(expectedUser);

  const getMenuRes = await request(app).get('/api/order/menu/');
  expect(getMenuRes.status).toBe(200);
  expect(getMenuRes.body).toBeInstanceOf(Array);
  // expect(getMenuRes.body[0]).toHaveProperty('image');
  // expect(getMenuRes.body[0].image).toBe('pizza1.png');

});

// test('list users', async () => {
//   const listUsersRes = await request(app).get('/api/user');
//   expect(listUsersRes.status).toBe(200);
// });

// tests unauthorized list users functionality
test('list users unauthorized', async () => {
  const listUsersRes = await request(app).get('/api/user');
  expect(listUsersRes.status).toBe(401);
});


// test list users functionality
test('list users', async () => {
  const [user, userToken] = await registerUser(request(app));
  const listUsersRes = await request(app)
    .get('/api/user?page=1&limit=10&name=*')
    .set('Authorization', 'Bearer ' + userToken);
  expect(listUsersRes.status).toBe(200);
  expect(listUsersRes.body).toHaveProperty('users');
  await request(app)
        .delete(`/api/auth/`)
        .set('Authorization', `Bearer ${userToken}`);
  await DB.deleteUserRole(user.id);
  await DB.deleteUser(user.id);
});

// general registerUser function for handling list users
async function registerUser(service) {
  const testUser = {
    name: 'pizza diner',
    email: `${randomName()}@test.com`,
    password: 'a',
  };
  const registerRes = await service.post('/api/auth').send(testUser);
  registerRes.body.user.password = testUser.password;
  const testRegUser1 = registerRes.body.user;
  const testRegUser1AuthToken = registerRes.body.token;
  // return [registerRes.body.user, registerRes.body.token];
  return [testRegUser1, testRegUser1AuthToken];
}

// cleanup
afterAll(async () => {
    await request(app)
        .delete(`/api/auth/`)
        .set('Authorization', `Bearer ${testUserAuthToken}`);
    await DB.deleteUserRole(testUserId);
    await DB.deleteUser(testUserId);
    await DB.deleteUserRole(testUserRegId);
    await DB.deleteUser(testUserRegId);
});

// notes:

// unauthorized 401 should result if a normal user does something that only
// an admin can do

// put this function inside of a testing function if you feel like you need more time

// if (process.env.VSCODE_INSPECTOR_OPTIONS) {
//   jest.setTimeout(60 * 1000 * 5); // 5 minutes
// }

// unused idea. May use later

// async function createFranchiseeUser() {
//   let user = { password: 'toomanysecrets', roles: [{ role: Role.Franchisee }] };
//   user.name = randomName();
//   user.email = user.name + '@franchisee.com';

//   user = await DB.addUser(user);
//   return { ...user, password: 'toomanysecrets' };
// }
