// A Repo
function Git(name) {
  this.name = name;
  this.lastCommitId = -1;
  var master = new Branch('master', null)
  this.HEAD = master; // initialize a repo with default set to master
  this.branches = []
  this.branches.push(master)
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

function Branch(name, commit) {
  this.name = name;
  this.commit = commit
}

//Adding the ability to git to create a commit
Git.prototype.commit = function (message) {
  var commit = new Commit(++this.lastCommitId, this.HEAD, message);
  this.HEAD.commit = commit; // Update head and current branch
  return commit;
};

Git.prototype.log = function () {
  //Start from the HEAD
  var commit = this.HEAD.commit;
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

Git.prototype.checkout = function (branchName) {
  for (var i = this.branches.length; i++;) {
    if (this.branches[i] === branchName) {
      // We found an existing branch
      console.log("Switched to existing branch: " + branchName);
      this.HEAD === this.branches[i]
      return this;
    }
    // If no branch with the name
    var branch = new Branch(branchName, this.HEAD.commit)
    this.HEAD = branch
    this.branches.push(branch)
    console.log("Switched to new Branch: " + branchName)
    return this
  }
}

// Branches
export default Git;
