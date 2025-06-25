Sure! Below is a `README.md` formatted version of the documentation for your Git-like repository simulation project:

---

```markdown
# 🌀 Git Repository Simulator

A simple JavaScript simulation of a Git-like version control system, supporting commits, branching, and history logging.

---

## 📁 Project Structure

```

/your-folder
├── Git.js       # The main Git simulation module
└── test.js      # File to run and test the Git module

````

---

## 🚀 Getting Started

### 1. Clone or copy the files

Make sure you have `Git.js` and `test.js` in the same directory.

### 2. Example Usage

```js
import Git from './Git.js';

const repo = new Git("MyRepo");
repo.commit("Initial commit");
repo.commit("Added feature A");
repo.checkout("dev");
repo.commit("Started development on dev branch");

console.log(repo.log());
````

---

## 🔧 Features

* ✅ Create commits
* 🌿 Create and switch between branches
* 🧱 Traverse commit history

---

## 🧩 Classes & Methods

### 🧱 `Git`

Main class representing the repository.

#### Constructor

```js
new Git(name: string)
```

* `name`: Name of the repository.
* Initializes with a default `master` branch.

#### Methods

| Method                         | Description                                          |
| ------------------------------ | ---------------------------------------------------- |
| `commit(message: string)`      | Creates a new commit on the current branch.          |
| `log()`                        | Returns the commit history (latest commit first).    |
| `checkout(branchName: string)` | Switches to or creates a branch with the given name. |

---

### 🔨 `Commit`

Represents a commit in the repository.

```js
new Commit(id: number, parent: Commit|null, message: string)
```

* `id`: Unique ID.
* `parent`: Reference to previous commit.
* `message`: Commit message.

---

### 🌿 `Branch`

Represents a branch in the repository.

```js
new Branch(name: string, commit: Commit|null)
```

* `name`: Branch name.
* `commit`: Last commit in this branch.

---

## ⚠️ Known Issues

### ❗ Bugs in `checkout()` Method

1. **Incorrect loop syntax**:

   ```js
   for (var i = this.branches.length; i++;)
   ```

   ✅ Fix:

   ```js
   for (var i = 0; i < this.branches.length; i++)
   ```

2. **Branch comparison uses object instead of name**:

   ```js
   if (this.branches[i] === branchName)
   ```

   ✅ Fix:

   ```js
   if (this.branches[i].name === branchName)
   ```

3. **Incorrect assignment with `===`**:

   ```js
   this.HEAD === this.branches[i]
   ```

   ✅ Fix:

   ```js
   this.HEAD = this.branches[i]
   ```

---

## 🧪 Testing

All functionality can be tested by running the `test.js` file in the same directory.

```bash
node test.js
```

You can write assertions or simple console logs in `test.js` to check functionality.

---

## ✅ Example Output

```js
repo.commit("Init");
repo.commit("Update A");
repo.checkout("dev");
repo.commit("Dev changes");
console.log(repo.log().map(c => `${c.id}: ${c.message}`));
```

Output:

```
2: Dev changes
1: Update A
0: Init
```

---

## 📜 License

MIT License. Use freely for learning or projects.

---

## 👤 Author

Created by \[Your Name]. Contributions welcome!

```

---

Let me know if you'd like this README to include updated/fixed code or a test suite example in `test.js`.
```
