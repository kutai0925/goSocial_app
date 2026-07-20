const fs = require('fs');

async function seed() {
  const eventsData = require('./src/data/events.json');
  // the events.json has latOffset, lonOffset, which were relative to user.
  // let's just use some static coords in San Francisco, e.g. 37.7749, -122.4194
  const baseLat = 37.7749;
  const baseLon = -122.4194;

  for (const event of eventsData) {
    const newEvent = {
      id: event.id,
      title: event.title,
      category: event.category,
      locationName: event.locationName,
      time: event.time,
      lat: baseLat + event.latOffset,
      lon: baseLon + event.lonOffset,
    };

    try {
      const res = await fetch("http://localhost:8888/v1/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newEvent)
      });
      console.log(`Seeded ${event.title}: ${res.status}`);
    } catch (e) {
      console.log(`Failed to seed ${event.title}`, e);
    }
  }
}

seed();
