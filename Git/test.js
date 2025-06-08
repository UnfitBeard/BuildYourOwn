// test.js
import Git from './git.js';

const repo = new Git("test");
repo.commit("Initial commit");
repo.commit("Change1");

const log = repo.log();

console.assert(log.length === 2, "Should have two commits");
console.assert(log[0].id === 1, "First commit in log should be id 1");
console.assert(log[1].id === 0, "Second commit in log should be id 0");

console.log("Commit Log:");
log.forEach(c => console.log(`Commit ${c.id}: ${c.message}`));
