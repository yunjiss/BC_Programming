import hre from "hardhat";
import { expect } from "chai";
import { MyToken } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

const DECIMALS = 18n;
const MINT_AMOUNT = 100n; // 100 MT
const toMT = (v: string) => hre.ethers.parseUnits(v, DECIMALS);

describe("MyToken - approve & transferFrom", () => {
  let token: MyToken;
  let signer0: HardhatEthersSigner; // 토큰 주인 (owner)
  let signer1: HardhatEthersSigner; // 대신 옮기는 사람 (spender)

  beforeEach(async () => {
    [signer0, signer1] = await hre.ethers.getSigners();
    token = await hre.ethers.deployContract("MyToken", [
      "MyToken",
      "MT",
      DECIMALS,
      MINT_AMOUNT,
    ]);
  });

  it("배포 직후 signer0이 100 MT 전부를 가진다", async () => {
    expect(await token.balanceOf(signer0.address)).to.equal(toMT("100"));
    expect(await token.balanceOf(signer1.address)).to.equal(0n);
  });

  describe("1. approve", () => {
    it("signer0이 signer1에게 자산 이동 권한을 부여한다", async () => {
      await expect(token.connect(signer0).approve(signer1.address, toMT("10")))
        .to.emit(token, "Approval")
        .withArgs(signer0.address, signer1.address, toMT("10"));

      expect(await token.allowance(signer0.address, signer1.address)).to.equal(
        toMT("10")
      );
    });

    it("권한이 없으면 signer1은 transferFrom 할 수 없다", async () => {
      await expect(
        token
          .connect(signer1)
          .transferFrom(signer0.address, signer1.address, toMT("1"))
      ).to.be.revertedWith("insufficient allowance");
    });
  });

  describe("2. transferFrom & 3. balance 확인", () => {
    beforeEach(async () => {
      await token.connect(signer0).approve(signer1.address, toMT("10"));
    });

    it("signer1이 signer0의 MT를 자신의 주소로 옮기고 잔액이 바뀐다", async () => {
      await expect(
        token
          .connect(signer1)
          .transferFrom(signer0.address, signer1.address, toMT("7"))
      )
        .to.emit(token, "Transfer")
        .withArgs(signer0.address, signer1.address, toMT("7"));

      // 3. balance 확인
      expect(await token.balanceOf(signer0.address)).to.equal(toMT("93"));
      expect(await token.balanceOf(signer1.address)).to.equal(toMT("7"));
      // 사용한 만큼 허용량이 줄어든다
      expect(await token.allowance(signer0.address, signer1.address)).to.equal(
        toMT("3")
      );
      // 총 발행량은 그대로
      expect(await token.totalSupply()).to.equal(toMT("100"));
    });

    it("허용량을 넘는 금액은 옮길 수 없다", async () => {
      await expect(
        token
          .connect(signer1)
          .transferFrom(signer0.address, signer1.address, toMT("11"))
      ).to.be.revertedWith("insufficient allowance");

      expect(await token.balanceOf(signer0.address)).to.equal(toMT("100"));
      expect(await token.balanceOf(signer1.address)).to.equal(0n);
    });
  });
});
