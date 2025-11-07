const config = require('./config');

// Metrics stored in memory
const requests = {};
let greetingChangedCount = 0;
let successfulPizzaPurchaseCount = 0;
let pizzaPurchaseLatencyTimer = 0;
let pizzaPurchaseFailureCount = 0;
let serviceLatencyTimer = 0;
let revenueCount = 0;
let authSuccessCount = 0;
let authFailureCount = 0;
let activeUserCount = 0;
const activeUsers = new Map();
// let isLoggedOut = false;

// Function to track when the greeting is changed
function greetingChanged() {
  greetingChangedCount++;
}

// Function to track the number of pizzas successfully purchased
function pizzaPurchaseSuccess() {
  successfulPizzaPurchaseCount++;
}

// Function to track the number of pizzas unsuccessfully purchased
function pizzaPurchaseFailure() {
  pizzaPurchaseFailureCount++;
}

// Function to track the total revenue per order
function pizzaPurchaseRevenue(total) {
  revenueCount += total;
}

// Function to track the number of successful authentication attempts
function authSuccess() {
  authSuccessCount++;
}

// Function to track the number of unsuccessful authentication attempts
function authFailure() {
  authFailureCount++;
}

// Function to track the number of active users
function setActiveUsers(token) {
  activeUsers.set(token, Date.now());
}

// function loggedOutActiveUser() {
//   isLoggedOut = true
// }
function userLoggedOut(token) {
  activeUsers.delete(token);
  activeUserCount--;
}

// NOTE: still WIP. Talk with TAs to see if I am even doing this right.
function getActiveUsers() {
  const currentTime = Date.now();
  const fiveMinAgo = currentTime - (5 * 60 * 1000);

  for (const [token, timestamp] of activeUsers.entries()) {
    if (timestamp > fiveMinAgo) {
      activeUserCount++;
    } else {
      activeUsers.delete(token);
      activeUserCount--;
    }
  }
}

function pizzaLatency(startTime, endTime) {
  pizzaPurchaseLatencyTimer = endTime - startTime;
}

function serviceLatency(startTime, endTime) {
  serviceLatencyTimer = endTime - startTime;
}

// Middleware to track requests
function requestTracker(req, res, next) {
  // const startTime = performance.now();
  // mark the start of the request processing
  // performance.mark('requestStart');
  const startTime = performance.now();
  const endpoint = `[${req.method}] ${req.path}`;
  requests[endpoint] = (requests[endpoint] || 0) + 1;
  res.on("finish", () => {
    // look up syntax for how to do this
    // mark the end of the response processing
    // performance.mark('requestEnd');
    const endTime = performance.now();

    // measure the duration between the start and end marks
    // performance.measure('requestLatency', 'requestStart', 'requestEnd');
    serviceLatency(startTime, endTime);

    // get the measurement entry
    // const latencyMeasurement = performance.getEntriesByName('requestLatency')[0];

    // store the latency
    // serviceLatencyTimer = latencyMeasurement.duration;

    // clear the marks and measures to prevent memory leaks in long-running applications
    // performance.clearMarks('requestStart');
    // performance.clearMarks('requestEnd');
    // performance.clearMeasures('requestLatency');

  });
  next();
}

// This will periodically send metrics to Grafana
setInterval(() => {
  const metrics = [];
  let cpuUsageNum = getCpuUsagePercentage();
  let memoryUsageNum = parseInt(getMemoryUsagePercentage());
  getActiveUsers();
  // console.log(activeUserCount);
  Object.keys(requests).forEach((endpoint) => {
    metrics.push(createMetric('requests', requests[endpoint], '1', 'sum', 'asInt', { endpoint }));
    metrics.push(createMetric('greetingChange', greetingChangedCount, '1', 'sum', 'asInt', {}));
    metrics.push(createMetric('pizzaPurchaseSuccess', successfulPizzaPurchaseCount, '1', 'sum', 'asInt', {}));
    metrics.push(createMetric('pizzaPurchaseFailure', pizzaPurchaseFailureCount, '1', 'sum', 'asInt', {}));
    metrics.push(createMetric('pizzaPurchaseLatency', pizzaPurchaseLatencyTimer, 'ms', 'gauge', 'asDouble', {}));
    metrics.push(createMetric('cpuUsagePercentage', cpuUsageNum, '%', 'gauge', 'asInt', {}));
    metrics.push(createMetric('memoryUsagePercentage', memoryUsageNum, '%', 'gauge', 'asInt', {}));
    metrics.push(createMetric('serviceLatency', serviceLatencyTimer, 'ms', 'gauge', 'asDouble', {}));
    metrics.push(createMetric('totalRevenue', revenueCount, '1', 'sum', 'asDouble', {}));
    metrics.push(createMetric('authSuccess', authSuccessCount, '1', 'sum', 'asInt', {}));
    metrics.push(createMetric('authFailure', authFailureCount, '1', 'sum', 'asInt', {}));
    metrics.push(createMetric('activeUsers', activeUserCount, '1', 'sum', 'asInt', {}));
  });

  sendMetricToGrafana(metrics);
}, 10000);

const os = require('os');

function getCpuUsagePercentage() {
  const cpuUsage = os.loadavg()[0] / os.cpus().length;
  return cpuUsage.toFixed(2) * 100;
}

// this returns a string. May need assistance for conversion
function getMemoryUsagePercentage() {
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  const memoryUsage = (usedMemory / totalMemory) * 100;
  return memoryUsage.toFixed(2);
}

function createMetric(metricName, metricValue, metricUnit, metricType, valueType, attributes) {
  attributes = { ...attributes, source: config.metrics.source };

  const metric = {
    name: metricName,
    unit: metricUnit,
    [metricType]: {
      dataPoints: [
        {
          [valueType]: metricValue,
          timeUnixNano: Date.now() * 1000000,
          attributes: [],
        },
      ],
    },
  };

  Object.keys(attributes).forEach((key) => {
    metric[metricType].dataPoints[0].attributes.push({
      key: key,
      value: { stringValue: attributes[key] },
    });
  });

  if (metricType === 'sum') {
    metric[metricType].aggregationTemporality = 'AGGREGATION_TEMPORALITY_CUMULATIVE';
    metric[metricType].isMonotonic = true;
  }

  return metric;
}

function sendMetricToGrafana(metrics) {
  const body = {
    resourceMetrics: [
      {
        scopeMetrics: [
          {
            metrics,
          },
        ],
      },
    ],
  };

  // console.log(`${config.url}`);

  fetch(`${config.metrics.url}`, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { Authorization: `Bearer ${config.metrics.apiKey}`, 'Content-Type': 'application/json' },
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP status: ${response.status}`);
      }
    })
    .catch((error) => {
      console.error('Error pushing metrics:', error);
    });
}

module.exports = { 
  requestTracker,
  greetingChanged,
  getCpuUsagePercentage,
  getMemoryUsagePercentage,
  pizzaPurchaseSuccess,
  pizzaPurchaseFailure,
  pizzaLatency,
  serviceLatency,
  pizzaPurchaseRevenue,
  authSuccess,
  authFailure,
  setActiveUsers,
  getActiveUsers,
  userLoggedOut,
 };