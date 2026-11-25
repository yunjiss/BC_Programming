import hre from "hardhat";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { mine } from "@nomicfoundation/hardhat-network-helpers";
import { MyToken, TinyBank } from "../typechain-types";
import { expect } from "chai";
import { DECIMALS, MINTING_AMOUNT } from "./constant";

describe("TinyBank", () => {
    let signers: HardhatEthersSigner[];
    let myTokenC: MyToken;
    let TinyBankC: TinyBank;

    beforeEach(async () => {
        signers = await hre.ethers.getSigners();
        myTokenC = await hre.ethers.deployContract("MyToken", [
            "My Token", "MTK", DECIMALS, MINTING_AMOUNT
        ]);
        TinyBankC = await hre.ethers.deployContract("TinyBank", [await myTokenC.getAddress()]);
        await myTokenC.setManager(await TinyBankC.getAddress());
    });

    describe("Initialized State check", () => {
        it("should return totalStaked 0", async () => {
            expect(await TinyBankC.totalStaked()).to.equal(0n);
        });
        it("should return staked 0 amount of signer0", async () => {
            expect(await TinyBankC.staked(signers[0].address)).to.equal(0n);
        });
        it("should expose stakingToken (used by UI)", async () => {
            expect(await TinyBankC.stakingToken()).to.equal(await myTokenC.getAddress());
        });
        it("should set deployer as owner and manager", async () => {
            expect(await TinyBankC.owner()).to.equal(signers[0].address);
            expect(await TinyBankC.manager()).to.equal(signers[0].address);
        });
    });

    describe("Staking", () => {
        it("should return staked amount", async () => {
            const signer0 = signers[0];
            const stakingAmount = hre.ethers.parseUnits("50", DECIMALS);

            await myTokenC.approve(await TinyBankC.getAddress(), stakingAmount);
            await TinyBankC.stake(stakingAmount);

            expect(await TinyBankC.staked(signer0.address)).to.equal(stakingAmount);
            expect(await TinyBankC.totalStaked()).to.equal(stakingAmount);
            expect(await myTokenC.balanceOf(signer0.address)).to.equal(await TinyBankC.totalStaked());
        });
        it("should revert when staking 0 amount", async () => {
            await expect(TinyBankC.stake(0)).to.be.revertedWith("cannot stake 0 amount");
        });
        it("should revert when staking without approve", async () => {
            const stakingAmount = hre.ethers.parseUnits("50", DECIMALS);
            await expect(TinyBankC.stake(stakingAmount)).to.be.revertedWith("insufficient allowance");
        });
    });

    describe("Withdraw", () => {
        it("should return 0 staked after withdrawing total token", async () => {
            const stakingAmount = hre.ethers.parseUnits("50", DECIMALS);
            await myTokenC.approve(await TinyBankC.getAddress(), stakingAmount);
            await TinyBankC.stake(stakingAmount);
            await TinyBankC.withdraw(stakingAmount);
            expect(await TinyBankC.staked(signers[0].address)).to.equal(0n);
        });
        it("should revert when withdrawing more than staked", async () => {
            const stakingAmount = hre.ethers.parseUnits("50", DECIMALS);
            await myTokenC.approve(await TinyBankC.getAddress(), stakingAmount);
            await TinyBankC.stake(stakingAmount);
            await expect(
                TinyBankC.withdraw(stakingAmount + 1n)
            ).to.be.revertedWith("insufficient staked token");
        });
    });

    describe("Reward", () => {
        it("should reward 1MT every blocks", async () => {
            const signer0 = signers[0];
            const stakingAmount = hre.ethers.parseUnits("50", DECIMALS);
            await myTokenC.approve(await TinyBankC.getAddress(), stakingAmount);
            await TinyBankC.stake(stakingAmount);

            const BLOCKS = 5n;
            const transferAmount = hre.ethers.parseUnits("1", DECIMALS);
            for (let i = 0; i < BLOCKS; i++) {
                await myTokenC.transfer(transferAmount, signer0.address);
            }

            await TinyBankC.withdraw(stakingAmount);
            expect(await myTokenC.balanceOf(signer0.address)).to.equal(
                hre.ethers.parseUnits((BLOCKS + MINTING_AMOUNT + 1n).toString(), DECIMALS)
            );
        });

        it("should revert when changing rewardPerBlock by hacker", async () => {
            const hacker = signers[3];
            const rewardToChange = hre.ethers.parseUnits("10000", DECIMALS);
            await expect(
                TinyBankC.connect(hacker).setRewardPerBlock(rewardToChange)
            ).to.be.revertedWith("You are not authorized to manage this contract");
        });

        it("should allow manager to change rewardPerBlock", async () => {
            const newReward = hre.ethers.parseUnits("10", DECIMALS);
            await TinyBankC.setRewardPerBlock(newReward);
            expect(await TinyBankC.rewardPerBlock()).to.equal(newReward);
        });
    });

    describe("currentReward", () => {
        it("should return 0 when nothing is staked", async () => {
            expect(await TinyBankC.currentReward(signers[0].address)).to.equal(0n);
        });

        it("should return 0 right after staking", async () => {
            const stakingAmount = hre.ethers.parseUnits("50", DECIMALS);
            await myTokenC.approve(await TinyBankC.getAddress(), stakingAmount);
            await TinyBankC.stake(stakingAmount);
            expect(await TinyBankC.currentReward(signers[0].address)).to.equal(0n);
        });

        it("should accumulate 1MT per block without minting", async () => {
            const signer0 = signers[0];
            const stakingAmount = hre.ethers.parseUnits("50", DECIMALS);
            await myTokenC.approve(await TinyBankC.getAddress(), stakingAmount);
            await TinyBankC.stake(stakingAmount);

            const BLOCKS = 5n;
            await mine(BLOCKS);

            expect(await TinyBankC.currentReward(signer0.address)).to.equal(
                hre.ethers.parseUnits(BLOCKS.toString(), DECIMALS)
            );
            // view 함수이므로 실제 잔액/총발행량은 변하지 않아야 함
            expect(await myTokenC.balanceOf(signer0.address)).to.equal(
                MINTING_AMOUNT * 10n ** DECIMALS - stakingAmount
            );
        });

        it("should split reward by stake share", async () => {
            const [signer0, signer1] = signers;
            const amount0 = hre.ethers.parseUnits("30", DECIMALS);
            const amount1 = hre.ethers.parseUnits("10", DECIMALS);
            await myTokenC.transfer(amount1, signer1.address);

            await myTokenC.approve(await TinyBankC.getAddress(), amount0);
            await TinyBankC.stake(amount0);
            await myTokenC.connect(signer1).approve(await TinyBankC.getAddress(), amount1);
            await TinyBankC.connect(signer1).stake(amount1);

            await mine(4);
            // signer1: 4 blocks * 1MT * 10/40 = 1MT
            expect(await TinyBankC.currentReward(signer1.address)).to.equal(
                hre.ethers.parseUnits("1", DECIMALS)
            );
        });

        it("should match the reward actually minted on withdraw", async () => {
            const signer0 = signers[0];
            const stakingAmount = hre.ethers.parseUnits("50", DECIMALS);
            await myTokenC.approve(await TinyBankC.getAddress(), stakingAmount);
            await TinyBankC.stake(stakingAmount);
            await mine(3);

            // withdraw 트랜잭션이 1블록 더 생성하므로 +1 블록분 보상
            const expected =
                (await TinyBankC.currentReward(signer0.address)) +
                (await TinyBankC.rewardPerBlock());
            const before = await myTokenC.balanceOf(signer0.address);
            await TinyBankC.withdraw(stakingAmount);
            const after = await myTokenC.balanceOf(signer0.address);

            expect(after - before - stakingAmount).to.equal(expected);
            expect(await TinyBankC.currentReward(signer0.address)).to.equal(0n);
        });
    });
});
