const fs = require('fs');

// Lees je bestaande data.json in
const data = JSON.parse(fs.readFileSync('data.json', 'utf8'));

// Nieuwe lege structuur voor Firebase
const firebaseData = {};

for (const category in data) {
  firebaseData[category] = {}; // maak object voor elke categorie
  data[category].forEach((item, index) => {
    // Genereer een unieke sleutel per item
    const id = `${category.toLowerCase()}${index + 1}`;
    // Voeg een 'checked' veld toe
    firebaseData[category][id] = { ...item, checked: false };
  });
}

// Schrijf het resultaat weg
fs.writeFileSync('data-firebase.json', JSON.stringify(firebaseData, null, 2));

console.log('✅ data-firebase.json is aangemaakt!');
