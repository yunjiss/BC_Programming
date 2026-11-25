import { HardhatUserConfig, vars } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

// 개인키는 파일에 적지 않고 `npx hardhat vars set KAIROS_PRIVATE_KEY` 로 로컬에만 저장
const KAIROS_PRIVATE_KEY = vars.get("KAIROS_PRIVATE_KEY", "");

const config: HardhatUserConfig = {
  solidity: "0.8.28",
  networks: {
    kairos: {
      url: "https://public-en-kairos.node.kaia.io",
      chainId: 1001,
      accounts: KAIROS_PRIVATE_KEY ? [KAIROS_PRIVATE_KEY] : [],
    },
  },
};

export default config;
