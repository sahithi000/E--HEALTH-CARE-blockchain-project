const EHR = artifacts.require("EHR");

contract("EHR", (accounts) => {
  // Accounts
  const owner = accounts[0];   // Contract deployer / admin
  const doctor1 = accounts[1];
  const doctor2 = accounts[2];
  const patient1 = accounts[3];
  const patient2 = accounts[4];

  let ehrInstance;

  before(async () => {
    ehrInstance = await EHR.deployed();

    // Register doctors
    await ehrInstance.registerDoctor(doctor1, { from: owner });
    await ehrInstance.registerDoctor(doctor2, { from: owner });
  });

  it("should add a new record for patient1 by doctor1", async () => {
    const ipfsHash = "QmTestHash123";

    await ehrInstance.addRecord(patient1, ipfsHash, { from: doctor1 });

    const records = await ehrInstance.getRecords(patient1);
    assert.equal(records.length, 1, "Record not added");
    assert.equal(records[0], ipfsHash, "IPFS hash mismatch");
  });

  it("should allow multiple records for same patient", async () => {
    const ipfsHash2 = "QmAnotherHash456";

    await ehrInstance.addRecord(patient1, ipfsHash2, { from: doctor1 });

    const records = await ehrInstance.getRecords(patient1);
    assert.equal(records.length, 2, "Second record not added");
    assert.equal(records[1], ipfsHash2, "IPFS hash mismatch for second record");
  });

  it("should add records for multiple patients by different doctors", async () => {
    const ipfsHash3 = "QmPatient2Hash789";

    await ehrInstance.addRecord(patient2, ipfsHash3, { from: doctor2 });

    const records1 = await ehrInstance.getRecords(patient1);
    const records2 = await ehrInstance.getRecords(patient2);

    assert.equal(records1.length, 2, "Patient1 records count mismatch");
    assert.equal(records2.length, 1, "Patient2 record not added");
    assert.equal(records2[0], ipfsHash3, "IPFS hash mismatch for patient2");
  });

  it("should revert if unauthorized account tries to add record", async () => {
    const ipfsHash = "QmUnauthorizedHash";

    try {
      // Patient trying to add record (not a doctor)
      await ehrInstance.addRecord(patient1, ipfsHash, { from: patient1 });
      assert.fail("Unauthorized account should not add record");
    } catch (error) {
      assert(
        error.message.includes("Access denied"),
        "Expected 'Access denied' error"
      );
    }
  });
});
