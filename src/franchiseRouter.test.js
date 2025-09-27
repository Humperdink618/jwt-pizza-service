const request = require('supertest');
const app = require('./service');

const testAdminUser = { name: 'pizza admin', email: 'admin@test.com', password: 'a' };
let testAdminUserAuthToken;
// let testAdminUserId;
let testFranchiseId;
let testFranchise = { name: 'pizzaPlace', admins: [{ email: 'chuckles@test.com'}]};
let testStore = {franchiseId: 1, name:"NYC"};
// admin@test.com
// const testFranchise = { name: 'pizzaPocket', admins: [{ email: 'admin@test.com', id: 4, name: 'pizza franchisee' }], id: 1 };
// const testStore = { id: 1, name: 'SLC', totalRevenue: 0 };
// const testOrder = { title:"Muddy Hobo", description: "No topping, no sauce, just carbs", image:"pizza9.png", price: 0.0001 };

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
  let user = await createAdminUser(testAdminUser.email);
//   console.log(user);
//   let adminUser = {name: user.name, email: user.email, password: user.password};
//   const loginAdminRes = await request(app).put('/api/auth').send(user);
  registerAdminRes = await request(app).post('/api/auth').send(user);
//   console.log(registerAdminRes.body);
//   loginAdminRes = await request(app).put('/api/auth').send(adminUser);
//   console.log(loginAdminRes.body.token);

  testAdminUserAuthToken = registerAdminRes.body.token;
//   console.log(testAdminUserAuthToken);
//   testAdminUserId = loginAdminRes.body.user.id;
//   const testStore = { id: 1, name: 'SLC', totalRevenue: 0 };
  
  testFranchise.admins[0].email = testAdminUser.email;
//   console.log(testFranchise);
//   console.log(testFranchise.admins.email);
//   console.log(loginAdminRes.body);
//   loginAdminRes.body.user.roles.push({ role: Role.Admin });
//   console.log(loginAdminRes.body.roles[0])
//   console.log(loginAdminRes.body);
//   console.log(testAdminUserAuthToken);
//   console.log(testFranchise);

  //create franchise in db associated with test user
   createFranchiseRes = await request(app)
    .post('/api/franchise')
    .set('Authorization', `Bearer ${testAdminUserAuthToken}`)
    .send(testFranchise);
//   expect(createFranchiseRes.status).toBe(200);
//   console.log(createFranchiseRes.body);
  testFranchiseId = createFranchiseRes.body.id;
  testStore.franchiseId = testFranchiseId;
//   console.log(testFranchiseId);
//   console.log(testStore.franchiseId);
//   console.log(loginAdminRes.body.user.roles);
}); 

test('get authenticated user', async () => {
    const getAuthUserRes = await request(app)
    .get('/api/user/me')
    .set('Authorization', `Bearer ${testAdminUserAuthToken}`);
    // console.log(getAuthUserRes.body);
    expect(getAuthUserRes.status).toBe(200);

});

test('get all franchises', async () => {
    const getFranchisesRes = await request(app)
    .get('/api/franchise?page=0&limit=10&name=*');
    // console.log(getFranchisesRes.body);
    expect(getFranchisesRes.status).toBe(200); 
    expect(getFranchisesRes.body).toHaveProperty('franchises');
    // expect(getFranchisesRes)
});

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

// still working on this one
test('get user franchises', async () => {
    const getUserFranchisesRes = await request(app)
    .get('/api/franchise/:userId')
    .set('Authorization', `Bearer ${testAdminUserAuthToken}`);
    // console.log(getUserFranchisesRes.body);
    expect(getUserFranchisesRes.status).toBe(200); 
    // expect(getUserFranchisesRes.body).toHaveProperty('name');
    // expect(getFranchisesRes)
});

