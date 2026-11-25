import hre from "hardhat";
import { expect } from "chai";
import DeployModule from "../ignition/modules/deploy";

// ignition/modules/deploy.ts 가 Kairos 배포와 동일하게 동작하는지 로컬에서 확인
describe("Ignition deploy module", () => {
    it("should deploy MyToken/TinyBank and set TinyBank as MyToken manager", async () => {
        const { myTokenC, tinyBankC } = await hre.ignition.deploy(DeployModule);
        const tinyBankAddr = await tinyBankC.getAddress();

        expect(await myTokenC.name()).to.equal("MyToken");
        expect(await myTokenC.symbol()).to.equal("MT");
        expect(await myTokenC.manager()).to.equal(tinyBankAddr);
        expect(await tinyBankC.stakingToken()).to.equal(await myTokenC.getAddress());
    });

    it("should run the UI flow: faucet -> approve -> stake -> currentReward", async () => {
        const [, user] = await hre.ethers.getSigners();
        const { myTokenC, tinyBankC } = await hre.ignition.deploy(DeployModule);
        const amount = hre.ethers.parseUnits("100", 18);

        await myTokenC.connect(user).faucet(amount);
        await myTokenC.connect(user).approve(await tinyBankC.getAddress(), amount);
        await tinyBankC.connect(user).stake(amount);
        expect(await tinyBankC.staked(user.address)).to.equal(amount);

        await hre.network.provider.send("hardhat_mine", ["0x2"]);
        expect(await tinyBankC.currentReward(user.address)).to.equal(hre.ethers.parseUnits("2", 18));
    });
});
