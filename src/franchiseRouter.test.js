const request = require('supertest');
const app = require('./service');

const testUser = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };
let testUserAuthToken;
let testAdminUserAuthToken;
let testAdminUserId;
let testFranchiseId;
let testStoreId;

const { Role, DB } = require('./database/database.js');

async function createAdminUser() {
  let user = { password: 'toomanysecrets', roles: [{ role: Role.Admin }] };
  user.name = randomName();
  user.email = user.name + '@admin.com';

  await DB.addUser(user);
  user.password = 'toomanysecrets';

  return user;
}

function randomName() {
  return Math.random().toString(36).substring(2, 12);
}

function expectValidJwt(potentialJwt) {
  expect(potentialJwt).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/);
}

//franchise tests
beforeAll(async () => {
  //register a user to use for testing
  let adminUser = await createAdminUser();

  testUser.email = Math.random().toString(36).substring(2, 12) + '@test.com';
  const registerRes = await request(app).post('/api/auth').send(testUser);
  expect(registerRes.status).toBe(200);
  const loginRes = await request(app).put('/api/auth').send(testUser);

  testUserAuthToken = loginRes.body.token;
  expectValidJwt(testUserAuthToken);

  const loginAdminRes = await request(app).put('/api/auth').send(adminUser);

  testAdminUserAuthToken = loginAdminRes.body.token;
  
  expectValidJwt(testAdminUserAuthToken);

  testAdminUserId = loginAdminRes.body.user.id;

  let testFranchise = { name: randomName(), admins: [{ email: adminUser.email }]};

  //create franchise in db associated with test user
  const createFranchiseRes = await request(app)
    .post('/api/franchise')
    .set('Authorization', `Bearer ${testAdminUserAuthToken}`)
    .send(testFranchise);
  
  expect(createFranchiseRes.status).toBe(200);
  testFranchiseId = createFranchiseRes.body.id;
}); 

// test to get an authenticated admin user
test('get authenticated user', async () => {
    const getAuthUserRes = await request(app)
    .get('/api/user/me')
    .set('Authorization', `Bearer ${testAdminUserAuthToken}`);
    expect(getAuthUserRes.status).toBe(200);
    expect(getAuthUserRes.body).toHaveProperty('roles');
});

// test functionality for getting ALL franchises
test('get all franchises', async () => {
    const getFranchisesRes = await request(app)
    .get('/api/franchise?page=0&limit=10&name=*');
    expect(getFranchisesRes.status).toBe(200); 
    expect(getFranchisesRes.body).toHaveProperty('franchises');
});

// test improper franchise creation error handling
test('create franchise bad', async () => {
    const testBadUser2 = { name: randomName(), email: 'blarg@test.com', password: 'fish' }; 
    const registerBadRes = await request(app).post('/api/auth').send(testBadUser2);
    let testBadUserAuthToken = registerBadRes.body.token;
    testBadUser2.id = registerBadRes.body.user.id;
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

// test create store functionality
test('create store', async () => {
    let testStore = {franchiseId: testFranchiseId, name: randomName()};
    const createStoreRes = await request(app)
    .post(`/api/franchise/${testFranchiseId}/store`)
    .set('Authorization', `Bearer ${testAdminUserAuthToken}`)
    .send(testStore);
    testStoreId = createStoreRes.body.id;
    expect(createStoreRes.status).toBe(200);
    expect(createStoreRes.body).toHaveProperty('name');
});

// test improper store creation error handling
test('create store bad', async () => {
    const testStoreBad = {franchiseId: testFranchiseId, name: randomName()};
    const createStoreResBad = await request(app)
    .post(`/api/franchise/${testFranchiseId}/store`)
    .set('Authorization', `Bearer ${testUserAuthToken}`)
    .send(testStoreBad);
    expect(createStoreResBad.status).not.toBe(200);
    expect(createStoreResBad.status).toBe(403);
    expect(createStoreResBad.body.message).toBe('unable to create a store');

});

// test functionality for getting franchises for a particular user
test('get user franchises', async () => {
    const getUserFranchisesRes = await request(app)
    .get(`/api/franchise/${testAdminUserId}`)
    .set('Authorization', `Bearer ${testAdminUserAuthToken}`);
    expect(getUserFranchisesRes.status).toBe(200); 
    expect(getUserFranchisesRes.body[0]).toHaveProperty('name');
});

// test order creation functionality
test('create order', async () => {
    let testOrder = {franchiseId: 1, storeId: 1, items:[{ menuId: 1, description: "Veggie", price: 0.0038 }]};
    const testAddOrderRes = await request(app)
    .post('/api/order')
    .set('Authorization', `Bearer ${testAdminUserAuthToken}`)
    .send(testOrder);
    console.log(testAddOrderRes.body);
    expect(testAddOrderRes.status).toBe(200);
});

// test functionality for getting a user's order
test('get user order', async () => {
    const testGetOrderRes = await request(app)
    .get('/api/order')
    .set('Authorization', `Bearer ${testAdminUserAuthToken}`);
    expect(testGetOrderRes.status).toBe(200);
    expect(testGetOrderRes.body).toHaveProperty('dinerId');
});

// test delete store functionality
test('delete store', async () => {
    const deleteStoreRes = await request(app)
    .delete(`/api/franchise/:${testFranchiseId}/store/${testStoreId}`)
    .set('Authorization', `Bearer ${testAdminUserAuthToken}`);
    expect(deleteStoreRes.status).toBe(200);
    expect(deleteStoreRes.body.message).toBe('store deleted');
});

// test delete franchise functionality
test('delete franchise', async () => {
    
    const deleteFranchiseRes = await request(app)
    .delete(`/api/franchise/${testFranchiseId}`)
    .set('Authorization', `Bearer ${testAdminUserAuthToken}`);
    expect(deleteFranchiseRes.status).toBe(200);
    expect(deleteFranchiseRes.body.message).toBe('franchise deleted');
});

// test error handling for improper deletion of a store
test('delete store bad', async () => {
    const deleteStoreResBad = await request(app)
    .delete(`/api/franchise/${testFranchiseId}/store/${testStoreId}`)
    .set('Authorization', `Bearer ${testUserAuthToken}`);
    expect(deleteStoreResBad.status).not.toBe(200);
    expect(deleteStoreResBad.status).toBe(403);
    expect(deleteStoreResBad.body.message).toBe('unable to delete a store');
});

// note: I am aware that I combined both franchiseRouter and orderRouter
// functionality here. However, given the fact that both are very intertwined
// and require similar fields (storeId, franchiseId, admin authtoken, etc.),
// I felt like it was simpler to combine the two into one test file.
// May separate it out later on, for the sake of single responsibility principle. 
