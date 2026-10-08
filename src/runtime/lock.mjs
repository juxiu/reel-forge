import fs from "node:fs";
import path from "node:path";

export class FileLock {
  constructor(file) {
    this.file = file;
  }

  acquire(owner = process.pid) {
    fs.mkdirSync(path.dirname(this.file), {recursive: true});
    try {
      fs.writeFileSync(this.file, JSON.stringify({owner, acquired_at: new Date().toISOString()}), {flag: "wx"});
      return true;
    } catch (error) {
      if (error.code === "EEXIST") {
        throw new Error("lock already held: " + this.file);
      }
      throw error;
    }
  }

  release() {
    if (fs.existsSync(this.file)) fs.rmSync(this.file);
  }

  static forProject(projectId, root = "artifacts") {
    return new FileLock(path.join(root, projectId, "runtime", "production.lock"));
  }
}
