const { learningStore } = require('./server/src/learning-store');
const db = learningStore && learningStore.db;
console.log('learningStore keys:', learningStore ? Object.keys(learningStore).slice(0, 20).join(',') : 'null');
