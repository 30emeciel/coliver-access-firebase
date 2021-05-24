const firebase = require("@firebase/rules-unit-testing");
const fs = require("fs");
const http = require("http");

/**
 * The emulator will accept any project ID for testing.
 */
const PROJECT_ID = "firestore-emulator-example";

/**
 * The FIRESTORE_EMULATOR_HOST environment variable is set automatically
 * by "firebase emulators:exec"
 */
const COVERAGE_URL = `http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${PROJECT_ID}:ruleCoverage.html`;

function getAdminFirestore() {
  return firebase.initializeAdminApp({ projectId: PROJECT_ID }).firestore();
}

/**
 * Creates a new client FirebaseApp with authentication and returns the Firestore instance.
 */
function getAuthedFirestore(auth) {
  return firebase
    .initializeTestApp({ projectId: PROJECT_ID, auth })
    .firestore();
}

beforeEach(async () => {
  // Clear the database between tests
  await firebase.clearFirestoreData({ projectId: PROJECT_ID });
});

before(async () => {
  // Load the rules file before the tests begin
  // const rules = fs.readFileSync("firestore.rules", "utf8");
  // await firebase.loadFirestoreRules({ projectId: PROJECT_ID, rules });
});

after(async () => {
  // Delete all the FirebaseApp instances created during testing
  // Note: this does not affect or clear any data
  await Promise.all(firebase.apps().map((app) => app.delete()));

  // Write the coverage report to a file
  const coverageFile = "firestore-coverage.html";
  const fstream = fs.createWriteStream(coverageFile);
  await new Promise((resolve, reject) => {
    http.get(COVERAGE_URL, (res) => {
      res.pipe(fstream, { end: true });

      res.on("end", resolve);
      res.on("error", reject);
    });
  });

  console.log(`View firestore rule coverage information at ${coverageFile}\n`);
});

describe("My app", () => {
  it("require pax to log in before creating a profile", async () => {
    const db = getAuthedFirestore(null);
    const profile = db.collection("pax").doc("alice");
    await firebase.assertFails(profile.set({ name: "Alice" }));
  });

  it("should only let supervisor to set is_supervisor in pax profiles", async () => {
    const admin_db = getAdminFirestore();
    const alice_db = getAuthedFirestore({sub: "alice"});
    const supervisor_db = getAuthedFirestore({sub: "john"});

    // fixture
    const admin_john_ref = admin_db.collection("pax").doc("john");
    admin_john_ref.set({
      is_supervisor: true,
    });

    const from_alice_ref = alice_db.collection("pax").doc("alice");
    await firebase.assertFails(
      from_alice_ref.set({
        is_supervisor: true,
      })
    );

    const from_supervisor_ref = supervisor_db.collection("pax").doc("alice");
    await firebase.assertSucceeds(
      from_supervisor_ref.set({
        is_supervisor: true,
      })
    );
  });

  it("should let pax update their own profile", async () => {
    const admin_db = getAdminFirestore();
    
    // fixture
    const admin_alice_ref = admin_db.collection("pax").doc("alice");
    admin_alice_ref.set({
      name: "Alice",
    });

    const db = getAuthedFirestore({sub: "alice"});
    await firebase.assertSucceeds(
      db.collection("pax").doc("alice").update({
        name: "Alice 2",
      })
    );
  });

  it("should only let pax create their own profile", async () => {
    const db = getAuthedFirestore({sub: "alice"});

    await firebase.assertFails(
      db.collection("pax").doc("bob").set({
        name: "Bob",
      })
    );
  });


  it("should only let pax read their own profile", async () => {
    const db = getAuthedFirestore({sub: "alice"});
    await firebase.assertSucceeds(db.collection("pax").doc("alice").get());
    await firebase.assertFails(db.collection("pax").doc("bob").get());
  });

});
