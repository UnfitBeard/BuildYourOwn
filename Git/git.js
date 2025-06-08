// A Repo
function Git(name) {
  this.name = name;
  this.lastCommitId = -1;
  this.HEAD = null; // reference to the last commit
}

// Commit -- when commits are chained together they form the history of your projects
// Commit class should have a ref id and change containing snapshot of change made
// Also the commit message
function Commit(id, parent, message) {
  this.id = id;
  this.parent = parent; // references its parent commit object
  this.message = message;
  // Assume that this has a change property
}

//Adding the ability to git to create a commit
Git.prototype.commit = function (message) {
  var commit = new Commit(++this.lastCommitId, this.HEAD, message);
  this.HEAD = commit; // Update head and current branch
  return commit;
};

Git.prototype.log = function () {
  //Start from the HEAD
  var commit = this.HEAD;
  var history = []; // array of commits in reverse order

  // Start from the last commit
  // go back tracing to the first commit
  // push in history
  while (commit) {
    history.push(commit);
    // Keep the following the parent
    commit = commit.parent;
  }

  return history;
};

// Can be used as repo.log()
//ACtual command: > git log

export default Git;