test('create store bad', async () => {
     const testStoreBad = {franchiseId: testAdminUser.id, name:"Toledo"};
     const createStoreResBad = await request(app)
    .post('/api/franchise/:franchiseId/store')
    .set('Authorization', `Bearer ${testAdminUserAuthToken}`)
    .send(testStoreBad);
    expect(createStoreResBad.status).not.toBe(200);
    expect(createStoreResBad.status).toBe(403);
    expect(createStoreResBad.body.message).toBe('unable to create a store');
    // console.log(createStoreRes.body.message);
//     expect(createStoreRes.status).toBe(200);
});

test('update user', async () => {
    // const testBadAuth = 'nanu nanu';
    // const testBadUser3 = { name: randomName(), email: 'blarg@test.com', password: 'fish' }; 
    const updateUserResBad = await request(app)
    .put('/api/user/:userId')
    .set('Authorization', `Bearer ${testAdminUserAuthToken}`)
    .send(testAdminUser);
    expect(updateUserResBad.status).not.toBe(200);
    expect(updateUserResBad.status).toBe(403);
    expect(updateUserResBad.body.message).toBe('unauthorized');
    // console.log(createStoreRes.body.message);
//     expect(createStoreRes.status).toBe(200);
});

// test('create store', async () => {
//     const createStoreRes = await request(app)
//     .post('/api/franchise/:franchiseId/store')
//     .set('Authorization', `Bearer ${testAdminUserAuthToken}`)
//     .send(testStore);
//     // console.log(createStoreRes.body.message);
//     expect(createStoreRes.status).toBe(200);
// });

// test('add an item to the menu', async () => {
//     testAddOrderRes = await request(app)
//     .put('/api/order/menu')
//     .set('Authorization', `Bearer ${testUserAuthToken}`)
//     .send(testOrder);

//     expect(testAddOrderRes.status).toBe(200);
// });

// test('delete store', async () => {
//     deleteStoreRes = await request(app)
//     .delete(`/api/franchise/:${testFranchiseId}/store/:storeId`)
//     .set('Authorization', `Bearer ${testUserAuthToken}`);
//     expect(deleteStoreRes.status).toBe(200);
//     expect(deleteStoreRes.body.message).toBe('store deleted');
// });

test('delete franchise', async () => {
    
    const deleteFranchiseRes = await request(app)
    .delete('/api/franchise/:franchiseId')
    .set('Authorization', `Bearer ${testAdminUserAuthToken}`);
    expect(deleteFranchiseRes.status).toBe(200);
    expect(deleteFranchiseRes.body.message).toBe('franchise deleted');
});

test('delete store bad', async () => {
    // const badAuthToken = 'nanu nanu';
    const deleteStoreResBad = await request(app)
    .delete('/api/franchise/:franchiseId/store/:storeId')
    .set('Authorization', `Bearer ${testAdminUserAuthToken}`);
    expect(deleteStoreResBad.status).not.toBe(200);
    expect(deleteStoreResBad.status).toBe(403);
    expect(deleteStoreResBad.body.message).toBe('unable to delete a store');
});

// test('create new user franchise', async () => {
//     testNewFranchise = { name: 'pizzaPhile', admins: [{ email: 'admin@test.com', id: 4, name: 'pizza franchisee' }], id: 1 };
//     createUserFranchiseRes = await request(app)
//     .post('/api/franchise')
//     .set('Authorization', `Bearer ${testUserAdminAuthToken}`)
//     .send(testNewFranchise);
//     console.log(createUserFranchiseRes.message)
//     expect(createUserFranchiseRes.status).toBe(200); 
// })




// test('get user franchises', async () => {
//     getUserFranchisesRes = await request(app)
//     .get('/api/franchise/:userId')
//     .set('Authorization', `Bearer ${testUserAdminAuthToken}`);
//     console.log(getUserFranchisesRes.body);
//     expect(getUserFranchisesRes.status).toBe(200); 
//     // expect(getUserFranchisesRes.body).toHaveProperty('name');
//     // expect(getFranchisesRes)
// });

