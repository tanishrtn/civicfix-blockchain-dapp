const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CivicFix", function () {
  async function deployFixture() {
    const [administrator, requester, volunteer, outsider] = await ethers.getSigners();
    const CivicFix = await ethers.getContractFactory("CivicFix");
    const civicFix = await CivicFix.deploy("VIT Community");
    return { civicFix, administrator, requester, volunteer, outsider };
  }

  it("rejects an invalid community name", async function () {
    const CivicFix = await ethers.getContractFactory("CivicFix");
    await expect(CivicFix.deploy("x")).to.be.revertedWith("Community name is too short");
  });

  it("creates and returns a request", async function () {
    const { civicFix, requester } = await deployFixture();
    await expect(civicFix.connect(requester).createRequest("Broken streetlight", "North gate", "Light is not working after sunset"))
      .to.emit(civicFix, "RequestCreated")
      .withArgs(1, requester.address, "Broken streetlight");
    const item = await civicFix.getRequest(1);
    expect(item.requester).to.equal(requester.address);
    expect(item.status).to.equal(0);
  });

  it("prevents a requester from claiming their own request", async function () {
    const { civicFix, requester } = await deployFixture();
    await civicFix.connect(requester).createRequest("Broken streetlight", "North gate", "Light is not working after sunset");
    await expect(civicFix.connect(requester).claimRequest(1)).to.be.revertedWith("Requester cannot claim own request");
  });

  it("supports the create, claim, and completion lifecycle", async function () {
    const { civicFix, requester, volunteer } = await deployFixture();
    await civicFix.connect(requester).createRequest("Broken streetlight", "North gate", "Light is not working after sunset");
    await expect(civicFix.connect(volunteer).claimRequest(1)).to.emit(civicFix, "RequestClaimed");
    await expect(civicFix.connect(requester).completeRequest(1)).to.emit(civicFix, "RequestCompleted");
    expect(await civicFix.completedCount()).to.equal(1);
    expect((await civicFix.getRequest(1)).status).to.equal(2);
  });

  it("blocks unauthorized completion", async function () {
    const { civicFix, requester, volunteer, outsider } = await deployFixture();
    await civicFix.connect(requester).createRequest("Broken streetlight", "North gate", "Light is not working after sunset");
    await civicFix.connect(volunteer).claimRequest(1);
    await expect(civicFix.connect(outsider).completeRequest(1)).to.be.revertedWith("Only requester can perform this action");
  });
});
