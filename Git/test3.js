import Git from './git.js';

console.log("3. Branches test")
var repo = new Git("testing")
repo.commit("Initial Commit")
repo.commit("Change 1")

// Maps the array of commits into a string of commit ids.
// For [C2, C1,C3], it returns "2-1-0"
function historyToIdMapper(history) {
    var histIDs = []
    var ids = history.forEach(function (commit) {
        histIDs.push(commit.id)
    })
    return histIDs.join("-")
}
console.log(historyToIdMapper(repo.log()))
console.assert(historyToIdMapper(repo.log()) === "1-")

repo.checkout("testing")
repo.commit("Change 3")

console.assert(historyToIdMapper(repo.log()) === "2-")
console.log(historyToIdMapper(repo.log()))
repo.checkout("master")
console.assert(historyToIdMapper(repo.log()) === "2-")
console.log(historyToIdMapper(repo.log()))

repo.checkout("master")
console.assert(historyToIdMapper(repo.log()) === "2-")
console.log(historyToIdMapper(repo.log()))
