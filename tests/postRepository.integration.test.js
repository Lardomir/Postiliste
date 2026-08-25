const fs = require("fs");
const os = require("os");
const path = require("path");
const PostRepository = require("../postRepository");

describe("PostRepository integration", () => {
  let tempDirectory;
  let databasePath;
  let repository;

  beforeEach(() => {
    tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "postiliste-test-"));
    databasePath = path.join(tempDirectory, "test.db");
    repository = new PostRepository(databasePath);
  });

  afterEach(async () => {
    await repository.close();
    fs.rmSync(tempDirectory, { recursive: true, force: true });
  });

  test("stores a Post-it in the real SQLite test database", async () => {
    await repository.create("Prepare M324 demo");
    const posts = await repository.getAll();

    expect(posts).toHaveLength(1);
    expect(posts[0].title).toBe("Prepare M324 demo");
    expect(posts[0].completed).toBe(0);
  });

  test("rejects an empty Post-it", async () => {
    await expect(repository.create("   ")).rejects.toThrow("must not be empty");
  });

  test("toggles and deletes a stored Post-it", async () => {
    const created = await repository.create("Test lifecycle");
    await repository.toggle(created.id);
    let posts = await repository.getAll();
    expect(posts[0].completed).toBe(1);

    await repository.remove(created.id);
    posts = await repository.getAll();
    expect(posts).toEqual([]);
  });
});
