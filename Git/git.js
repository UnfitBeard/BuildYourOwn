// A Repo
function Git(name) {
    this.name = name
    this.lastCommitId = -1
}

// Create a new Repo using 
// > git init
var repo = new Git("my-repo");

// Commit -- when commits are chained together they form the history of your projects
// Commit class should have a ref id and change containing snapshot of change made
// Also the commit message
function Commit(id) {
    this.id = id;
    this.message = message
    // Assume that this has a change property
}

//Adding the ability to git to create a commit
Git.prototype.commit = function (message) {
    var commit = new Commit();
    return commit;
}