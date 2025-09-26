const request = require('supertest');
const app = require('./service');

const testUserAdmin = { name: 'pizza admin', email: 'admin@test.com', password: 'a' };
let testUserAdminAuthToken;

const testFranchise = { name: 'pizzaPocket', admins: [{ email: 'admin@test.com', id: 4, name: 'pizza franchisee' }], id: 1 };
const testStore = { id: 1, name: 'SLC', totalRevenue: 0 };

const { Role, DB } = require('./database/database.js');

async function createAdminUser(email) {
  let user = { password: 'toomanysecrets', roles: [{ role: Role.Admin }] };
  user.name = "admin";
  user.email = email;

  await DB.addUser(user);
  user.password = 'toomanysecrets';

  return user;
}

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

function expectValidJwt(potentialJwt) {
  expect(potentialJwt).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/);
}

//franchise tests
beforeAll(async () => {
  //register a user to use for testing
  let user = await createAdminUser(testUserAdmin.email);
  const loginRes = await request(app).put('/api/auth').send(user);

  testUserAdminAuthToken = loginRes.body.token;
  testUserAdminId = loginRes.body.user.id;

  //create franchise in db associated with test user
  createFranchiseRes = await request(app)
    .post('/api/franchise')
    .set('Authorization', `Bearer ${testUserAdminAuthToken}`)
    .send(testFranchise);

  testFranchiseId = createFranchiseRes.body.id;
  testStore.franchiseId = testFranchiseId;
}); 

test('get all franchises', async () => {
    getFranchisesRes = await request(app)
    .get('/api/franchise?page=0&limit=10&name=*');
    // console.log(getFranchisesRes.body);
    expect(getFranchisesRes.status).toBe(200); 
    expect(getFranchisesRes.body).toHaveProperty('franchises');
    // expect(getFranchisesRes)
});

test('create franchise bad', async () => {
    const testBadUser = { name: randomName(), email: 'blarg@test.com', password: 'fish' }; 
    const registerBadRes = await request(app).post('/api/auth').send(testBadUser);
    testBadUserAuthToken = registerBadRes.body.token;
    testBadUser.id = registerBadRes.body.user.id;
    expectValidJwt(testBadUserAuthToken);

    const testBadFranchise = { name: 'pizzaPalooza', admins: [{ email: 'blarg@test.com'}]};

    const createFranchiseResBad = await request(app)
    .post('/api/franchise')
    .set('Authorization', `Bearer ${testBadUserAuthToken}`)
    .send(testBadFranchise);
    expect(createFranchiseResBad.status).not.toBe(200);
    expect(createFranchiseResBad.status).toBe(403);
    expect(createFranchiseResBad.body.message).toBe('unable to create a franchise');
});

test('delete franchise', async () => {
    
    const deleteFranchiseRes = await request(app)
    .delete('/api/franchise/:franchiseId')
    .set('Authorization', `Bearer ${testUserAdminAuthToken}`);
    expect(deleteFranchiseRes.status).toBe(200);
    expect(deleteFranchiseRes.body.message).toBe('franchise deleted');
});




// test('get user franchises', async () => {
//     getUserFranchisesRes = await request(app)
//     .get('/api/franchise/:userId')
//     .set('Authorization', `Bearer ${testUserAuthToken}`);
//     console.log(getUserFranchisesRes.body);
//     expect(getUserFranchisesRes.status).toBe(200); 
//     // expect(getUserFranchisesRes.body).toHaveProperty('name');
//     // expect(getFranchisesRes)
// });

