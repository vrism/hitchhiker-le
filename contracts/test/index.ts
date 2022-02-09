import { expect } from "chai";
// eslint-disable-next-line camelcase
import { HitchhikerLE__factory, HitchhikerLE } from "../typechain";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { AirdropLeaf, merkleProof, merkleRoot } from "../utils/merkle-tree";

describe("Hitchihiker LE contract", function () {
  let deployer: SignerWithAddress;
  let hhLE: HitchhikerLE;
  let airdropLeaves: AirdropLeaf[];
  before(async () => {
    const [, minter1, minter2, minter3, minter4, minter5] =
      await ethers.getSigners();
    const airdrop = {
      [minter1.address]: 2,
      [minter2.address]: 3,
      [minter3.address]: 4,
      [minter4.address]: 5,
      [minter5.address]: 6,
    };
    airdropLeaves = Object.keys(airdrop).map((key) => ({
      address: key,
      amount: airdrop[key] as number,
    }));
  });
  it("should deploy and set the deployer as its owner", async function () {
    [deployer] = await ethers.getSigners();
    hhLE = await new HitchhikerLE__factory(deployer).deploy();
    await hhLE.deployed();
    expect(await hhLE.owner()).to.eq(deployer.address);
  });
  it("should return the contract uri once it's updated", async function () {
    await hhLE.updateContractURI(
      "QmccMNSQ5V9dsAip6szYaSYpfaqLXpivWq3FzHBQJS5dq8"
    );
    expect(await hhLE.contractURI()).to.equal(
      "QmccMNSQ5V9dsAip6szYaSYpfaqLXpivWq3FzHBQJS5dq8"
    );
  });
  it("should return the correct token URI once a new airdrop is registered", async function () {
    const metadataHash = "abcdefgh";
    const airdropRoot = merkleRoot(airdropLeaves);
    const timestamp = Math.floor(new Date().getTime() / 1000) + 1000;
    await hhLE.newAirdrop(metadataHash, airdropRoot, timestamp);
    expect(await hhLE.uri(0)).to.equal(metadataHash);
  });
  it("Should allow minting with merkle proof", async function () {
    const [, minter1] = await ethers.getSigners();
    const proof = merkleProof(airdropLeaves, minter1.address);
    await expect(hhLE.connect(minter1).claim(0, 1, 2, proof)).to.emit(
      hhLE,
      "TransferSingle"
    );
  });
  it("Should not allow minting more than allowed", async function () {
    const [, minter1] = await ethers.getSigners();
    const proof = merkleProof(airdropLeaves, minter1.address);
    await expect(hhLE.connect(minter1).claim(0, 2, 2, proof)).to.be.reverted;
    await expect(hhLE.connect(minter1).claim(0, 1, 2, proof)).to.emit(
      hhLE,
      "TransferSingle"
    );
    await expect(hhLE.connect(minter1).claim(0, 1, 2, proof)).to.be.reverted;
  });
});
