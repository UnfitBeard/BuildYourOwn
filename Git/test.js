// test.js
import Git from './git.js';

const repo = new Git("test");
repo.commit("Initial commit");
repo.commit("Change1");

const log = repo.log();

// Can be used as repo.log()
// Actual command: > git log
console.assert(log.length === 2, "Should have two commits");
console.assert(log[0].id === 1, "First commit in log should be id 1");
console.assert(log[1].id === 0, "Second commit in log should be id 0");

console.log("Commit Log:");
log.forEach(c => console.log(`Commit ${c.id}: ${c.message}`));


// Can we test for checkout
console.log("git checkout() test")
var test = new Git("testing");
test.commit("Initial Commit")

console.assert(test.HEAD.name === "master")
test.checkout("testing")
console.assert(test.HEAD.name === "testing")
test.checkout("master")
console.assert(test.HEAD.name === "master")
test.checkout("testing")
console.assert(test.HEAD.name === "testing")
test.checkout("master")


