// Test script többnapos események tesztelésére
const testEvents = [
  {
    id: 1,
    title: "Családi vakáció",
    start_time: "2024-12-20T10:00:00Z",
    end_time: "2024-12-27T18:00:00Z",
    color: "#e74c3c"
  },
  {
    id: 2,
    title: "Munkakonferencia",
    start_time: "2024-12-15T09:00:00Z",
    end_time: "2024-12-17T17:00:00Z",
    color: "#3498db"
  },
  {
    id: 3,
    title: "Karácsonyi szünet",
    start_time: "2024-12-24T00:00:00Z",
    end_time: "2024-12-26T23:59:59Z",
    color: "#27ae60"
  },
  {
    id: 4,
    title: "Egynapos esemény",
    start_time: "2024-12-18T14:00:00Z",
    end_time: "2024-12-18T16:00:00Z",
    color: "#9b59b6"
  },
  {
    id: 5,
    title: "Hétvégi kirándulás",
    start_time: "2024-12-21T08:00:00Z",
    end_time: "2024-12-22T20:00:00Z",
    color: "#f39c12"
  }
];

// Mock API válasz
const mockApiResponse = {
  events: testEvents
};

console.log("Test események:", JSON.stringify(mockApiResponse, null, 2));
console.log("\nMulti-day events visualization test data ready!");

// Exportálás ha szükséges
if (typeof module !== 'undefined') {
  module.exports = { testEvents, mockApiResponse };
}
