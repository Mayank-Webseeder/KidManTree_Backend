const { io } = require("socket.io-client");

const socket = io("http://localhost:8000", {
    auth: { token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4Yzg0OGJlZjRmNmNiYzVlNGZhNmU0YyIsImVtYWlsIjoic3VwZXJhZG1pbkBnbWFpbC5jb20iLCJyb2xlIjoic3VwZXJhZG1pbiIsInJvbGVJZCI6bnVsbCwiaWF0IjoxNzYzNzk3OTQ5LCJleHAiOjE3NjM4ODQzNDksImF1ZCI6Im1lbnRhbC1oZWFsdGgtdXNlcnMiLCJpc3MiOiJtZW50YWwtaGVhbHRoLXBsYXRmb3JtIn0.6v2VVtg-kmL-biF0J7dscmeeClAls3Gux6KxwA4HvOg" },
    transports: ["websocket"],
});

socket.on("connect", () => console.log("connected", socket.id));
socket.on("notification:new", (payload) => console.log("notification", payload));
socket.on("disconnect", (reason) => console.log("disconnected", reason));
